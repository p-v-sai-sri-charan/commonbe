import { IsISO8601, IsOptional } from 'class-validator';

export class GenerateMealPlanDto {
  /** Defaults to today if omitted. */
  @IsOptional()
  @IsISO8601({ strict: true })
  weekStartDate?: string;
}
