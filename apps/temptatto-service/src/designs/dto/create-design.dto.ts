import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PointDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class CanvasLayerDto {
  @IsString()
  id: string;

  @IsIn(['image', 'path', 'shape'])
  type: 'image' | 'path' | 'shape';

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;

  @IsNumber()
  rotation: number;

  @IsNumber()
  @Min(0)
  zIndex: number;

  // type: 'image'
  @IsOptional()
  @IsString()
  src?: string;

  // type: 'path' and shapeType 'curve' — Fabric.js SVG path data, normalized to a
  // local 0-100 box
  @IsOptional()
  @IsString()
  svgPath?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points?: PointDto[];

  @IsOptional()
  @IsString()
  strokeColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  strokeWidth?: number;

  @IsOptional()
  @IsBoolean()
  closed?: boolean;

  @IsOptional()
  @IsString()
  fill?: string | null;

  // type: 'shape'
  @IsOptional()
  @IsIn(['line', 'rect', 'ellipse', 'curve'])
  shapeType?: 'line' | 'rect' | 'ellipse' | 'curve';

  @IsOptional()
  @IsString()
  fillColor?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  controlPoints?: PointDto[];
}

export class DesignCanvasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvasLayerDto)
  layers: CanvasLayerDto[];
}

export class PrintSizeCmDto {
  @IsNumber()
  @Min(0.1)
  width: number;

  @IsNumber()
  @Min(0.1)
  height: number;
}

export class CreateDesignDto {
  @IsMongoId()
  productId: string;

  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => DesignCanvasDto)
  canvas: DesignCanvasDto;

  @ValidateNested()
  @Type(() => PrintSizeCmDto)
  printSizeCm: PrintSizeCmDto;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
