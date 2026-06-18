import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileModule } from '../profile/profile.module';
import { BabyPlanController } from './baby-plan.controller';
import { BabyPlanService } from './baby-plan.service';
import { BabyPlan, BabyPlanSchema } from './schemas/baby-plan.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: BabyPlan.name, schema: BabyPlanSchema }]), ProfileModule],
  controllers: [BabyPlanController],
  providers: [BabyPlanService],
  exports: [BabyPlanService],
})
export class BabyPlanModule {}
