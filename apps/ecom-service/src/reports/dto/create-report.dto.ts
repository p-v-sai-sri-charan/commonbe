import { IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsMongoId()
  designId: string;

  @IsIn(['copyright', 'inappropriate', 'offensive', 'other'])
  reason: 'copyright' | 'inappropriate' | 'offensive' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
