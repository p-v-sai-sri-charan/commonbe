import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from '../users/schemas/user-profile.schema';
import { ApplySubscriptionDto } from './dto/apply-subscription.dto';
import { AcceptCoupleInviteDto, SendCoupleInviteDto } from './dto/couple-invite.dto';
import {
  AI_TOKENS,
  getAiTokenQuotaForPlan,
  getPlanById,
  SUBSCRIPTION_PLANS,
} from './plans.config';
import {
  CoupleInvite,
  CoupleInviteDocument,
} from './schemas/couple-invite.schema';
import {
  UserSubscription,
  UserSubscriptionDocument,
} from './schemas/user-subscription.schema';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(UserSubscription.name)
    private readonly subscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
    @InjectModel(CoupleInvite.name)
    private readonly coupleInviteModel: Model<CoupleInviteDocument>,
  ) {}

  listPlans() {
    return SUBSCRIPTION_PLANS;
  }

  async getMySubscription(authUserId: string): Promise<UserSubscription> {
    const sub = await this.subscriptionModel.findOne({ authUserId });
    if (!sub) {
      return this.buildFreeTierView(authUserId);
    }

    // Auto-expire if past endDate
    if (sub.status === 'active' && sub.endDate < new Date()) {
      sub.status = 'expired';
      await sub.save();
      this.logger.log(`Subscription expired for user ${authUserId}`);
    }

    return sub;
  }

  /**
   * Called by payment-service (internal, service-to-service) after a
   * payment is verified. Creates or replaces the active subscription and
   * bumps the user's aiTokenLimit to match the new plan.
   */
  async applySubscription(
    authUserId: string,
    dto: ApplySubscriptionDto,
  ): Promise<UserSubscription> {
    const plan = getPlanById(dto.planId);
    if (!plan) {
      throw new BadRequestException(`Unknown plan: ${dto.planId}`);
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + plan.validDurationDays);

    const sub = await this.subscriptionModel.findOneAndUpdate(
      { authUserId },
      {
        $set: {
          authUserId,
          planId: plan.id,
          tier: plan.tier,
          billingPeriod: plan.billingPeriod,
          status: plan.trialDurationMonths ? 'trial' : 'active',
          startDate: now,
          endDate,
          isTrialPeriod: !!plan.trialDurationMonths,
          convertsTo: plan.convertsTo,
          razorpayOrderId: dto.razorpayOrderId,
          razorpayPaymentId: dto.razorpayPaymentId,
          apps: plan.features.apps,
        },
      },
      { new: true, upsert: true },
    );

    await this.syncAiTokenQuota(authUserId, plan.id);
    this.logger.log(`Subscription ${plan.id} applied for user ${authUserId}`);
    return sub;
  }

  async cancelSubscription(
    authUserId: string,
    reason?: string,
  ): Promise<UserSubscription> {
    const sub = await this.subscriptionModel.findOne({ authUserId });
    if (!sub || sub.tier === 'free') {
      throw new NotFoundException('No active subscription found');
    }

    // Mark cancelled but keep valid until endDate — user retains access for the paid period
    sub.status = 'cancelled';
    if (reason) sub.cancellationReason = reason;
    await sub.save();

    this.logger.log(`Subscription cancelled for user ${authUserId}`);
    return sub;
  }

  private async syncAiTokenQuota(authUserId: string, planId: string) {
    const newLimit = getAiTokenQuotaForPlan(planId);
    await this.userProfileModel.findOneAndUpdate(
      { authUserId },
      { $max: { aiTokenLimit: newLimit } }, // never reduce below current balance
    );
  }

  // ── Couple plan invite flow ────────────────────────────────────────────────

  /**
   * The calling user (must be on a Couple plan) sends an invite to a partner's
   * mobile number. Returns the invite token — in production this token should
   * be delivered via SMS/notification rather than the API response.
   */
  async sendCoupleInvite(authUserId: string, dto: SendCoupleInviteDto) {
    const sub = await this.subscriptionModel.findOne({ authUserId });
    if (!sub || sub.tier !== 'couple' || sub.status !== 'active') {
      throw new BadRequestException('Only active Couple plan subscribers can send invites');
    }
    if (sub.linkedPartnerUserId) {
      throw new BadRequestException('You already have a linked partner');
    }

    // Cancel any existing pending invite from this user
    await this.coupleInviteModel.updateMany(
      { fromUserId: authUserId, status: 'pending' },
      { $set: { status: 'cancelled' } },
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = crypto.randomBytes(24).toString('hex');

    const invite = await this.coupleInviteModel.create({
      fromUserId: authUserId,
      toMobileNumber: dto.partnerMobile,
      token,
      status: 'pending',
      expiresAt,
    });

    this.logger.log(`Couple invite created: ${invite._id} from ${authUserId}`);
    return { inviteId: invite._id, token, expiresAt };
  }

  /**
   * The invited user accepts using the token they received (e.g. via SMS deep-link).
   * Both accounts are linked and the invitee is upgraded to the Couple plan.
   */
  async acceptCoupleInvite(authUserId: string, dto: AcceptCoupleInviteDto) {
    const invite = await this.coupleInviteModel.findOne({ token: dto.token });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'pending') throw new BadRequestException(`Invite is already ${invite.status}`);
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw new BadRequestException('Invite has expired');
    }
    if (invite.fromUserId === authUserId) {
      throw new BadRequestException('Cannot accept your own invite');
    }

    // Get the inviter's subscription to inherit plan details
    const inviterSub = await this.subscriptionModel.findOne({ authUserId: invite.fromUserId });
    if (!inviterSub || inviterSub.tier !== 'couple' || inviterSub.status !== 'active') {
      throw new BadRequestException('Inviter no longer has an active Couple plan');
    }

    const now = new Date();

    // Apply/upgrade the invitee to the Couple plan (mirrors the inviter's period)
    await this.subscriptionModel.findOneAndUpdate(
      { authUserId },
      {
        $set: {
          authUserId,
          planId: inviterSub.planId,
          tier: 'couple',
          billingPeriod: inviterSub.billingPeriod,
          status: 'active',
          startDate: now,
          endDate: inviterSub.endDate,
          isTrialPeriod: false,
          apps: inviterSub.apps,
          linkedPartnerUserId: invite.fromUserId,
          razorpayOrderId: inviterSub.razorpayOrderId,
        },
      },
      { new: true, upsert: true },
    );

    // Link the inviter to the invitee
    await this.subscriptionModel.findOneAndUpdate(
      { authUserId: invite.fromUserId },
      { $set: { linkedPartnerUserId: authUserId } },
    );

    // Mark invite accepted
    invite.status = 'accepted';
    invite.toUserId = authUserId;
    await invite.save();

    // Grant couple-tier AI tokens to the invitee
    await this.syncAiTokenQuota(authUserId, inviterSub.planId);

    this.logger.log(`Couple invite ${invite._id} accepted — ${invite.fromUserId} <-> ${authUserId}`);
    return { success: true, linkedWith: invite.fromUserId };
  }

  private buildFreeTierView(authUserId: string): UserSubscription {
    const farFuture = new Date('2124-01-01');
    return {
      authUserId,
      planId: 'free',
      tier: 'free',
      billingPeriod: null,
      status: 'active',
      startDate: new Date(0),
      endDate: farFuture,
      isTrialPeriod: false,
      apps: ['epidiet'],
    } as UserSubscription;
  }
}
