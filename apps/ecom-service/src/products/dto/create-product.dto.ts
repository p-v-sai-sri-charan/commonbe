import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SizeStockDto {
  @IsString()
  size: string;

  @IsNumber()
  @Min(0)
  stock: number;
}

export class ProductVariantDto {
  @IsString()
  color: string;

  @IsString()
  hexCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeStockDto)
  sizes: SizeStockDto[];
}

export class ProductImageDto {
  @IsString()
  color: string;

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

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];

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
}
