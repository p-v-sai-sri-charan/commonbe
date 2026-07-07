import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ collection: 'ecom_reviews', timestamps: true })
export class Review {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Design', required: true, index: true })
  designId: Types.ObjectId;

  /** The paid order that proves this is a verified purchase. */
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, default: null })
  comment: string | null;

  @Prop({ type: [String], default: [] })
  photoUrls: string[];

  /** Display name shown publicly — the service has no access to user profiles. */
  @Prop({ type: String, default: null })
  reviewerName: string | null;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// One review per user per design; editing goes through the same upsert path.
ReviewSchema.index({ userId: 1, designId: 1 }, { unique: true });
