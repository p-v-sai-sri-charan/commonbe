import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PublishDesignDto {
  @IsBoolean()
  isMarketplaceListed: boolean;

  @IsNumber()
  @Min(0)
  physicalPrice: number;

  @IsOptional()
  @IsBoolean()
  allowDigitalDownload?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  digitalPrice?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
