import { IsString } from 'class-validator';

export class VerifySubscriptionDto {
  @IsString()
  planId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}
