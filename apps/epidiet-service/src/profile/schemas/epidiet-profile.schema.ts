import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BiologicalSex, ExerciseHabit, SleepQuality, StressLevel } from '../../common/enums';

export type EpidietProfileDocument = EpidietProfile & Document;

@Schema({ _id: false })
class HealthHistory {
  @Prop({ type: Boolean, default: false })
  autoimmuneIssues: boolean;

  @Prop({ type: Boolean, default: false })
  metabolicConditions: boolean;

  @Prop({ type: String })
  familyHistoryNotes?: string;
}

@Schema({ _id: false })
class Lifestyle {
  @Prop({ type: String, enum: StressLevel })
  stressLevel?: StressLevel;

  @Prop({ type: String, enum: SleepQuality })
  sleepQuality?: SleepQuality;

  @Prop({ type: String, enum: ExerciseHabit })
  exerciseHabits?: ExerciseHabit;
}

@Schema({ timestamps: true, collection: 'epidiet_profiles' })
export class EpidietProfile {
  /** Links this profile back to the AuthUser._id from auth-service. */
  @Prop({ type: String, required: true, unique: true, index: true })
  authUserId: string;

  @Prop({ type: Number })
  age?: number;

  /** Step 1 of the quiz — drives the Female/Male epigenetic protocol. */
  @Prop({ type: String, enum: BiologicalSex })
  biologicalSex?: BiologicalSex;

  @Prop({ type: [String], default: [] })
  healthGoals: string[];

  @Prop({ type: HealthHistory, default: {} })
  healthHistory: HealthHistory;

  @Prop({ type: Lifestyle, default: {} })
  lifestyle: Lifestyle;

  /**
   * Flag only — per current scope decision we do not store or parse the
   * actual genetic/ancestry file upload, just whether the user has one.
   */
  @Prop({ type: Boolean, default: false })
  hasGeneticDataUploaded: boolean;

  /** Gates the Baby Plan tab/feature — see baby-plan module. */
  @Prop({ type: Boolean, default: false })
  tryingToConceive: boolean;
}

export const EpidietProfileSchema = SchemaFactory.createForClass(EpidietProfile);
