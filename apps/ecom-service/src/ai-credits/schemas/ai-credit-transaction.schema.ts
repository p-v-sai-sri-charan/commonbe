import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiCreditTransactionDocument = AiCreditTransaction & Document;

export type CreditReason = 'signup_bonus' | 'design_purchase_bonus' | 'admin_grant' | 'generation';

@Schema({ collection: 'ecom_ai_credit_transactions', timestamps: true })
export class AiCreditTransaction {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({
    type: String,
    enum: ['signup_bonus', 'design_purchase_bonus', 'admin_grant', 'generation'],
    required: true,
  })
  reason: CreditReason;

  @Prop({ type: String, default: null })
  referenceId: string | null;
}

export const AiCreditTransactionSchema = SchemaFactory.createForClass(AiCreditTransaction);
