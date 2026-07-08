import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EnablePodStyleDto {
  /** Retail price in PAISE (like Product.basePrice). Must exceed Qikink's cost. */
  @IsNumber()
  @Min(1)
  basePrice: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** GLB URL for the studio 3D preview; empty/omitted = default shirt model or 2D-only. */
  @IsOptional()
  @IsString()
  model3dUrl?: string;
}
