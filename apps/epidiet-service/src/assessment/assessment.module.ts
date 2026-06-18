import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizModule } from '../quiz/quiz.module';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
import {
  EpigeneticScoreSnapshot,
  EpigeneticScoreSnapshotSchema,
} from './schemas/epigenetic-score-snapshot.schema';

@Module({
  imports: [
    QuizModule,
    MongooseModule.forFeature([{ name: EpigeneticScoreSnapshot.name, schema: EpigeneticScoreSnapshotSchema }]),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
