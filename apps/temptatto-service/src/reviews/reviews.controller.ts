import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiHeader({ name: 'x-user-id', required: false, description: 'Injected by gateway from JWT; required for write routes' })
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  @Post()
  create(@Headers('x-user-id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(this.requireUserId(userId), dto);
  }

  @Get('my')
  mine(@Headers('x-user-id') userId: string) {
    return this.reviewsService.listMine(this.requireUserId(userId));
  }

  /** Public — anyone can read a design's reviews. */
  @Get('design/:designId')
  byDesign(
    @Param('designId') designId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.listByDesign(designId, Number(page) || 1, Number(limit) || 20);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.reviewsService.remove(id, this.requireUserId(userId));
  }
}
