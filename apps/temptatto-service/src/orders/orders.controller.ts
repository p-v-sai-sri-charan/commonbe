import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiHeader({ name: 'x-user-id', required: true, description: 'Injected by gateway from JWT' })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private requireUserId(userId?: string): string {
    if (!userId) throw new BadRequestException('Missing x-user-id header');
    return userId;
  }

  @Post()
  createOrder(@Headers('x-user-id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(this.requireUserId(userId), dto);
  }

  @Get()
  getMyOrders(@Headers('x-user-id') userId: string) {
    return this.ordersService.getMyOrders(this.requireUserId(userId));
  }

  @Get(':id')
  getOrder(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.ordersService.getOrderById(id, this.requireUserId(userId));
  }

  @Post(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyPayment(id, this.requireUserId(userId), dto);
  }
}
