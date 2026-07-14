import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema({ collection: 'ecom_categories', timestamps: true })
export class ProductCategory {
  @Prop({ type: String, required: true })
  name: string;

  /** Lowercase, hyphenated — the actual value stored on Product.category. */
  @Prop({ type: String, required: true, unique: true, index: true })
  slug: string;
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);
