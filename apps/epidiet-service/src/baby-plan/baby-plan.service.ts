import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProfileService } from '../profile/profile.service';
import { BABY_PLAN_DISCLAIMER, BABY_PLAN_PROTOCOLS, BABY_PLAN_TIMELINE_WEEKS } from './data/baby-plan-protocols.data';
import { SetBabyPlanDto } from './dto/set-baby-plan.dto';
import { BabyPlan, BabyPlanDocument } from './schemas/baby-plan.schema';

@Injectable()
export class BabyPlanService {
  constructor(
    @InjectModel(BabyPlan.name) private readonly babyPlanModel: Model<BabyPlanDocument>,
    private readonly profileService: ProfileService,
  ) {}

  getDisclaimer(): string {
    return BABY_PLAN_DISCLAIMER;
  }

  /** Gates the Baby Plan tab/feature — only meaningful once the user said they're trying to conceive. */
  async setPlan(authUserId: string, dto: SetBabyPlanDto): Promise<BabyPlan> {
    const profile = await this.profileService.findProfileOrNull(authUserId);
    if (!profile?.tryingToConceive) {
      throw new BadRequestException(
        'Set tryingToConceive=true on your epidiet profile before starting a baby plan',
      );
    }

    const protocol = BABY_PLAN_PROTOCOLS[dto.desiredGender];

    return this.babyPlanModel.findOneAndUpdate(
      { authUserId },
      {
        $set: {
          authUserId,
          desiredGender: dto.desiredGender,
          disclaimerAcknowledged: dto.disclaimerAcknowledged,
          motherPlan: protocol.mother,
          fatherPlan: protocol.father,
        },
        $setOnInsert: {
          startDate: new Date().toISOString().slice(0, 10),
          timelineWeeks: BABY_PLAN_TIMELINE_WEEKS,
        },
      },
      { new: true, upsert: true },
    );
  }

  async getPlan(authUserId: string): Promise<BabyPlan> {
    const plan = await this.babyPlanModel.findOne({ authUserId });
    if (!plan) {
      throw new NotFoundException('No baby plan set — call POST /epidiet/baby-plan first');
    }
    return plan;
  }
}
