import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePayoutStatusDto {
  @IsEnum(['approved', 'rejected', 'completed'])
  status: 'approved' | 'rejected' | 'completed';

  @IsOptional()
  @IsString()
  adminNote?: string;
}
