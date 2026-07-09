import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { QIKINK_APPAREL_CATALOG } from './data/qikink-apparel-catalog';
import { QikinkStyle } from './pod-catalog.types';

/** Placeholder stock for POD variants — Qikink prints to order, so stock is not a real constraint. */
const DEFAULT_POD_STOCK = 500;

/** GST applied by Qikink on (blank + print). */
const GST = 1.05;
/** Default retail markup over true Qikink cost (covers shipping — customers ship free). */
const MARGIN = 1.6;
/** Default Qikink print costs (rupees, ex-GST) per technique — from their dashboard (UC48
 *  reference: DTG ₹127/side, DTF ₹233/side, both 14×18" max). Admin can override per style. */
const DEFAULT_PRINT_COST: Record<number, { front: number; back: number }> = {
  1: { front: 127, back: 127 }, // DTG
  17: { front: 233, back: 233 }, // DTF
};

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
    opts: {
      basePrice?: number;
      description?: string;
      model3dUrl?: string;
      showInShop?: boolean;
      printTypeId?: number;
      frontPrintRupees?: number;
      backPrintRupees?: number;
    },
  ): Promise<Product> {
    const style = QIKINK_APPAREL_CATALOG.find((s) => s.styleKey === styleKey);
    if (!style) throw new NotFoundException(`Unknown catalog style '${styleKey}'`);

    const printTypeId = opts.printTypeId ?? style.printTypeId;
    const printDefaults = DEFAULT_PRINT_COST[printTypeId] ?? DEFAULT_PRINT_COST[1];
    const frontPrintRupees = opts.frontPrintRupees ?? printDefaults.front;
    const backPrintRupees = opts.backPrintRupees ?? printDefaults.back;

    // True Qikink cost for a front-printed unit: (blank + front print) × GST.
    const frontCostRupees = (style.qikinkBasePriceRupees + frontPrintRupees) * GST;
    // Default retail = true cost + margin, rounded up to a whole rupee.
    const basePrice = opts.basePrice ?? Math.ceil(frontCostRupees * MARGIN) * 100;
    // Selling below true cost is a loss on every order (or a paise/rupee mix-up).
    if (basePrice < Math.ceil(frontCostRupees) * 100) {
      throw new BadRequestException(
        `basePrice ₹${(basePrice / 100).toFixed(0)} is below the true Qikink cost ₹${Math.ceil(frontCostRupees)} (blank ₹${style.qikinkBasePriceRupees} + front print ₹${frontPrintRupees} + 5% GST)`,
      );
    }
    // Checkout add-on when a design prints the back: incremental cost + same margin.
    const backSurchargePaise = Math.ceil(backPrintRupees * GST * MARGIN) * 100;

    const existing = await this.productModel.findOne({ styleKey });
    if (existing) {
      existing.isActive = true;
      existing.basePrice = basePrice;
      if (opts.model3dUrl !== undefined) existing.model3dUrl = opts.model3dUrl || null;
      if (opts.showInShop !== undefined) existing.showInShop = opts.showInShop;
      if (existing.pod) {
        existing.pod = { ...existing.pod, printTypeId, frontPrintRupees, backPrintRupees, backSurchargePaise };
        existing.markModified('pod');
      }
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
      pod: {
        provider: 'qikink',
        printTypeId,
        baseSku: style.baseSku,
        frontPrintRupees,
        backPrintRupees,
        backSurchargePaise,
      },
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
