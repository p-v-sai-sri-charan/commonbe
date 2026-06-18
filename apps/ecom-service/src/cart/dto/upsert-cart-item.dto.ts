import { IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertCartItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  designId?: string;

  @IsString()
  variantColor: string;

  @IsString()
  size: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}
