import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';

class MealDto {
  @IsString()
  mealType: string;

  @IsArray()
  @IsString({ each: true })
  foodItemIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

class MealPlanDayDto {
  @IsISO8601({ strict: true })
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals: MealDto[];
}

/** Drag-and-drop grid edits land here — the whole `days` array is replaced. */
export class UpdateMealPlanDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MealPlanDayDto)
  days: MealPlanDayDto[];
}
