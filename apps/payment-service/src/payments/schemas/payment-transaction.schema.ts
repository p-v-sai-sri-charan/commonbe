import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentProviderId } from '../providers/payment-provider.interface';

export enum PaymentStatus {
  CREATED = 'created',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export type PaymentTransactionDocument = PaymentTransaction & Document;

@Schema({ timestamps: true, collection: 'payment_transactions' })
export class PaymentTransaction {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, enum: PaymentProviderId, required: true, index: true })
  provider: PaymentProviderId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true, default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.CREATED, index: true })
  status: PaymentStatus;

  @Prop({ type: String, required: true, unique: true })
  providerOrderId: string;

  @Prop({ type: String })
  providerPaymentId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);
