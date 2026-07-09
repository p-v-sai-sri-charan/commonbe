import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  /** Qikink print technique: 1 = DTG, 17 = DTF. Defaults to the catalog's value (DTG). */
  @IsOptional()
  @IsIn([1, 17])
  printTypeId?: number;

  /** Qikink front print cost (rupees, ex-GST) from their dashboard; defaults per technique. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  frontPrintRupees?: number;

  /** Qikink back print cost (rupees, ex-GST); drives the checkout back-print surcharge. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  backPrintRupees?: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** GLB URL for the studio 3D preview; empty/omitted = default shirt model or 2D-only. */
  @IsOptional()
  @IsString()
  model3dUrl?: string;
}
