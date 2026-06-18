import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { LogProgressDto } from './dto/log-progress.dto';
import { ProgressService } from './progress.service';

@ApiTags('epidiet/progress')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Post()
  logProgress(@Headers('x-user-id') userId: string, @Body() dto: LogProgressDto) {
    return this.progressService.logProgress(this.requireUserId(userId), dto);
  }

  @Get('me')
  getLogs(@Headers('x-user-id') userId: string, @Query('limit') limit?: string) {
    return this.progressService.getLogs(this.requireUserId(userId), limit ? Number(limit) : undefined);
  }
}
