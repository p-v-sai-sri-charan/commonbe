import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Protected user routes. JwtAuthGuard validates the access token and
 * attaches `request.user`; we then forward the authenticated user id to
 * user-service via the `x-user-id` header so user-service never has to
 * deal with JWTs at all.
 *
 * See user-service's own Swagger UI for exact request/response schemas.
 */
@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:3002');
  }

  private async forward(method: 'get' | 'post', path: string, userId: string, body?: unknown) {
    try {
      const response = await firstValueFrom(
        method === 'post'
          ? this.httpService.post(`${this.userServiceUrl}${path}`, body, {
              headers: { 'x-user-id': userId },
            })
          : this.httpService.get(`${this.userServiceUrl}${path}`, {
              headers: { 'x-user-id': userId },
            }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data ?? 'user-service request failed',
        axiosError.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('profile')
  createProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/users/profile', req.user!.sub, body);
  }

  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.forward('get', '/users/me', req.user!.sub);
  }

  // ── Subscription routes (proxied to user-service) ────────────────────────

  @Get('subscription/plans')
  listSubscriptionPlans(@Req() req: AuthenticatedRequest) {
    return this.forward('get', '/users/subscription/plans', req.user!.sub);
  }

  @Get('subscription/me')
  getMySubscription(@Req() req: AuthenticatedRequest) {
    return this.forward('get', '/users/subscription/me', req.user!.sub);
  }

  @Post('subscription/cancel')
  cancelSubscription(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/users/subscription/cancel', req.user!.sub, body);
  }

  @Post('subscription/couple/invite')
  sendCoupleInvite(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/users/subscription/couple/invite', req.user!.sub, body);
  }

  @Post('subscription/couple/accept')
  acceptCoupleInvite(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.forward('post', '/users/subscription/couple/accept', req.user!.sub, body);
  }
}
