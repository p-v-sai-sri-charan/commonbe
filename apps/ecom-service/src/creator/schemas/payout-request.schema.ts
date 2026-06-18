import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PayoutRequestDocument = PayoutRequest & Document;

export type PayoutType = 'cash' | 'discount';
export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'completed';

@Schema({ collection: 'ecom_payout_requests', timestamps: true })
export class PayoutRequest {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  creatorId: string;

  @Prop({ type: String, enum: ['cash', 'discount'], required: true })
  type: PayoutType;

  @Prop({ type: Number, required: true, min: 100 })
  creditsUsed: number;

  /** Computed: cash → creditsUsed/100*4 paise, discount → creditsUsed/100*40 paise */
  @Prop({ type: Number, required: true, min: 0 })
  valuePaise: number;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' })
  status: PayoutStatus;

  @Prop({ type: String, default: null })
  adminNote: string | null;

  /** For cash payouts: UPI ID or bank account info provided by creator */
  @Prop({ type: String, default: null })
  paymentDetails: string | null;
}

export const PayoutRequestSchema = SchemaFactory.createForClass(PayoutRequest);
