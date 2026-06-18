import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '@app/ai';
import { BabyPlanModule } from '../baby-plan/baby-plan.module';
import { ProfileModule } from '../profile/profile.module';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachMessage, CoachMessageSchema } from './schemas/coach-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CoachMessage.name, schema: CoachMessageSchema }]),
    AiModule,
    ProfileModule,
    BabyPlanModule,
    HttpModule,
  ],
  controllers: [CoachController],
  providers: [CoachService],
})
export class CoachModule {}
