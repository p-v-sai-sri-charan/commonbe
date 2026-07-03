import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DesignCanvasDto, PrintSizeCmDto } from './create-design.dto';

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignCanvasDto)
  canvas?: DesignCanvasDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrintSizeCmDto)
  printSizeCm?: PrintSizeCmDto;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  printReadyUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
