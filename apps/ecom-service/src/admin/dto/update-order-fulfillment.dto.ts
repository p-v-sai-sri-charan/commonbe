import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderFulfillmentDto {
  @IsEnum(['pending', 'processing', 'shipped', 'delivered'])
  fulfillmentStatus: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
