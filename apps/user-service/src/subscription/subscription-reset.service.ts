import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfile, UserProfileDocument } from '../users/schemas/user-profile.schema';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscription.schema';
import { getAiTokenQuotaForPlan } from './plans.config';

@Injectable()
export class SubscriptionResetService {
  private readonly logger = new Logger(SubscriptionResetService.name);

  constructor(
    @InjectModel(UserSubscription.name)
    private readonly subscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  /**
   * Runs at midnight on the 1st of every month.
   * Resets each active subscriber's aiTokenLimit to their plan's monthly quota.
   * Free users don't have a subscription record so they're handled by the
   * profile's default (AI_TOKENS.FREE) — no reset needed.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlyAiTokens() {
    this.logger.log('Monthly AI token reset — starting');

    const activeSubs = await this.subscriptionModel
      .find({ status: { $in: ['active', 'trial'] } })
      .lean();

    let resetCount = 0;
    for (const sub of activeSubs) {
      const quota = getAiTokenQuotaForPlan(sub.planId);
      await this.userProfileModel.findOneAndUpdate(
        { authUserId: sub.authUserId },
        { $set: { aiTokenLimit: quota } },
      );
      resetCount++;
    }

    this.logger.log(`Monthly AI token reset — done (${resetCount} users reset)`);
  }
}
