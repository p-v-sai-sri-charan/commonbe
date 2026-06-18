import { IsEnum, IsNumber, IsObject, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentProviderId } from '../providers/payment-provider.interface';

export class CreateOrderDto {
  @IsEnum(PaymentProviderId)
  provider: PaymentProviderId;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
