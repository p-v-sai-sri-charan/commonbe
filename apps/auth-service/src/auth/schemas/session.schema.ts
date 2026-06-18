import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

/**
 * One Session = one logged-in device/refresh-token lineage.
 * The refresh token itself is never stored — only its hash (same pattern
 * as Otp). Refresh tokens are rotated on every use: verifying a refresh
 * token revokes it and issues a brand new one tied to the same session
 * lineage (sessionFamilyId), so a stolen/replayed old token is detected.
 */
@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, required: true })
  refreshTokenHash: string;

  /** Stable id shared across all rotations of the same login session. */
  @Prop({ type: String, required: true, index: true })
  sessionFamilyId: string;

  @Prop({ type: String })
  deviceId?: string;

  @Prop({ type: String })
  deviceName?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  revokedAt?: Date;

  @Prop({ type: Date })
  lastUsedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
