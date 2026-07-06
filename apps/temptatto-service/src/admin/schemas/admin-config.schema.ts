import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminConfigDocument = AdminConfig & Document;

export class SizeOptionDefault {
  label: string;
  widthCm: number;
  heightCm: number;
  priceModifier: number;
}

@Schema({ collection: 'temptatto_admin_config', timestamps: true })
export class AdminConfig {
  @Prop({ type: String, default: 'singleton', unique: true })
  key: string;

  @Prop({ type: Number, default: 25, min: 0, max: 100 })
  defaultCommissionRate: number;

  @Prop({ type: Number, default: 40 })
  maxCanvasLayers: number;

  @Prop({
    type: [{ label: String, widthCm: Number, heightCm: Number, priceModifier: Number }],
    default: [
      { label: 'Small', widthCm: 5, heightCm: 5, priceModifier: 0 },
      { label: 'Medium', widthCm: 10, heightCm: 10, priceModifier: 100 },
      { label: 'Large', widthCm: 15, heightCm: 15, priceModifier: 250 },
    ],
  })
  defaultSizeOptions: SizeOptionDefault[];

  @Prop({
    type: [String],
    default: ['Forearm', 'Wrist', 'Shoulder', 'Back', 'Ankle', 'Neck', 'Collarbone'],
  })
  defaultPlacements: string[];

  @Prop({ type: Object })
  siteTheme?: Record<string, unknown>;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);
