import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CoachService } from './coach.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('epidiet/coach')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Post('messages')
  sendMessage(@Headers('x-user-id') userId: string, @Body() dto: SendMessageDto) {
    return this.coachService.sendMessage(this.requireUserId(userId), dto);
  }

  @Get('messages/me')
  getHistory(@Headers('x-user-id') userId: string) {
    return this.coachService.getHistory(this.requireUserId(userId));
  }

  @Get('quick-prompts/me')
  getQuickPrompts(@Headers('x-user-id') userId: string) {
    return this.coachService.getQuickPrompts(this.requireUserId(userId));
  }
}
