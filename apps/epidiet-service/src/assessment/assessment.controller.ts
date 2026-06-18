import { BadRequestException, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';

@ApiTags('epidiet/assessment')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Get('me')
  getCurrent(@Headers('x-user-id') userId: string) {
    return this.assessmentService.computeScores(this.requireUserId(userId));
  }

  /** Call this periodically (e.g. on daily progress log) to track trend over time. */
  @Post('snapshot')
  snapshot(@Headers('x-user-id') userId: string) {
    return this.assessmentService.snapshotScores(this.requireUserId(userId));
  }

  @Get('trend/me')
  getTrend(@Headers('x-user-id') userId: string) {
    return this.assessmentService.getTrend(this.requireUserId(userId));
  }
}
