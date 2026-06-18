import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('epidiet/profile')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('epidiet/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Post()
  upsertProfile(@Headers('x-user-id') userId: string, @Body() dto: UpsertProfileDto) {
    return this.profileService.upsertProfile(this.requireUserId(userId), dto);
  }

  @Get('me')
  getProfile(@Headers('x-user-id') userId: string) {
    return this.profileService.getProfile(this.requireUserId(userId));
  }
}
