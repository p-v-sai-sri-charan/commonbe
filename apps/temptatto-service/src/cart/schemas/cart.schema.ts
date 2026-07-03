import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;
export type FulfillmentType = 'physical' | 'digital';

export class CartItem {
  productId: Types.ObjectId;
  designId: Types.ObjectId | null;
  size: string;
  placement: string | null;
  fulfillmentType: FulfillmentType;
  quantity: number;
}

@Schema({ collection: 'temptatto_carts', timestamps: true })
export class Cart {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: 'Product', required: true },
        designId: { type: Types.ObjectId, ref: 'Design', default: null },
        size: { type: String, required: true },
        placement: { type: String, default: null },
        fulfillmentType: { type: String, enum: ['physical', 'digital'], required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    default: [],
  })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
