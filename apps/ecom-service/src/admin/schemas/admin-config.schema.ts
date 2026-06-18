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

  /** Paise per 100 credits redeemed as cash (default: 100 credits = ₹4 = 400 paise) */
  @Prop({ type: Number, default: 400, min: 0 })
  creditCashRatePaise: number;

  /** Paise per 100 credits redeemed as store discount (default: 100 credits = ₹40 = 4000 paise) */
  @Prop({ type: Number, default: 4000, min: 0 })
  creditDiscountRatePaise: number;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);
