import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;
export type FulfillmentType = 'physical' | 'digital';

export class ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export class OrderItem {
  productId: Types.ObjectId;
  designId: Types.ObjectId | null;
  size: string;
  placement: string | null;
  fulfillmentType: FulfillmentType;
  quantity: number;
  unitPrice: number;
  designerId: string | null;
  commissionRate: number;
  commissionAmount: number;
  digitalDownloadUrl: string | null;
}

@Schema({ collection: 'temptatto_orders', timestamps: true })
export class Order {
  @Prop({ type: String, required: true, index: true })
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
        unitPrice: { type: Number, required: true },
        designerId: { type: String, default: null },
        commissionRate: { type: Number, default: 0 },
        commissionAmount: { type: Number, default: 0 },
        digitalDownloadUrl: { type: String, default: null },
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

  /** Required only if any item is 'physical' — enforced in OrdersService, not at the schema level. */
  @Prop({
    type: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    default: null,
  })
  shippingAddress: ShippingAddress | null;

  @Prop({ type: Number, default: 0 })
  shippingCost: number;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ type: String, default: 'razorpay' })
  paymentProvider: string;

  @Prop({ type: String, default: null })
  paymentOrderId: string | null;

  @Prop({ type: String, default: null })
  paymentId: string | null;

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true,
  })
  paymentStatus: string;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  fulfillmentStatus: string;

  @Prop({ type: String, default: null })
  trackingNumber: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
