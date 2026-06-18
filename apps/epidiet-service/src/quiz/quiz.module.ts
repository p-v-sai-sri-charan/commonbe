import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizAnswer, QuizAnswerSchema } from './schemas/quiz-answer.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: QuizAnswer.name, schema: QuizAnswerSchema }])],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
