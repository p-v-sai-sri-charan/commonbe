import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';
import { AiCreditsService } from './ai-credits.service';

class AdminGrantDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

@ApiTags('ai-credits')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('ai-credits')
export class AiCreditsController {
  constructor(private readonly aiCreditsService: AiCreditsService) {}

  @Get('balance')
  getBalance(@Headers('x-user-id') userId: string) {
    return this.aiCreditsService.getBalance(userId);
  }

  @Get('transactions')
  getTransactions(@Headers('x-user-id') userId: string, @Query('limit') limit?: string) {
    return this.aiCreditsService.getTransactions(userId, Number(limit) || 20);
  }

  @Post('admin/grant')
  adminGrant(@Body() dto: AdminGrantDto) {
    return this.aiCreditsService.adminGrant(dto.userId, dto.amount);
  }
}
