import { BadRequestException, Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateStoreProfileDto } from './dto/create-store-profile.dto';
import { UpdateStoreProfileDto } from './dto/update-store-profile.dto';
import { StoreService } from './store.service';

@ApiTags('store')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  @Post('register')
  register(@Headers('x-user-id') userId: string, @Body() dto: CreateStoreProfileDto) {
    return this.storeService.register(this.requireUserId(userId), dto);
  }

  @Get('me')
  getMyStore(@Headers('x-user-id') userId: string) {
    return this.storeService.getByUserId(this.requireUserId(userId));
  }

  @Patch('me')
  update(@Headers('x-user-id') userId: string, @Body() dto: UpdateStoreProfileDto) {
    return this.storeService.update(this.requireUserId(userId), dto);
  }
}
