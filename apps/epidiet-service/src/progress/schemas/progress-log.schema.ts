import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ExerciseHabit, SleepQuality, StressLevel } from '../../common/enums';

export type ProgressLogDocument = ProgressLog & Document;

@Schema({ timestamps: true, collection: 'epidiet_progress_logs' })
export class ProgressLog {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, required: true })
  date: string; // ISO date (yyyy-mm-dd)

  @Prop({ type: [String], default: [] })
  loggedFoodItemIds: string[];

  @Prop({ type: String, enum: SleepQuality })
  sleepQuality?: SleepQuality;

  @Prop({ type: String, enum: StressLevel })
  stressLevel?: StressLevel;

  @Prop({ type: String, enum: ExerciseHabit })
  exerciseHabits?: ExerciseHabit;

  @Prop({ type: Number })
  exerciseMinutes?: number;

  @Prop({ type: String })
  notes?: string;
}

export const ProgressLogSchema = SchemaFactory.createForClass(ProgressLog);
ProgressLogSchema.index({ authUserId: 1, date: 1 }, { unique: true });
