import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

export class CartItem {
  productId: Types.ObjectId;
  designId: Types.ObjectId | null;
  variantColor: string;
  size: string;
  quantity: number;
}

@Schema({ collection: 'ecom_carts', timestamps: true })
export class Cart {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: 'Product', required: true },
        designId: { type: Types.ObjectId, ref: 'Design', default: null },
        variantColor: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    default: [],
  })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
