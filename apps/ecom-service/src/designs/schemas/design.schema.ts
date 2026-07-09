import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DesignDocument = Design & Document;

export type DesignStatus = 'draft' | 'published' | 'rejected';

export class CanvasLayer {
  id: string;
  type: 'image';
  src: string;
  /** Which garment face the layer prints on. Missing = 'front' (pre-back-print designs). */
  side?: 'front' | 'back';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export class DesignCanvas {
  layers: CanvasLayer[];
}

@Schema({ collection: 'ecom_designs', timestamps: true })
export class Design {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: {
      layers: [
        {
          id: String,
          type: String,
          src: String,
          side: { type: String, enum: ['front', 'back'], default: 'front' },
          x: Number,
          y: Number,
          width: Number,
          height: Number,
          rotation: Number,
          zIndex: Number,
        },
      ],
    },
    default: { layers: [] },
  })
  canvas: DesignCanvas;

  @Prop({ type: String, default: null })
  thumbnailUrl: string | null;

  /** Rendered back-side print, when the design uses the back face (Qikink 'bk' placement). */
  @Prop({ type: String, default: null })
  backThumbnailUrl: string | null;

  @Prop({ type: Boolean, default: false })
  aiGenerated: boolean;

  @Prop({ type: String, enum: ['draft', 'published', 'rejected'], default: 'draft', index: true })
  status: DesignStatus;

  @Prop({ type: Boolean, default: false, index: true })
  isMarketplaceListed: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Number, default: 0, min: 0 })
  price: number;

  @Prop({ type: Number, default: 25, min: 0, max: 100 })
  commissionRate: number;

  @Prop({ type: Number, default: 0 })
  salesCount: number;

  /** Denormalized from ecom_reviews — recomputed by ReviewsService on every review write. */
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  ratingAvg: number;

  @Prop({ type: Number, default: 0, min: 0 })
  ratingCount: number;

  /** Set only by admin takedown; a non-null value means the design was force-unpublished. */
  @Prop({ type: String, default: null })
  takedownReason: string | null;
}

export const DesignSchema = SchemaFactory.createForClass(Design);
