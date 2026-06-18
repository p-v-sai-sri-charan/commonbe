import { Body, Controller, Delete, Get, Headers, Patch, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreatorService } from './creator.service';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { SetByokDto } from './dto/byok.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';

@ApiTags('creator')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('creator')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  @Post('register')
  register(@Headers('x-user-id') userId: string, @Body() dto: CreateCreatorProfileDto) {
    return this.creatorService.register(userId, dto);
  }

  @Get('me')
  getMyProfile(@Headers('x-user-id') userId: string) {
    return this.creatorService.getByUserId(userId);
  }

  @Patch('me')
  update(@Headers('x-user-id') userId: string, @Body() dto: UpdateCreatorProfileDto) {
    return this.creatorService.update(userId, dto);
  }

  @Post('me/byok')
  setByok(@Headers('x-user-id') userId: string, @Body() dto: SetByokDto) {
    return this.creatorService.setByok(userId, dto);
  }

  @Delete('me/byok')
  removeByok(@Headers('x-user-id') userId: string) {
    return this.creatorService.removeByok(userId);
  }

  @Post('me/payout')
  createPayoutRequest(@Headers('x-user-id') userId: string, @Body() dto: CreatePayoutRequestDto) {
    return this.creatorService.createPayoutRequest(userId, dto);
  }

  @Get('me/payouts')
  getMyPayouts(@Headers('x-user-id') userId: string) {
    return this.creatorService.getMyPayoutRequests(userId);
  }
}
