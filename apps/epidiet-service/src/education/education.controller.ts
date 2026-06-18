import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BiologicalSex } from '../common/enums';
import { EducationService } from './education.service';

@ApiTags('epidiet/education')
@Controller('epidiet/education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get()
  list(@Query('tag') tag?: string, @Query('gender') gender?: BiologicalSex) {
    return this.educationService.list(tag, gender);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.educationService.findBySlug(slug);
  }
}
