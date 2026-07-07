import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequireUserGuard } from '../common/guards/require-user.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { OrdersService } from './orders.service';

class UpdateFulfillmentDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

@ApiTags('orders')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@UseGuards(RequireUserGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Headers('x-user-id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get()
  getMyOrders(@Headers('x-user-id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  /** Registered before ':id' — route order matters for the wildcard param. */
  @Get('delivery-estimate')
  getDeliveryEstimate(@Query('pincode') pincode: string) {
    if (!pincode || !/^[1-9]\d{5}$/.test(pincode)) {
      throw new BadRequestException('Provide a valid 6-digit pincode');
    }
    return this.ordersService.getDeliveryEstimate(pincode);
  }

  @Get(':id')
  getOrder(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.ordersService.getOrderById(id, userId);
  }

  @Post(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyPayment(id, userId, dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/fulfillment')
  updateFulfillment(@Param('id') id: string, @Body() dto: UpdateFulfillmentDto) {
    return this.ordersService.updateFulfillment(id, dto.status, dto.trackingNumber);
  }

  @UseGuards(AdminGuard)
  @Post(':id/refund')
  refund(@Param('id') id: string) {
    return this.ordersService.adminRefund(id);
  }
}
