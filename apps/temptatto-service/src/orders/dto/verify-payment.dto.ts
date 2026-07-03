import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpaySignature: string;
}
