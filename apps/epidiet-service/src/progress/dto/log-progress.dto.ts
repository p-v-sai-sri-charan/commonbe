import { IsArray, IsEnum, IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ExerciseHabit, SleepQuality, StressLevel } from '../../common/enums';

export class LogProgressDto {
  /** Defaults to today if omitted. */
  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loggedFoodItemIds?: string[];

  @IsOptional()
  @IsEnum(SleepQuality)
  sleepQuality?: SleepQuality;

  @IsOptional()
  @IsEnum(StressLevel)
  stressLevel?: StressLevel;

  @IsOptional()
  @IsEnum(ExerciseHabit)
  exerciseHabits?: ExerciseHabit;

  @IsOptional()
  @IsInt()
  @Min(0)
  exerciseMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
