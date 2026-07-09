import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

/**
 * Payment-provider webhooks. Deliberately OUTSIDE the RequireUserGuard'd
 * OrdersController — Razorpay calls this server-to-server with no user context.
 * Authenticity is proven by the HMAC signature, verified in the service.
 *
 * Razorpay dashboard setup: Webhooks → URL
 * https://<gateway-host>/ecom/webhooks/razorpay, secret = RAZORPAY_WEBHOOK_SECRET,
 * events: payment.captured, payment.failed.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('razorpay')
  handleRazorpay(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    return this.ordersService.handleRazorpayWebhook(body, signature);
  }
}
