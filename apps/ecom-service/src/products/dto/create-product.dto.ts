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

  /** Provider color code for POD SKU building, e.g. Qikink "Wh" for White. */
  @IsOptional()
  @IsString()
  podColorCode?: string;
}

export class PodConfigDto {
  @IsIn(['qikink'])
  provider: string;

  /** Qikink print technique: 1=DTG, 2=AOP, 3=Embroidery, 17=DTF, … */
  @IsNumber()
  printTypeId: number;

  /** Provider base SKU without color/size suffix, e.g. "MVnHs". */
  @IsString()
  baseSku: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  frontPrintRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  backPrintRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  backSurchargePaise?: number;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => PodConfigDto)
  pod?: PodConfigDto;

  @IsOptional()
  @IsString()
  styleKey?: string;

  /** GLB URL for the studio 3D preview (upload the model, e.g. to Cloudinary raw). */
  @IsOptional()
  @IsString()
  model3dUrl?: string;

  @IsOptional()
  @IsString()
  garmentType?: string;

  /** False = studio-only blank canvas; hidden from the shop listing. */
  @IsOptional()
  @IsBoolean()
  showInShop?: boolean;

  /** False = ready-made product (mockup images, no studio editing). */
  @IsOptional()
  @IsBoolean()
  customizable?: boolean;
}
