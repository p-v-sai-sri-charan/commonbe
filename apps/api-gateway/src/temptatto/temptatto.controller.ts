import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiExcludeController } from '@nestjs/swagger';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Wildcard proxy for all /temptatto/* routes. temptatto-service owns categories,
 * products, designs, marketplace, store, cart, orders, admin, and uploads —
 * mirroring each route here would be fragile. Forward method/path/body as-is and
 * attach x-user-id from the validated JWT.
 *
 * Public routes (marketplace browse, product/category listing) still pass through
 * here so the gateway can attach the user id when present.
 */
@ApiExcludeController()
@Controller('temptatto')
@UseGuards(JwtAuthGuard)
export class TemptattoController {
  private readonly temptattoServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.temptattoServiceUrl = this.configService.get<string>('TEMPTATTO_SERVICE_URL', 'http://localhost:3007');
  }

  @All('*')
  async proxy(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const targetUrl = `${this.temptattoServiceUrl}${req.originalUrl}`;

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
        .json(axiosError.response?.data ?? { message: 'temptatto-service request failed' });
    }
  }
}
