import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EpigeneticScoreSnapshotDocument = EpigeneticScoreSnapshot & Document;

@Schema({ _id: false })
class PathwayScores {
  @Prop({ type: Number, default: 0 })
  methylation: number;

  @Prop({ type: Number, default: 0 })
  histone_modification: number;

  @Prop({ type: Number, default: 0 })
  oxidative_stress: number;

  @Prop({ type: Number, default: 0 })
  gut_microbiome: number;

  @Prop({ type: Number, default: 0 })
  overall: number;
}

@Schema({ timestamps: true, collection: 'epidiet_score_snapshots' })
export class EpigeneticScoreSnapshot {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: PathwayScores, default: {} })
  scores: PathwayScores;
}

export const EpigeneticScoreSnapshotSchema = SchemaFactory.createForClass(EpigeneticScoreSnapshot);
