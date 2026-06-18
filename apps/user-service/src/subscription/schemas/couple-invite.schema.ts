import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CoupleInviteDocument = CoupleInvite & Document;

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

@Schema({ timestamps: true, collection: 'couple_invites' })
export class CoupleInvite {
  /** AuthUserId of the user who created the invite (must be on a Couple plan). */
  @Prop({ type: String, required: true, index: true })
  fromUserId: string;

  /** Mobile number (E.164) of the person being invited. */
  @Prop({ type: String, required: true })
  toMobileNumber: string;

  /** AuthUserId of the invited person — populated when they accept. */
  @Prop({ type: String })
  toUserId?: string;

  /** Random token the invited user presents to accept the invite. */
  @Prop({ type: String, required: true, unique: true, index: true })
  token: string;

  @Prop({ type: String, required: true, default: 'pending' })
  status: InviteStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const CoupleInviteSchema = SchemaFactory.createForClass(CoupleInvite);
