import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOrderFulfillmentDto {
  @IsIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  fulfillmentStatus: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
