import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  @Post()
  create(@Headers('x-user-id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(this.requireUserId(userId), dto);
  }
}
