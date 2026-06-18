import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaymentProviderId } from '../providers/payment-provider.interface';

export class VerifyPaymentDto {
  @IsEnum(PaymentProviderId)
  provider: PaymentProviderId;

  @IsString()
  providerOrderId: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  /** Provider-specific verification fields (signature/hash/checksum/status, etc). */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
