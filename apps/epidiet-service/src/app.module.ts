import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentModule } from './assessment/assessment.module';
import { BabyPlanModule } from './baby-plan/baby-plan.module';
import { CoachModule } from './coach/coach.module';
import { EducationModule } from './education/education.module';
import { FoodsModule } from './foods/foods.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { ProfileModule } from './profile/profile.module';
import { ProgressModule } from './progress/progress.module';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('EPIDIET_MONGO_URI'),
      }),
    }),
    ProfileModule,
    QuizModule,
    AssessmentModule,
    FoodsModule,
    MealPlansModule,
    ProgressModule,
    EducationModule,
    BabyPlanModule,
    CoachModule,
  ],
})
export class AppModule {}
