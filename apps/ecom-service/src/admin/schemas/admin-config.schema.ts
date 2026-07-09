import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminConfigDocument = AdminConfig & Document;

@Schema({ collection: 'ecom_admin_config', timestamps: true })
export class AdminConfig {
  @Prop({ type: String, default: 'singleton', unique: true })
  key: string;

  @Prop({ type: Number, default: 25, min: 0, max: 100 })
  defaultCommissionRate: number;

  @Prop({ type: Number, default: 20, min: 0 })
  signupAiCredits: number;

  @Prop({ type: Number, default: 20, min: 0 })
  designPurchaseBonusCredits: number;

  @Prop({ type: Number, default: 10 })
  maxCanvasLayers: number;

  @Prop({ type: Number, default: 1, min: 1 })
  aiCreditCostPerGeneration: number;

  /** Paise of cash paid per ₹1 (100 paise) of creator earnings redeemed. 100 = 1:1. */
  @Prop({ type: Number, default: 100, min: 0 })
  creditCashRatePaise: number;

  /** Paise of store credit per ₹1 of earnings redeemed. 120 = +20% bonus for staying on-platform. */
  @Prop({ type: Number, default: 120, min: 0 })
  creditDiscountRatePaise: number;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);
