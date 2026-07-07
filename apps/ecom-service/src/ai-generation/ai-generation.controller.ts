import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireUserGuard } from '../common/guards/require-user.guard';
import { AiGenerationService } from './ai-generation.service';
import { GenerateImageDto } from './dto/generate-image.dto';

@ApiTags('ai-generation')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@UseGuards(RequireUserGuard)
@Controller('ai-generation')
export class AiGenerationController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('generate')
  generate(@Headers('x-user-id') userId: string, @Body() dto: GenerateImageDto) {
    return this.aiGenerationService.generate(userId, dto);
  }

  @Get('history')
  history(@Headers('x-user-id') userId: string, @Query('limit') limit?: string) {
    return this.aiGenerationService.getHistory(userId, Number(limit) || 20);
  }
}
