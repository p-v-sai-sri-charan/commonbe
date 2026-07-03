import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StoreProfileDocument = StoreProfile & Document;

@Schema({ collection: 'temptatto_store_profiles', timestamps: true })
export class StoreProfile {
  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({ type: String, default: null })
  bio: string | null;

  @Prop({ type: String, default: null })
  profilePictureUrl: string | null;

  @Prop({ type: Number, default: 0 })
  totalSales: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalEarningsPaise: number;
}

export const StoreProfileSchema = SchemaFactory.createForClass(StoreProfile);
