import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

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
  variantColor: string;
  size: string;
  quantity: number;
  unitPrice: number;
  designerId: string | null;
  commissionRate: number;
  commissionAmount: number;
}

@Schema({ collection: 'ecom_orders', timestamps: true })
export class Order {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: 'Product', required: true },
        designId: { type: Types.ObjectId, ref: 'Design', default: null },
        variantColor: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        designerId: { type: String, default: null },
        commissionRate: { type: Number, default: 0 },
        commissionAmount: { type: Number, default: 0 },
      },
    ],
    required: true,
  })
  items: OrderItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

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
    required: true,
  })
  shippingAddress: ShippingAddress;

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

  @Prop({ type: Boolean, default: false })
  aiCreditsBonusGranted: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
