import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateAdminConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  signupAiCredits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  designPurchaseBonusCredits?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxCanvasLayers?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  aiCreditCostPerGeneration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditCashRatePaise?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditDiscountRatePaise?: number;
}
