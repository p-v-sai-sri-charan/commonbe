import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';
import { MealPlansService } from './meal-plans.service';

@ApiTags('epidiet/meal-plans')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Post('generate')
  generate(@Headers('x-user-id') userId: string, @Body() dto: GenerateMealPlanDto) {
    return this.mealPlansService.generate(this.requireUserId(userId), dto);
  }

  @Get('me')
  getForWeek(@Headers('x-user-id') userId: string, @Query('weekStartDate') weekStartDate?: string) {
    return this.mealPlansService.getForWeek(this.requireUserId(userId), weekStartDate);
  }

  @Put(':id')
  update(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() dto: UpdateMealPlanDto) {
    return this.mealPlansService.update(this.requireUserId(userId), id, dto);
  }
}
