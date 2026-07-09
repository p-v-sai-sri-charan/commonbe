import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

/**
 * Wildcard proxy for all /ecom/* routes. ecom-service owns products, designs,
 * marketplace, creator, ai-generation, ai-credits, cart, and orders — mirroring
 * each route here would be fragile. Forward method/path/body as-is and attach
 * x-user-id from the validated JWT when one is present.
 *
 * Auth is optional at the gateway (same pattern as /temptatto/*): public routes
 * (marketplace browse, product listing, viewing a published design) work
 * logged-out. Routes that actually require a user reject on the ecom-service
 * side (missing x-user-id), which is where that enforcement belongs.
 */
@ApiExcludeController()
@Controller('ecom')
@UseGuards(OptionalJwtAuthGuard)
export class EcomController {
  private readonly ecomServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ecomServiceUrl = this.configService.get<string>('ECOM_SERVICE_URL', 'http://localhost:3006');
  }

  @All('*')
  async proxy(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const targetUrl = `${this.ecomServiceUrl}${req.originalUrl}`;

    try {
      const headers: Record<string, string> = {
        'content-type': (req.headers['content-type'] as string) ?? 'application/json',
      };
      // Razorpay webhook signature must survive the proxy hop
      if (req.headers['x-razorpay-signature']) {
        headers['x-razorpay-signature'] = req.headers['x-razorpay-signature'] as string;
      }
      if (req.user) {
        headers['x-user-id'] = req.user.sub;
        headers['x-user-roles'] = (req.user.roles ?? []).join(',');
      }

      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method as Method,
          url: targetUrl,
          data: req.body,
          headers,
        }),
      );
      res.status(response.status).json(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      res
        .status(axiosError.response?.status ?? 502)
        .json(axiosError.response?.data ?? { message: 'ecom-service request failed' });
    }
  }
}
