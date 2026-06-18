import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FoodEpigeneticTag } from '../../common/enums';

export type FoodItemDocument = FoodItem & Document;

@Schema({ collection: 'epidiet_food_items' })
export class FoodItem {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: [String], enum: FoodEpigeneticTag, default: [] })
  epigeneticTags: FoodEpigeneticTag[];

  @Prop({ type: String, required: true })
  geneImpactExplanation: string;

  @Prop({ type: [String], default: [] })
  genesOrPathways: string[];
}

export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);
