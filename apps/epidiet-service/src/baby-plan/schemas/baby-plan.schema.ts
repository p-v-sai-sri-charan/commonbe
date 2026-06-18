import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BabyGenderChoice } from '../../common/enums';

export type BabyPlanDocument = BabyPlan & Document;

@Schema({ _id: false })
class PartnerPlan {
  @Prop({ type: [String], default: [] })
  recommendedFoods: string[];

  @Prop({ type: [String], default: [] })
  avoidFoods: string[];

  @Prop({ type: [String], default: [] })
  geneReferences: string[];

  @Prop({ type: String })
  summary: string;
}

@Schema({ timestamps: true, collection: 'epidiet_baby_plans' })
export class BabyPlan {
  @Prop({ type: String, required: true, unique: true, index: true })
  authUserId: string;

  @Prop({ type: String, enum: BabyGenderChoice, required: true })
  desiredGender: BabyGenderChoice;

  @Prop({ type: String, required: true })
  startDate: string; // ISO date

  @Prop({ type: Number, required: true })
  timelineWeeks: number;

  @Prop({ type: PartnerPlan, required: true })
  motherPlan: PartnerPlan;

  @Prop({ type: PartnerPlan, required: true })
  fatherPlan: PartnerPlan;

  @Prop({ type: Boolean, required: true })
  disclaimerAcknowledged: boolean;
}

export const BabyPlanSchema = SchemaFactory.createForClass(BabyPlan);
