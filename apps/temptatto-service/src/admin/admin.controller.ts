import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateAdminConfigDto } from './dto/update-admin-config.dto';
import { UpdateOrderFulfillmentDto } from './dto/update-order-fulfillment.dto';

@ApiTags('admin')
@ApiHeader({ name: 'x-user-id', required: false })
@ApiHeader({ name: 'x-user-roles', required: false, description: 'Injected by gateway — must include "admin" for write routes' })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @UseGuards(AdminGuard)
  @Patch('config')
  updateConfig(@Body() dto: UpdateAdminConfigDto) {
    return this.adminService.updateConfig(dto);
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  @UseGuards(AdminGuard)
  @Get('orders')
  getOrders(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getAllOrders(Number(page), Number(limit));
  }

  @UseGuards(AdminGuard)
  @Patch('orders/:id/fulfillment')
  updateFulfillment(@Param('id') id: string, @Body() dto: UpdateOrderFulfillmentDto) {
    return this.adminService.updateOrderFulfillment(id, dto.fulfillmentStatus, dto.trackingNumber);
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  @UseGuards(AdminGuard)
  @Get('categories')
  getAllCategories() {
    return this.categoriesService.findAllAdmin();
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
