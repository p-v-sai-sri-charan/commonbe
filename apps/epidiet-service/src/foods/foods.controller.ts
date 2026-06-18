import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FoodEpigeneticTag } from '../common/enums';
import { FoodsService } from './foods.service';

@ApiTags('epidiet/foods')
@Controller('epidiet/foods')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get()
  search(@Query('tags') tags?: string) {
    const tagList = tags?.split(',') as FoodEpigeneticTag[] | undefined;
    return this.foodsService.search(tagList);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.foodsService.findById(id);
  }
}
