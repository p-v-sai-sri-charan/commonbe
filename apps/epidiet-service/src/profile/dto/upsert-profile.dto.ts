import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { BiologicalSex, ExerciseHabit, SleepQuality, StressLevel } from '../../common/enums';

class HealthHistoryDto {
  @IsOptional()
  @IsBoolean()
  autoimmuneIssues?: boolean;

  @IsOptional()
  @IsBoolean()
  metabolicConditions?: boolean;

  @IsOptional()
  @IsString()
  familyHistoryNotes?: string;
}

class LifestyleDto {
  @IsOptional()
  @IsEnum(StressLevel)
  stressLevel?: StressLevel;

  @IsOptional()
  @IsEnum(SleepQuality)
  sleepQuality?: SleepQuality;

  @IsOptional()
  @IsEnum(ExerciseHabit)
  exerciseHabits?: ExerciseHabit;
}

export class UpsertProfileDto {
  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(BiologicalSex)
  biologicalSex?: BiologicalSex;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthGoals?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HealthHistoryDto)
  healthHistory?: HealthHistoryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LifestyleDto)
  lifestyle?: LifestyleDto;

  @IsOptional()
  @IsBoolean()
  hasGeneticDataUploaded?: boolean;

  @IsOptional()
  @IsBoolean()
  tryingToConceive?: boolean;
}
