import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Protected payment routes. Same forward-with-x-user-id pattern as
 * users/users.controller.ts. See payment-service's own Swagger UI for
 * exact request/response schemas.
 */
@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly paymentServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.paymentServiceUrl = this.configService.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3004');
  }

  private async forward(method: 'get' | 'post', path: string, userId: string, body?: unknown) {
    try {
      const response = await firstValueFrom(
        method === 'post'
          ? this.httpService.post(`${this.paymentServiceUrl}${path}`, body, {
              headers: { 'x-user-id': userId },
            })
          : this.httpService.get(`${this.paymentServiceUrl}${path}`, {
              headers: { 'x-user-id': userId },
            }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data ?? 'payment-service request failed',
        axiosError.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('providers')
  listProviders(@Req() req: AuthenticatedRequest) {
    return this.forward('get', '/payments/providers', req.user!.sub);
  }

  @Post('orders')
  createOrder(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/payments/orders', req.user!.sub, body);
  }

  @Post('verify')
  verifyPayment(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/payments/verify', req.user!.sub, body);
  }

  // ── Subscription payment routes ──────────────────────────────────────────

  @Post('subscriptions/create')
  createSubscriptionOrder(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/payments/subscriptions/create', req.user!.sub, body);
  }

  @Post('subscriptions/verify')
  verifySubscriptionPayment(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/payments/subscriptions/verify', req.user!.sub, body);
  }
}
