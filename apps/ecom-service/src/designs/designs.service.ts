import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminConfig, AdminConfigDocument } from '../admin/schemas/admin-config.schema';
import { CreateDesignDto } from './dto/create-design.dto';
import { PublishDesignDto } from './dto/publish-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { Design, DesignDocument } from './schemas/design.schema';

@Injectable()
export class DesignsService {
  constructor(
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    @InjectModel(AdminConfig.name) private readonly adminConfigModel: Model<AdminConfigDocument>,
  ) {}

  async create(userId: string, dto: CreateDesignDto): Promise<Design> {
    // Commission comes from platform config (admin-tunable), NOT a hardcoded 25.
    const config = await this.adminConfigModel.findOne({ key: 'singleton' });
    return this.designModel.create({
      ...dto,
      userId,
      status: 'draft',
      commissionRate: config?.defaultCommissionRate ?? 25,
    });
  }

  async findAllByUser(userId: string): Promise<Design[]> {
    return this.designModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<DesignDocument> {
    const design = await this.designModel.findById(id);
    if (!design) throw new NotFoundException('Design not found');
    return design;
  }

  async findByIdForUser(id: string, userId: string): Promise<DesignDocument> {
    const design = await this.findById(id);
    if (design.userId !== userId) throw new ForbiddenException('Not your design');
    return design;
  }

  async update(id: string, userId: string, dto: UpdateDesignDto): Promise<Design> {
    const design = await this.findByIdForUser(id, userId);
    Object.assign(design, dto);
    return design.save();
  }

  async publish(id: string, userId: string, dto: PublishDesignDto): Promise<Design> {
    const design = await this.findByIdForUser(id, userId);
    if (design.takedownReason) {
      throw new ForbiddenException(
        `This design was removed by a moderator (${design.takedownReason}) and cannot be republished. Contact support if you believe this is a mistake.`,
      );
    }
    design.status = 'published';
    design.isMarketplaceListed = dto.isMarketplaceListed;
    if (dto.price !== undefined) design.price = dto.price;
    if (dto.tags) design.tags = dto.tags;
    return design.save();
  }

  async unpublish(id: string, userId: string): Promise<Design> {
    const design = await this.findByIdForUser(id, userId);
    design.status = 'draft';
    design.isMarketplaceListed = false;
    return design.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findByIdForUser(id, userId);
    await this.designModel.findByIdAndDelete(id);
  }

  /** Force-unpublish by a moderator; the recorded reason also blocks owner re-publish. */
  async adminTakedown(id: string, reason: string): Promise<Design> {
    const design = await this.findById(id);
    design.status = 'rejected';
    design.isMarketplaceListed = false;
    design.takedownReason = reason;
    return design.save();
  }

  async adminRestore(id: string): Promise<Design> {
    const design = await this.findById(id);
    design.takedownReason = null;
    if (design.status === 'rejected') design.status = 'draft';
    return design.save();
  }

  async incrementSales(id: string): Promise<void> {
    await this.designModel.findByIdAndUpdate(id, { $inc: { salesCount: 1 } });
  }

  async findPublishedByProduct(productId: string, page = 1, limit = 20): Promise<Design[]> {
    return this.designModel
      .find({ productId, status: 'published', isMarketplaceListed: true })
      .sort({ salesCount: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }
}
