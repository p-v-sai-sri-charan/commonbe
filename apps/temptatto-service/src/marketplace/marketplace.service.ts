import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Design, DesignDocument } from '../designs/schemas/design.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { StoreProfile, StoreProfileDocument } from '../store/schemas/store-profile.schema';

export interface MarketplaceListingResult {
  design: Design;
  product: Product | null;
  store: { userId: string; slug: string; displayName: string; profilePictureUrl?: string } | null;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    @InjectModel(StoreProfile.name) private readonly storeModel: Model<StoreProfileDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async listDesigns(options: {
    page: number;
    limit: number;
    category?: string;
    tags?: string[];
    sort?: 'newest' | 'popular';
  }): Promise<{ designs: MarketplaceListingResult[]; total: number }> {
    const filter: Record<string, unknown> = { status: 'published', isMarketplaceListed: true };
    if (options.tags?.length) filter.tags = { $in: options.tags };

    if (options.category) {
      const productsInCategory = await this.productModel.find({ categorySlug: options.category }, { _id: 1 });
      filter.productId = { $in: productsInCategory.map((p) => p._id) };
    }

    const sortField: Record<string, 1 | -1> =
      options.sort === 'popular' ? { salesCount: -1 } : { createdAt: -1 };

    const [designs, total] = await Promise.all([
      this.designModel
        .find(filter)
        .sort(sortField)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit),
      this.designModel.countDocuments(filter),
    ]);

    const results = await this.enrichDesigns(designs);
    return { designs: results, total };
  }

  async getStorefront(
    slug: string,
    page = 1,
    limit = 20,
  ): Promise<{ store: StoreProfile; designs: MarketplaceListingResult[]; total: number }> {
    const store = await this.storeModel.findOne({ slug });
    if (!store) throw new NotFoundException('Store not found');

    const filter = { userId: store.userId, status: 'published', isMarketplaceListed: true };
    const [designs, total] = await Promise.all([
      this.designModel
        .find(filter)
        .sort({ salesCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.designModel.countDocuments(filter),
    ]);

    const enriched = await this.enrichDesigns(designs);
    return { store, designs: enriched, total };
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

    const [stores, products] = await Promise.all([
      this.storeModel.find({ userId: { $in: userIds } }),
      this.productModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } }),
    ]);

    const storeMap = new Map(stores.map((s) => [s.userId, s]));
    const productMap = new Map(products.map((p) => [(p as unknown as { _id: Types.ObjectId })._id.toString(), p]));

    return designs.map((design) => {
      const store = storeMap.get(design.userId);
      const product = productMap.get(design.productId.toString()) ?? null;
      return {
        design,
        product,
        store: store
          ? {
              userId: store.userId,
              slug: store.slug,
              displayName: store.displayName,
              profilePictureUrl: store.profilePictureUrl ?? undefined,
            }
          : null,
      };
    });
  }
}
