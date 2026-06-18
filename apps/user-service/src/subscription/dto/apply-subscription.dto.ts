import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Internal DTO — called by payment-service after a payment is verified. */
export class ApplySubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsOptional()
  razorpayOrderId?: string;

  @IsString()
  @IsOptional()
  razorpayPaymentId?: string;
}
