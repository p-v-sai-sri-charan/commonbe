import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Public auth routes. These simply proxy to auth-service over HTTP — no
 * JWT is required here since the caller doesn't have one yet.
 *
 * Request/response bodies are intentionally untyped (`unknown`) here — this
 * is a thin proxy. For exact request/response schemas see auth-service's
 * own Swagger UI (AUTH_SERVICE_URL + /docs), which owns these DTOs.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');
  }

  private async forward(path: string, body: unknown) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}${path}`, body),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data ?? 'auth-service request failed',
        axiosError.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // Tight override vs. the module-wide default (see app.module.ts): max 5
  // OTP requests per 60s per IP. @Throttle metadata is static (evaluated at
  // class-definition time), so this can't read ConfigService — if you need
  // it env-driven, pass a (context) => number resolver here instead of a
  // literal and read process.env directly inside it.
  @Post('otp/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestOtp(@Body() body: unknown) {
    return this.forward('/auth/otp/request', body);
  }

  @Post('otp/verify')
  verifyOtp(@Body() body: unknown) {
    return this.forward('/auth/otp/verify', body);
  }

  @Post('google')
  googleLogin(@Body() body: unknown) {
    return this.forward('/auth/google', body);
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.forward('/auth/refresh', body);
  }

  @Post('logout')
  logout(@Body() body: unknown) {
    return this.forward('/auth/logout', body);
  }
}
