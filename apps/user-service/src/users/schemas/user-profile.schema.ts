import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProfileDocument = UserProfile & Document;

@Schema({ timestamps: true, collection: 'user_profiles' })
export class UserProfile {
  /** Links this profile back to the AuthUser._id from auth-service. */
  @Prop({ type: String, required: true, unique: true, index: true })
  authUserId: string;

  @Prop({ type: String })
  fullName?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  avatarUrl?: string;

  /** ISO date (YYYY-MM-DD). */
  @Prop({ type: String })
  dob?: string;

  @Prop({ type: String, enum: ['male', 'female', 'other'], required: false })
  gender?: string;

  @Prop({ type: Object, default: {} })
  preferences: Record<string, unknown>;

  /** This user's own shareable referral code. Auto-generated once, on first profile creation. */
  @Prop({ type: String, unique: true, sparse: true, index: true })
  referralCode?: string;

  /** The referral code (if any) that was used when this user signed up. Set once, immutable. */
  @Prop({ type: String })
  referredByCode?: string;

  /**
   * Remaining AI token quota for AI-powered features (consumed by
   * ecom-service today; epidiet-service's AI coach will use it too).
   * System-managed — never settable directly via the profile endpoints.
   */
  @Prop({ type: Number, default: 0 })
  aiTokenLimit: number;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
