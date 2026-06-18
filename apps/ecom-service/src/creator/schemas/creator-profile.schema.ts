import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CreatorProfileDocument = CreatorProfile & Document;

@Schema({ collection: 'ecom_creator_profiles', timestamps: true })
export class CreatorProfile {
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

  @Prop({ type: String, enum: ['openai', 'anthropic', null], default: null })
  byokProvider: 'openai' | 'anthropic' | null;

  @Prop({ type: String, default: null, select: false })
  byokApiKeyEncrypted: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  totalEarningsPaise: number;

  @Prop({ type: Number, default: 0, min: 0 })
  pendingEarningsPaise: number;

  @Prop({ type: Number, default: 0 })
  totalSales: number;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const CreatorProfileSchema = SchemaFactory.createForClass(CreatorProfile);
