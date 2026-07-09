import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export type DesignAreaType = 'full' | 'limited';

export class DesignArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SizeStock {
  size: string;
  stock: number;
}

export class ProductVariant {
  color: string;
  hexCode: string;
  sizes: SizeStock[];
  /** Provider color code for POD SKU building, e.g. Qikink "Wh" for White. */
  podColorCode?: string;
}

/** Print-on-demand catalog mapping. SKU sent to the provider = `${baseSku}-${variant.podColorCode}-${size}`. */
export class PodConfig {
  provider: string;
  printTypeId: number;
  baseSku: string;
}

export class ProductImage {
  color: string;
  url: string;
}

@Schema({ collection: 'ecom_products', timestamps: true })
export class Product {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Number, required: true, min: 0 })
  basePrice: number;

  @Prop({
    type: [
      {
        color: String,
        hexCode: String,
        sizes: [{ size: String, stock: Number }],
        podColorCode: { type: String, default: null },
      },
    ],
    default: [],
  })
  variants: ProductVariant[];

  /** Null = product not eligible for print-on-demand fulfillment. */
  @Prop({
    type: { provider: String, printTypeId: Number, baseSku: String },
    default: null,
  })
  pod: PodConfig | null;

  /** Qikink catalog style this product was enabled from (null = manually created). */
  @Prop({ type: String, default: null, index: true })
  styleKey: string | null;

  /** GLB for the studio 3D preview. Null → tshirt garments fall back to the default shirt model; others render 2D-only. */
  @Prop({ type: String, default: null })
  model3dUrl: string | null;

  /** tshirt | polo | hoodie | … — drives 3D-model fallback + shop filtering. */
  @Prop({ type: String, default: 'tshirt' })
  garmentType: string;

  /** False = studio-only blank canvas; hidden from the shop listing. */
  @Prop({ type: Boolean, default: true })
  showInShop: boolean;

  /** False = ready-made product (mockup images, no studio editing — buy as-is). */
  @Prop({ type: Boolean, default: true })
  customizable: boolean;

  @Prop({ type: String, enum: ['full', 'limited'], default: 'full' })
  designAreaType: DesignAreaType;

  @Prop({
    type: { x: Number, y: Number, width: Number, height: Number },
    default: null,
  })
  designArea: DesignArea | null;

  @Prop({ type: [{ color: String, url: String }], default: [] })
  images: ProductImage[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
