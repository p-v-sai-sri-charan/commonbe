import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CanvasLayerDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsIn(['front', 'back'])
  side?: 'front' | 'back';

  @IsIn(['image', 'text'])
  type: 'image' | 'text';

  /** Image URL — omitted/empty for text layers. */
  @IsOptional()
  @IsString()
  src?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  fontWeight?: string;

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
}

export class DesignCanvasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanvasLayerDto)
  layers: CanvasLayerDto[];
}

export class CreateDesignDto {
  @IsMongoId()
  productId: string;

  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => DesignCanvasDto)
  canvas: DesignCanvasDto;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  backThumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
