import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { BillingPeriod, SubscriptionTier } from '../plans.config';

export type UserSubscriptionDocument = UserSubscription & Document;

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

@Schema({ timestamps: true, collection: 'user_subscriptions' })
export class UserSubscription {
  /** Links back to AuthUser._id from auth-service. */
  @Prop({ type: String, required: true, unique: true, index: true })
  authUserId: string;

  /** Plan ID from plans.config.ts (e.g. 'plus_annual', 'launch_trial'). */
  @Prop({ type: String, required: true, default: 'free' })
  planId: string;

  @Prop({ type: String, required: true, default: 'free' })
  tier: SubscriptionTier;

  @Prop({ type: String, default: null })
  billingPeriod: BillingPeriod | null;

  @Prop({ type: String, required: true, default: 'active' })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true })
  startDate: Date;

  /** When the current paid period expires. Free plan gets a far-future date. */
  @Prop({ type: Date, required: true })
  endDate: Date;

  /** True during the discounted trial period (e.g. launch_trial). */
  @Prop({ type: Boolean, default: false })
  isTrialPeriod: boolean;

  /** If set, the planId the subscription auto-converts to after the trial. */
  @Prop({ type: String })
  convertsTo?: string;

  /**
   * For Couple plan: authUserId of the linked partner account.
   * TODO: implement invite/accept flow.
   */
  @Prop({ type: String })
  linkedPartnerUserId?: string;

  /** Razorpay order ID — present after a paid subscription is created. */
  @Prop({ type: String })
  razorpayOrderId?: string;

  /** Razorpay payment ID — present after payment is verified. */
  @Prop({ type: String })
  razorpayPaymentId?: string;

  /** Apps covered by this subscription (from plan.features.apps). */
  @Prop({ type: [String], default: ['epidiet'] })
  apps: string[];

  /** Human-readable cancellation reason (optional). */
  @Prop({ type: String })
  cancellationReason?: string;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);
