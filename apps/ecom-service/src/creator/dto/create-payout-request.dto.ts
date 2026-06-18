import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePayoutRequestDto {
  @IsEnum(['cash', 'discount'])
  type: 'cash' | 'discount';

  @IsInt()
  @Min(100)
  creditsUsed: number;

  @IsOptional()
  @IsString()
  paymentDetails?: string;
}
