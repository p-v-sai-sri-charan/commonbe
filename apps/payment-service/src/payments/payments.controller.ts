import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSubscriptionOrderDto } from './dto/create-subscription-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { VerifySubscriptionDto } from './dto/verify-subscription.dto';
import { PaymentsService } from './payments.service';
import { SubscriptionPaymentService } from './subscription-payment.service';

@ApiTags('payments')
@ApiHeader({ name: 'x-user-id', description: 'Set by api-gateway after validating the JWT', required: true })
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header');
    }
    return userId;
  }

  @Get('providers')
  listProviders() {
    return this.paymentsService.listProviders();
  }

  @Post('orders')
  createOrder(@Headers('x-user-id') userId: string, @Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(this.requireUserId(userId), dto);
  }

  @Post('verify')
  verifyPayment(@Headers('x-user-id') userId: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(this.requireUserId(userId), dto);
  }

  // ── Subscription endpoints ──────────────────────────────────────────────────

  /** Create a Razorpay order for a subscription plan. Returns order details for the Razorpay checkout SDK. */
  @Post('subscriptions/create')
  createSubscriptionOrder(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateSubscriptionOrderDto,
  ) {
    return this.subscriptionPaymentService.createSubscriptionOrder(
      this.requireUserId(userId),
      dto,
    );
  }

  /** Verify payment signature and activate the subscription on user-service. */
  @Post('subscriptions/verify')
  verifySubscriptionPayment(
    @Headers('x-user-id') userId: string,
    @Body() dto: VerifySubscriptionDto,
  ) {
    return this.subscriptionPaymentService.verifySubscriptionPayment(
      this.requireUserId(userId),
      dto,
    );
  }
}
