import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DesignDocument = Design & Document;

export type DesignStatus = 'draft' | 'published';
export type LayerType = 'image' | 'path' | 'shape';
export type ShapeType = 'line' | 'rect' | 'ellipse' | 'curve';

export class Point {
  x: number;
  y: number;
}

/**
 * All three layer types share x/y/width/height/rotation/zIndex, expressed as
 * percentages (0-100) of the print canvas, so the frontend's selection/transform
 * overlay works identically regardless of layer type or the design's printSizeCm —
 * changing printSizeCm only changes the px-per-cm render scale, never these values.
 */
export class CanvasLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;

  // type: 'image'
  src?: string;

  // type: 'path' (freehand pen tool) and 'shape' with shapeType 'curve' — Fabric.js's
  // own SVG path data, normalized to a local 0-100 box (so it scales with width/height
  // the same way image layers do). points/controlPoints are kept for simple shapes
  // (line/rect/ellipse) that don't need full path data.
  svgPath?: string;
  points?: Point[];
  strokeColor?: string;
  strokeWidth?: number;
  closed?: boolean;
  fill?: string | null;

  // type: 'shape' (line/rect/ellipse/curve tool)
  shapeType?: ShapeType;
  fillColor?: string | null;
  controlPoints?: Point[];
}

export class PrintSizeCm {
  width: number;
  height: number;
}

export class DesignCanvas {
  layers: CanvasLayer[];
}

@Schema({ collection: 'temptatto_designs', timestamps: true })
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
          x: Number,
          y: Number,
          width: Number,
          height: Number,
          rotation: Number,
          zIndex: Number,
          src: String,
          svgPath: String,
          points: [{ x: Number, y: Number }],
          strokeColor: String,
          strokeWidth: Number,
          closed: Boolean,
          fill: String,
          shapeType: String,
          fillColor: String,
          controlPoints: [{ x: Number, y: Number }],
        },
      ],
    },
    default: { layers: [] },
  })
  canvas: DesignCanvas;

  @Prop({ type: { width: Number, height: Number }, required: true })
  printSizeCm: PrintSizeCm;

  @Prop({ type: String, default: null })
  thumbnailUrl: string | null;

  /** High-res (300 DPI) print-ready export at printSizeCm, rendered client-side and uploaded to Cloudinary. */
  @Prop({ type: String, default: null })
  printReadyUrl: string | null;

  @Prop({ type: String, enum: ['draft', 'published'], default: 'draft', index: true })
  status: DesignStatus;

  @Prop({ type: Boolean, default: false, index: true })
  isMarketplaceListed: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Number, default: 0, min: 0 })
  physicalPrice: number;

  @Prop({ type: Boolean, default: false })
  allowDigitalDownload: boolean;

  @Prop({ type: Number, default: null })
  digitalPrice: number | null;

  @Prop({ type: Number, default: 25, min: 0, max: 100 })
  commissionRate: number;

  @Prop({ type: Number, default: 0 })
  salesCount: number;

  /** Denormalized from temptatto_reviews — recomputed by ReviewsService on every review write. */
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  ratingAvg: number;

  @Prop({ type: Number, default: 0, min: 0 })
  ratingCount: number;

  /** Set only by admin takedown; a non-null value means the design was force-unpublished. */
  @Prop({ type: String, default: null })
  takedownReason: string | null;
}

export const DesignSchema = SchemaFactory.createForClass(Design);
