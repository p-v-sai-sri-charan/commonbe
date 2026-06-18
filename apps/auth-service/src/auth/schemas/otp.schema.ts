import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OtpPurpose {
  LOGIN = 'login',
  SIGNUP = 'signup',
  LINK_MOBILE = 'link_mobile',
}

export enum OtpStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export type OtpDocument = Otp & Document;

/**
 * OTPs are stored as a salted/keyed hash (HMAC-SHA256), never as plain text.
 * Each OTP is single-use: once `status` moves to VERIFIED/EXPIRED/FAILED it
 * can no longer be consumed again.
 */
@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({ type: String, required: true, index: true })
  mobileNumber: string;

  @Prop({ type: String, required: true })
  otpHash: string;

  @Prop({ type: String, enum: OtpPurpose, required: true, index: true })
  purpose: OtpPurpose;

  @Prop({ type: String, enum: OtpStatus, default: OtpStatus.PENDING, index: true })
  status: OtpStatus;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, required: true })
  maxAttempts: number;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
