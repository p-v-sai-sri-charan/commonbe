import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Wildcard proxy for all /ecom/* routes. ecom-service owns products, designs,
 * marketplace, creator, ai-generation, ai-credits, cart, and orders — mirroring
 * each route here would be fragile. Forward method/path/body as-is and attach
 * x-user-id from the validated JWT.
 *
 * Public routes (marketplace browse, product listing) still pass through here
 * so the gateway can attach the user id when present. JwtAuthGuard is applied —
 * make any public ecom endpoints guard-optional on the ecom-service side if needed.
 */
@ApiExcludeController()
@Controller('ecom')
@UseGuards(JwtAuthGuard)
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
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method as Method,
          url: targetUrl,
          data: req.body,
          headers: {
            'x-user-id': req.user!.sub,
            'x-user-roles': (req.user!.roles ?? []).join(','),
          },
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
