import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ConsumeAiTokensDto } from './dto/consume-ai-tokens.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      // This header is set by api-gateway after validating the JWT.
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Post('profile')
  createProfile(@Headers('x-user-id') userId: string, @Body() dto: CreateProfileDto) {
    return this.usersService.createProfile(this.requireUserId(userId), dto);
  }

  @Get('me')
  getProfile(@Headers('x-user-id') userId: string) {
    return this.usersService.getProfile(this.requireUserId(userId));
  }

  /** Internal, service-to-service only — not exposed through api-gateway. */
  @Post('internal/ai-tokens/consume')
  consumeAiTokens(@Headers('x-user-id') userId: string, @Body() dto: ConsumeAiTokensDto) {
    return this.usersService.consumeAiTokens(this.requireUserId(userId), dto.amount);
  }
}
