import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { StoreService } from '../store/store.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { PublishDesignDto } from './dto/publish-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { Design, DesignDocument } from './schemas/design.schema';

@Injectable()
export class DesignsService {
  constructor(
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    private readonly productsService: ProductsService,
    private readonly storeService: StoreService,
  ) {}

  private async assertPrintSizeFits(productId: string, printSizeCm: { width: number; height: number }) {
    const product = await this.productsService.findById(productId);
    if (printSizeCm.width > product.maxPrintAreaCm.width || printSizeCm.height > product.maxPrintAreaCm.height) {
      throw new BadRequestException(
        `Print size ${printSizeCm.width}x${printSizeCm.height}cm exceeds this product's max ` +
          `${product.maxPrintAreaCm.width}x${product.maxPrintAreaCm.height}cm print area`,
      );
    }
  }

  async create(userId: string, dto: CreateDesignDto, defaultCommissionRate: number): Promise<Design> {
    await this.assertPrintSizeFits(dto.productId, dto.printSizeCm);
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

  /** Public reads may only see published designs; drafts are owner-only. */
  async findByIdForView(id: string, requesterUserId?: string): Promise<DesignDocument> {
    const design = await this.findById(id);
    if (design.status === 'draft' && design.userId !== requesterUserId) {
      throw new NotFoundException('Design not found');
    }
    return design;
  }

  async findByIdForUser(id: string, userId: string): Promise<DesignDocument> {
    const design = await this.findById(id);
    if (design.userId !== userId) throw new ForbiddenException('Not your design');
    return design;
  }

  async update(id: string, userId: string, dto: UpdateDesignDto): Promise<Design> {
    const design = await this.findByIdForUser(id, userId);
    if (dto.printSizeCm) {
      await this.assertPrintSizeFits(design.productId.toString(), dto.printSizeCm);
    }
    Object.assign(design, dto);
    return design.save();
  }

  async publish(id: string, userId: string, dto: PublishDesignDto): Promise<Design> {
    const design = await this.findByIdForUser(id, userId);

    try {
      await this.storeService.getByUserId(userId);
    } catch {
      throw new ForbiddenException('Create a store before publishing designs to the marketplace');
    }

    if (dto.allowDigitalDownload) {
      if (dto.digitalPrice === undefined) {
        throw new BadRequestException('digitalPrice is required when allowDigitalDownload is true');
      }
      if (dto.digitalPrice >= dto.physicalPrice) {
        throw new BadRequestException('digitalPrice must be less than physicalPrice');
      }
    }

    design.status = 'published';
    design.isMarketplaceListed = dto.isMarketplaceListed;
    design.physicalPrice = dto.physicalPrice;
    design.allowDigitalDownload = dto.allowDigitalDownload ?? false;
    design.digitalPrice = dto.allowDigitalDownload ? dto.digitalPrice! : null;
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

  async incrementSales(id: string, quantity: number): Promise<void> {
    await this.designModel.findByIdAndUpdate(id, { $inc: { salesCount: quantity } });
  }

  async findPublishedByProduct(productId: string, page = 1, limit = 20): Promise<Design[]> {
    return this.designModel
      .find({ productId, status: 'published', isMarketplaceListed: true })
      .sort({ salesCount: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }
}
