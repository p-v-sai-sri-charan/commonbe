import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { BabyPlanService } from './baby-plan.service';
import { SetBabyPlanDto } from './dto/set-baby-plan.dto';

@ApiTags('epidiet/baby-plan')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/baby-plan')
export class BabyPlanController {
  constructor(private readonly babyPlanService: BabyPlanService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Get('disclaimer')
  getDisclaimer() {
    return { disclaimer: this.babyPlanService.getDisclaimer() };
  }

  @Post()
  setPlan(@Headers('x-user-id') userId: string, @Body() dto: SetBabyPlanDto) {
    return this.babyPlanService.setPlan(this.requireUserId(userId), dto);
  }

  @Get('me')
  getPlan(@Headers('x-user-id') userId: string) {
    return this.babyPlanService.getPlan(this.requireUserId(userId));
  }
}
