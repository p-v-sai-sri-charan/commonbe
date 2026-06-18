import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  prompt: string;

  @IsOptional()
  @IsIn(['1024x1024', '1792x1024', '1024x1792'])
  size?: '1024x1024' | '1792x1024' | '1024x1792';

  @IsOptional()
  @IsIn(['standard', 'hd'])
  quality?: 'standard' | 'hd';

  @IsOptional()
  @IsIn(['vivid', 'natural'])
  style?: 'vivid' | 'natural';

  @IsOptional()
  useByok?: boolean;
}
