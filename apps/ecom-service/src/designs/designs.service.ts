import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDesignDto } from './dto/create-design.dto';
import { PublishDesignDto } from './dto/publish-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { Design, DesignDocument } from './schemas/design.schema';

@Injectable()
export class DesignsService {
  constructor(@InjectModel(Design.name) private readonly designModel: Model<DesignDocument>) {}

  async create(userId: string, dto: CreateDesignDto, defaultCommissionRate: number): Promise<Design> {
    return this.designModel.create({
      ...dto,
      userId,
      status: 'draft',
      commissionRate: defaultCommissionRate,
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
