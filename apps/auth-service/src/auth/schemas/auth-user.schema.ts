import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AuthProvider {
  MOBILE = 'mobile',
  GOOGLE = 'google',
}

export type AuthUserDocument = AuthUser & Document;

/**
 * Primary identity record for a user across all apps.
 * - mobileNumber + OTP is the primary login method.
 * - Google is a secondary/optional login method that can be linked
 *   to the same record (see AuthService linking logic).
 */
@Schema({ timestamps: true, collection: 'auth_users' })
export class AuthUser {
  @Prop({ type: String, unique: true, sparse: true, index: true })
  mobileNumber?: string;

  @Prop({ type: Boolean, default: false })
  mobileVerified: boolean;

  @Prop({ type: String, unique: true, sparse: true, index: true, lowercase: true, trim: true })
  email?: string;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: String, unique: true, sparse: true, index: true })
  googleId?: string;

  @Prop({ type: [String], enum: AuthProvider, default: [] })
  authProviders: AuthProvider[];

  @Prop({ type: [String], default: ['user'] })
  roles: string[];

  @Prop({ type: [String], default: [] })
  apps: string[];

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;
}

export const AuthUserSchema = SchemaFactory.createForClass(AuthUser);
