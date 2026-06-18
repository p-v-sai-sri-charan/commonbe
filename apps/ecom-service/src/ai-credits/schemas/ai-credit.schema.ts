import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiCreditDocument = AiCredit & Document;

@Schema({ collection: 'ecom_ai_credits', timestamps: true })
export class AiCredit {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: Number, default: 0, min: 0 })
  balance: number;

  @Prop({ type: Number, default: 0 })
  lifetimeEarned: number;

  @Prop({ type: Number, default: 0 })
  lifetimeUsed: number;
}

export const AiCreditSchema = SchemaFactory.createForClass(AiCredit);
