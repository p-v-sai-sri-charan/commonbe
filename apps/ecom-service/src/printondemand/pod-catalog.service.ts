import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { QIKINK_APPAREL_CATALOG } from './data/qikink-apparel-catalog';
import { QikinkStyle } from './pod-catalog.types';

/** Placeholder stock for POD variants — Qikink prints to order, so stock is not a real constraint. */
const DEFAULT_POD_STOCK = 500;

export interface CatalogEntryWithState extends QikinkStyle {
  /** Product created from this style, if any. */
  productId: string | null;
  enabled: boolean;
}

/**
 * The enable-able Qikink garment catalog (generated from their SKU Descriptions
 * export — see scripts/generate_qikink_catalog.py). "Enabling" a style creates a
 * fully wired Product (pod config + variants with podColorCode + sizes); admins
 * only choose the retail price. Re-enabling reactivates the existing product.
 */
@Injectable()
export class PodCatalogService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async list(): Promise<CatalogEntryWithState[]> {
    const podProducts = await this.productModel
      .find({ styleKey: { $ne: null } })
      .select('_id styleKey isActive');
    const byStyle = new Map(podProducts.map((p) => [p.styleKey!, p]));

    return QIKINK_APPAREL_CATALOG.map((style) => {
      const product = byStyle.get(style.styleKey);
      return {
        ...style,
        productId: product ? (product as any)._id.toString() : null,
        enabled: Boolean(product?.isActive),
      };
    });
  }

  async enable(
    styleKey: string,
    opts: { basePrice?: number; description?: string; model3dUrl?: string; showInShop?: boolean },
  ): Promise<Product> {
    const style = QIKINK_APPAREL_CATALOG.find((s) => s.styleKey === styleKey);
    if (!style) throw new NotFoundException(`Unknown catalog style '${styleKey}'`);

    // Default retail = Qikink cost + 60% margin, rounded up to a whole rupee.
    const basePrice = opts.basePrice ?? Math.ceil(style.qikinkBasePriceRupees * 1.6) * 100;
    // Selling below cost is almost certainly a paise/rupee mix-up.
    if (basePrice < style.qikinkBasePriceRupees * 100) {
      throw new BadRequestException(
        `basePrice ₹${(basePrice / 100).toFixed(0)} is below Qikink's cost ₹${style.qikinkBasePriceRupees} — did you enter rupees instead of paise?`,
      );
    }

    const existing = await this.productModel.findOne({ styleKey });
    if (existing) {
      existing.isActive = true;
      existing.basePrice = basePrice;
      if (opts.model3dUrl !== undefined) existing.model3dUrl = opts.model3dUrl || null;
      if (opts.showInShop !== undefined) existing.showInShop = opts.showInShop;
      return existing.save();
    }

    return this.productModel.create({
      name: style.displayName,
      description:
        opts.description ??
        `${style.displayName} — printed on demand. Design yours in the studio.`,
      category: style.garmentType,
      garmentType: style.garmentType,
      basePrice,
      showInShop: opts.showInShop ?? true,
      variants: style.colors.map((color) => ({
        color: color.name,
        hexCode: color.hex,
        podColorCode: color.code,
        sizes: style.sizes.map((size) => ({ size, stock: DEFAULT_POD_STOCK })),
      })),
      designAreaType: 'full',
      designArea: null,
      images: [],
      tags: ['print-on-demand', style.garmentType, style.gender.toLowerCase()],
      isActive: true,
      pod: { provider: 'qikink', printTypeId: style.printTypeId, baseSku: style.baseSku },
      styleKey: style.styleKey,
      model3dUrl: opts.model3dUrl ?? null,
    });
  }

  async disable(styleKey: string): Promise<Product> {
    const product = await this.productModel.findOne({ styleKey });
    if (!product) throw new NotFoundException(`No product exists for style '${styleKey}'`);
    product.isActive = false;
    return product.save();
  }
}
