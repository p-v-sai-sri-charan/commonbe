import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DesignDocument = Design & Document;

export type DesignStatus = 'draft' | 'published' | 'rejected';

export class CanvasLayer {
  id: string;
  type: 'image';
  src: string;
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
}

export const DesignSchema = SchemaFactory.createForClass(Design);
