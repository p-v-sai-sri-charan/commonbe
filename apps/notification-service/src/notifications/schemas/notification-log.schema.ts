import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

export type NotificationLogDocument = NotificationLog & Document;

/** Audit trail of every notification dispatched (or attempted). */
@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ type: String, required: true, index: true })
  authUserId: string;

  @Prop({ type: String, required: true })
  event: string;

  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel: NotificationChannel;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
