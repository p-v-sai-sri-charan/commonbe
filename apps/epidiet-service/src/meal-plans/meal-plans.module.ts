import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '@app/ai';
import { AssessmentModule } from '../assessment/assessment.module';
import { FoodsModule } from '../foods/foods.module';
import { ProfileModule } from '../profile/profile.module';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { MealPlan, MealPlanSchema } from './schemas/meal-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MealPlan.name, schema: MealPlanSchema }]),
    AssessmentModule,
    FoodsModule,
    ProfileModule,
    AiModule,
  ],
  controllers: [MealPlansController],
  providers: [MealPlansService],
})
export class MealPlansModule {}
