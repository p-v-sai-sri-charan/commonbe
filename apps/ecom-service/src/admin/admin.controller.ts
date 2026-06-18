import { Body, Controller, Get, Headers, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateAdminConfigDto } from './dto/update-admin-config.dto';
import { UpdateOrderFulfillmentDto } from './dto/update-order-fulfillment.dto';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@ApiTags('admin')
@ApiHeader({ name: 'x-user-id', required: true })
@ApiHeader({ name: 'x-user-roles', required: true, description: 'Injected by gateway — must include "admin"' })
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  // ── Payouts ──────────────────────────────────────────────────────────────────

  @Get('payouts')
  getPayouts(@Query('status') status?: string) {
    return this.adminService.getPayoutRequests(status);
  }

  @Patch('payouts/:id')
  updatePayout(@Param('id') id: string, @Body() dto: UpdatePayoutStatusDto) {
    return this.adminService.updatePayoutRequest(id, dto.status, dto.adminNote);
  }
}
