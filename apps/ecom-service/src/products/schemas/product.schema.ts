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
      },
    ],
    default: [],
  })
  variants: ProductVariant[];

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
