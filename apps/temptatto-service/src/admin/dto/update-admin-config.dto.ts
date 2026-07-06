import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { SizeOptionDto } from '../../products/dto/create-product.dto';

export class UpdateAdminConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCanvasLayers?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeOptionDto)
  defaultSizeOptions?: SizeOptionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultPlacements?: string[];

  @IsOptional()
  @IsObject()
  siteTheme?: Record<string, unknown>;
}
