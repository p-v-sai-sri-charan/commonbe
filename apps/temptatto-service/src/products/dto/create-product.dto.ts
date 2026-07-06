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

export class SizeOptionDto {
  @IsString()
  label: string;

  @IsNumber()
  @Min(0.1)
  widthCm: number;

  @IsNumber()
  @Min(0.1)
  heightCm: number;

  @IsNumber()
  priceModifier: number;
}

export class PrintAreaCmDto {
  @IsNumber()
  @Min(0.1)
  width: number;

  @IsNumber()
  @Min(0.1)
  height: number;
}

export class ProductImageDto {
  @IsString()
  label: string;

  @IsString()
  url: string;
}

export class DesignAreaDto {
  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsMongoId()
  categoryId: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeOptionDto)
  sizeOptions?: SizeOptionDto[];

  @ValidateNested()
  @Type(() => PrintAreaCmDto)
  maxPrintAreaCm: PrintAreaCmDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  placementSuggestions?: string[];

  @IsOptional()
  @IsIn(['full', 'limited'])
  designAreaType?: 'full' | 'limited';

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignAreaDto)
  designArea?: DesignAreaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['physical', 'digital'], { each: true })
  fulfillmentTypes?: string[];
}
