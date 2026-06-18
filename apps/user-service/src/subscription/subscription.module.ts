import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UserProfile, UserProfileSchema } from '../users/schemas/user-profile.schema';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionResetService } from './subscription-reset.service';
import { SubscriptionService } from './subscription.service';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from './schemas/user-subscription.schema';
import { CoupleInvite, CoupleInviteSchema } from './schemas/couple-invite.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: CoupleInvite.name, schema: CoupleInviteSchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionResetService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
