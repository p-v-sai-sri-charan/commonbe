import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiGenerationDocument = AiGeneration & Document;

@Schema({ collection: 'ecom_ai_generations', timestamps: true })
export class AiGeneration {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  prompt: string;

  @Prop({ type: String, default: 'openai' })
  provider: string;

  @Prop({ type: String, default: 'dall-e-3' })
  model: string;

  @Prop({ type: Boolean, default: false })
  usedByok: boolean;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({ type: Number, default: 1 })
  creditsUsed: number;
}

export const AiGenerationSchema = SchemaFactory.createForClass(AiGeneration);
