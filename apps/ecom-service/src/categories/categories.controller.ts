import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

/**
 * Admin-managed product categories (T-Shirt, Hoodie, Jewelry, Jeans, …) — the
 * dropdown source for the admin "New Product" form's Category field. Distinct
 * from Product.garmentType, which drives POD/3D behavior; a category is just
 * a shop-facing label + filter value (Product.category).
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list();
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto.name);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  /** Bulk-adds any Qikink garment type not already present as a category. */
  @UseGuards(AdminGuard)
  @Post('seed-qikink')
  seedFromQikink() {
    return this.categoriesService.seedFromQikink();
  }
}
