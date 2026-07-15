import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { DesignCanvasDto } from './create-design.dto';

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignCanvasDto)
  canvas?: DesignCanvasDto;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  backThumbnailUrl?: string;

  /** Shirt-colored composite preview (UI display only — never used as a Qikink print file). */
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
