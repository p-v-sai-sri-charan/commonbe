import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssessmentModule } from '../assessment/assessment.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressLog, ProgressLogSchema } from './schemas/progress-log.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProgressLog.name, schema: ProgressLogSchema }]), AssessmentModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
