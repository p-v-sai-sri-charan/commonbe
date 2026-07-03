import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { DesignsService } from './designs.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { PublishDesignDto } from './dto/publish-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';

const DEFAULT_COMMISSION_RATE = 25;

@ApiTags('designs')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  @Post()
  create(@Headers('x-user-id') userId: string, @Body() dto: CreateDesignDto) {
    return this.designsService.create(this.requireUserId(userId), dto, DEFAULT_COMMISSION_RATE);
  }

  @Get('my')
  findMine(@Headers('x-user-id') userId: string) {
    return this.designsService.findAllByUser(this.requireUserId(userId));
  }

  @Get('by-product/:productId')
  byProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.designsService.findPublishedByProduct(productId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId?: string) {
    return this.designsService.findByIdForView(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Headers('x-user-id') userId: string, @Body() dto: UpdateDesignDto) {
    return this.designsService.update(id, this.requireUserId(userId), dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Headers('x-user-id') userId: string, @Body() dto: PublishDesignDto) {
    return this.designsService.publish(id, this.requireUserId(userId), dto);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.designsService.unpublish(id, this.requireUserId(userId));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.designsService.remove(id, this.requireUserId(userId));
  }
}
