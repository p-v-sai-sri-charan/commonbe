import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { DesignsService } from '../designs/designs.service';
import { TakedownDesignDto } from '../reports/dto/takedown-design.dto';
import { UpdateReportStatusDto } from '../reports/dto/update-report-status.dto';
import { ReportsService } from '../reports/reports.service';
import { ReviewsService } from '../reviews/reviews.service';
import { OrdersService } from '../orders/orders.service';
import { PodCatalogService } from '../printondemand/pod-catalog.service';
import { AdminService } from './admin.service';
import { EnablePodStyleDto } from './dto/enable-pod-style.dto';
import { SetOrderCategoryDto } from './dto/set-order-category.dto';
import { UpdateAdminConfigDto } from './dto/update-admin-config.dto';
import { UpdateOrderFulfillmentDto } from './dto/update-order-fulfillment.dto';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@ApiTags('admin')
@ApiHeader({ name: 'x-user-id', required: true })
@ApiHeader({ name: 'x-user-roles', required: true, description: 'Injected by gateway — must include "admin"' })
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reviewsService: ReviewsService,
    private readonly reportsService: ReportsService,
    private readonly designsService: DesignsService,
    private readonly ordersService: OrdersService,
    private readonly podCatalogService: PodCatalogService,
  ) {}

  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateAdminConfigDto) {
    return this.adminService.updateConfig(dto);
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  @Get('orders')
  getOrders(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getAllOrders(Number(page), Number(limit));
  }

  @Patch('orders/:id/fulfillment')
  updateFulfillment(@Param('id') id: string, @Body() dto: UpdateOrderFulfillmentDto) {
    return this.adminService.updateOrderFulfillment(id, dto.fulfillmentStatus, dto.trackingNumber);
  }

  /**
   * Categorize a paid order: inhouse/custom → NimbusPost shipment,
   * print_on_demand → creates the Qikink order automatically.
   */
  @Patch('orders/:id/category')
  setOrderCategory(@Param('id') id: string, @Body() dto: SetOrderCategoryDto) {
    return this.ordersService.setOrderCategory(id, dto.orderType);
  }

  /** Refresh POD order status (and AWB/tracking link once shipped) from the provider. */
  @Post('orders/:id/pod-sync')
  syncPodStatus(@Param('id') id: string) {
    return this.ordersService.syncPodStatus(id);
  }

  // ── Print-on-demand catalog (Qikink garment styles) ──────────────────────────

  /** All enable-able Qikink garment styles, with enabled/product state per style. */
  @Get('pod-catalog')
  getPodCatalog() {
    return this.podCatalogService.list();
  }

  /** Enable a style: creates (or reactivates) a Product fully wired for Qikink POD. */
  @Post('pod-catalog/:styleKey/enable')
  enablePodStyle(@Param('styleKey') styleKey: string, @Body() dto: EnablePodStyleDto) {
    return this.podCatalogService.enable(styleKey, dto);
  }

  /** Disable a style: hides its Product from the shop/studio (isActive=false). */
  @Post('pod-catalog/:styleKey/disable')
  disablePodStyle(@Param('styleKey') styleKey: string) {
    return this.podCatalogService.disable(styleKey);
  }

  // ── Payouts ──────────────────────────────────────────────────────────────────

  @Get('payouts')
  getPayouts(@Query('status') status?: string) {
    return this.adminService.getPayoutRequests(status);
  }

  @Patch('payouts/:id')
  updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutStatusDto) {
    return this.adminService.updatePayoutRequest(id, dto.status, dto.adminNote);
  }

  // ── Reviews moderation ───────────────────────────────────────────────────────

  @Get('reviews')
  getReviews(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.reviewsService.adminList(Number(page), Number(limit));
  }

  @Delete('reviews/:id')
  removeReview(@Param('id') id: string) {
    return this.reviewsService.adminRemove(id);
  }

  // ── Reports & takedown ───────────────────────────────────────────────────────

  @Get('reports')
  getReports(
    @Query('status') status?: 'open' | 'resolved' | 'dismissed',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.reportsService.adminList(status, Number(page), Number(limit));
  }

  @Patch('reports/:id')
  updateReportStatus(@Param('id') id: string, @Body() dto: UpdateReportStatusDto) {
    return this.reportsService.adminUpdateStatus(id, dto.status);
  }

  @Post('designs/:id/takedown')
  async takedownDesign(@Param('id') id: string, @Body() dto: TakedownDesignDto) {
    const design = await this.designsService.adminTakedown(id, dto.reason);
    await this.reportsService.resolveAllForDesign(id);
    return design;
  }

  @Post('designs/:id/restore')
  restoreDesign(@Param('id') id: string) {
    return this.designsService.adminRestore(id);
  }
}
