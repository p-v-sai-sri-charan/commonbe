import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export type DesignAreaType = 'full' | 'limited';

export class DesignArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PrintAreaCm {
  width: number;
  height: number;
}

export class SizeOption {
  label: string;
  widthCm: number;
  heightCm: number;
  priceModifier: number;
}

export class ProductImage {
  label: string;
  url: string;
}

@Schema({ collection: 'temptatto_products', timestamps: true })
export class Product {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  categorySlug: string;

  @Prop({ type: Number, required: true, min: 0 })
  basePrice: number;

  @Prop({
    type: [{ label: String, widthCm: Number, heightCm: Number, priceModifier: Number }],
    default: [],
  })
  sizeOptions: SizeOption[];

  @Prop({ type: { width: Number, height: Number }, required: true })
  maxPrintAreaCm: PrintAreaCm;

  @Prop({ type: [String], default: [] })
  placementSuggestions: string[];

  @Prop({ type: String, enum: ['full', 'limited'], default: 'full' })
  designAreaType: DesignAreaType;

  @Prop({
    type: { x: Number, y: Number, width: Number, height: Number },
    default: null,
  })
  designArea: DesignArea | null;

  @Prop({ type: [{ label: String, url: String }], default: [] })
  images: ProductImage[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: null })
  stockQuantity: number | null;

  /** Fulfillment modes this product supports: 'physical' | 'digital'. */
  @Prop({ type: [String], enum: ['physical', 'digital'], default: ['physical'] })
  fulfillmentTypes: string[];

  /** The blank-canvas product used by the "Create Design" CTA — seeded once, at most one should be true. */
  @Prop({ type: Boolean, default: false, index: true })
  isDefault: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
