import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminConfig, AdminConfigDocument } from '../admin/schemas/admin-config.schema';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { CreatorProfile, CreatorProfileDocument } from '../creator/schemas/creator-profile.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

export interface MarketplaceListingResult {
  design: Design;
  product: Product | null;
  creator: { userId: string; slug: string; displayName: string; profilePictureUrl?: string } | null;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    @InjectModel(CreatorProfile.name) private readonly creatorModel: Model<CreatorProfileDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(AdminConfig.name) private readonly adminConfigModel: Model<AdminConfigDocument>,
  ) {}

  /** Public, non-sensitive platform numbers for marketing pages (commission %, signup credits). */
  async getPublicConfig(): Promise<{
    defaultCommissionRate: number;
    signupAiCredits: number;
    designPurchaseBonusCredits: number;
    creditCashRatePaise: number;
    creditDiscountRatePaise: number;
  }> {
    const config = await this.adminConfigModel.findOne({ key: 'singleton' });
    return {
      defaultCommissionRate: config?.defaultCommissionRate ?? 25,
      signupAiCredits: config?.signupAiCredits ?? 20,
      designPurchaseBonusCredits: config?.designPurchaseBonusCredits ?? 20,
      creditCashRatePaise: config?.creditCashRatePaise ?? 100,
      creditDiscountRatePaise: config?.creditDiscountRatePaise ?? 120,
    };
  }

  /** Top creators for the landing page — public profile fields only. */
  async listTopCreators(limit = 6): Promise<
    Array<{ slug: string; displayName: string; bio: string | null; profilePictureUrl: string | null; totalSales: number; isVerified: boolean }>
  > {
    const creators = await this.creatorModel
      .find()
      .sort({ totalSales: -1, createdAt: 1 })
      .limit(limit)
      .select('slug displayName bio profilePictureUrl totalSales isVerified');
    return creators.map((c) => ({
      slug: c.slug,
      displayName: c.displayName,
      bio: c.bio ?? null,
      profilePictureUrl: c.profilePictureUrl ?? null,
      totalSales: c.totalSales,
      isVerified: c.isVerified,
    }));
  }

  async listDesigns(options: {
    page: number;
    limit: number;
    category?: string;
    tags?: string[];
    sort?: 'newest' | 'popular';
  }): Promise<{ designs: MarketplaceListingResult[]; total: number }> {
    const filter: Record<string, unknown> = { status: 'published', isMarketplaceListed: true };
    if (options.tags?.length) filter.tags = { $in: options.tags };

    const sortField = options.sort === 'popular' ? { salesCount: -1 } : { createdAt: -1 };

    const [designs, total] = await Promise.all([
      this.designModel
        .find(filter)
        .sort(sortField as any)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit),
      this.designModel.countDocuments(filter),
    ]);

    const results = await this.enrichDesigns(designs);
    return { designs: results, total };
  }

  async getCreatorStorefront(
    slug: string,
    page = 1,
    limit = 20,
  ): Promise<{ creator: CreatorProfile; designs: MarketplaceListingResult[]; total: number }> {
    const creator = await this.creatorModel.findOne({ slug });
    if (!creator) throw new NotFoundException('Creator not found');

    const filter = { userId: creator.userId, status: 'published', isMarketplaceListed: true };
    const [designs, total] = await Promise.all([
      this.designModel
        .find(filter)
        .sort({ salesCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.designModel.countDocuments(filter),
    ]);

    const enriched = await this.enrichDesigns(designs);
    return { creator, designs: enriched, total };
  }

  async getDesignDetail(designId: string): Promise<MarketplaceListingResult> {
    const design = await this.designModel.findOne({
      _id: designId,
      status: 'published',
      isMarketplaceListed: true,
    });
    if (!design) throw new NotFoundException('Design not found in marketplace');

    const [result] = await this.enrichDesigns([design]);
    return result;
  }

  private async enrichDesigns(designs: DesignDocument[]): Promise<MarketplaceListingResult[]> {
    if (!designs.length) return [];

    const userIds = [...new Set(designs.map((d) => d.userId))];
    const productIds = [...new Set(designs.map((d) => d.productId.toString()))];

    const [creators, products] = await Promise.all([
      this.creatorModel.find({ userId: { $in: userIds } }),
      this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } }),
    ]);

    const creatorMap = new Map(creators.map((c) => [c.userId, c]));
    const productMap = new Map(products.map((p) => [(p as any)._id.toString(), p]));

    return designs.map((design) => {
      const creator = creatorMap.get(design.userId);
      const product = productMap.get(design.productId.toString()) ?? null;
      return {
        design,
        product,
        creator: creator
          ? {
              userId: creator.userId,
              slug: creator.slug,
              displayName: creator.displayName,
              profilePictureUrl: creator.profilePictureUrl ?? undefined,
            }
          : null,
      };
    });
  }
}
