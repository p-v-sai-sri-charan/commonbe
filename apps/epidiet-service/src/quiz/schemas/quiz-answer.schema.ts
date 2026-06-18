import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuizAnswerDocument = QuizAnswer & Document;

@Schema({ timestamps: true, collection: 'epidiet_quiz_answers' })
export class QuizAnswer {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, required: true })
  questionId: string;

  /** Always an array — single-select answers are stored as a one-element array. */
  @Prop({ type: [String], required: true })
  value: string[];
}

export const QuizAnswerSchema = SchemaFactory.createForClass(QuizAnswer);
QuizAnswerSchema.index({ authUserId: 1, questionId: 1 }, { unique: true });
