import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EnablePodStyleDto {
  /** Retail price in PAISE (like Product.basePrice). Must exceed Qikink's cost.
   *  Omitted → defaults to Qikink cost + 60% margin. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  basePrice?: number;

  /** False = studio-only blank canvas, hidden from the shop listing. */
  @IsOptional()
  @IsBoolean()
  showInShop?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  /** GLB URL for the studio 3D preview; empty/omitted = default shirt model or 2D-only. */
  @IsOptional()
  @IsString()
  model3dUrl?: string;
}
