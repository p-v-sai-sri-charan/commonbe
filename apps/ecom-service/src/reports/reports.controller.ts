import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireUserGuard } from '../common/guards/require-user.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@UseGuards(RequireUserGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(@Headers('x-user-id') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(userId, dto);
  }
}
