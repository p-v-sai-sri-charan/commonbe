import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

export type ReportReason = 'copyright' | 'inappropriate' | 'offensive' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

@Schema({ collection: 'ecom_reports', timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'Design', required: true, index: true })
  designId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  reporterUserId: string;

  @Prop({ type: String, enum: ['copyright', 'inappropriate', 'offensive', 'other'], required: true })
  reason: ReportReason;

  @Prop({ type: String, default: null })
  details: string | null;

  @Prop({ type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true })
  status: ReportStatus;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
