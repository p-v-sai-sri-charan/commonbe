import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MealPlanDocument = MealPlan & Document;

@Schema({ _id: false })
class Meal {
  @Prop({ type: String, required: true })
  mealType: string; // breakfast | lunch | dinner | snack

  @Prop({ type: [String], default: [] })
  foodItemIds: string[];

  @Prop({ type: String })
  notes?: string;
}

@Schema({ _id: false })
class MealPlanDay {
  @Prop({ type: String, required: true })
  date: string; // ISO date (yyyy-mm-dd)

  @Prop({ type: [Meal], default: [] })
  meals: Meal[];
}

@Schema({ timestamps: true, collection: 'epidiet_meal_plans' })
export class MealPlan {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, required: true })
  weekStartDate: string; // ISO date (yyyy-mm-dd)

  @Prop({ type: [MealPlanDay], default: [] })
  days: MealPlanDay[];

  /** Snapshot of the user's overall epigenetic score at generation time. */
  @Prop({ type: Number, default: 0 })
  epigeneticScore: number;

  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  generatedBy: 'auto' | 'manual';

  /** Optional AI-generated rationale (only present when AI_PROVIDER is configured). */
  @Prop({ type: String })
  aiRationale?: string;
}

export const MealPlanSchema = SchemaFactory.createForClass(MealPlan);
