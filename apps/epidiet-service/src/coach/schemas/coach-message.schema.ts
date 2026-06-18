import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AiProviderId } from '@app/ai';

export type CoachMessageDocument = CoachMessage & Document;

@Schema({ timestamps: true, collection: 'epidiet_coach_messages' })
export class CoachMessage {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, enum: ['user', 'assistant'], required: true })
  role: 'user' | 'assistant';

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: AiProviderId })
  provider?: AiProviderId;
}

export const CoachMessageSchema = SchemaFactory.createForClass(CoachMessage);
