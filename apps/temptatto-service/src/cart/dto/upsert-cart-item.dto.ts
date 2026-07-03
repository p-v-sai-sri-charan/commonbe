import { IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertCartItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  designId?: string;

  @IsString()
  size: string;

  @IsOptional()
  @IsString()
  placement?: string;

  @IsIn(['physical', 'digital'])
  fulfillmentType: 'physical' | 'digital';

  @IsNumber()
  @Min(0)
  quantity: number;
}
