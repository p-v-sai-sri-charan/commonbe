import { IsIn } from 'class-validator';

export class UpdateReportStatusDto {
  @IsIn(['open', 'resolved', 'dismissed'])
  status: 'open' | 'resolved' | 'dismissed';
}
