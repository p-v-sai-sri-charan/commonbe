import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Generic wildcard proxy for every /epidiet/* route. epidiet-service owns
 * ~9 sub-resources (profile, quiz, assessment, foods, meal-plans, progress,
 * education, baby-plan, coach) — mirroring each one-by-one here would just
 * be boilerplate that drifts out of sync. Instead, forward the method/path/
 * body as-is and attach x-user-id from the validated JWT.
 *
 * For exact request/response schemas per route, see epidiet-service's own
 * Swagger UI (EPIDIET_SERVICE_URL + /docs).
 */
@ApiExcludeController()
@ApiBearerAuth('access-token')
@Controller('epidiet')
@UseGuards(JwtAuthGuard)
export class EpidietController {
  private readonly epidietServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.epidietServiceUrl = this.configService.get<string>('EPIDIET_SERVICE_URL', 'http://localhost:3005');
  }

  @All('*')
  async proxy(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const targetUrl = `${this.epidietServiceUrl}${req.originalUrl}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method as Method,
          url: targetUrl,
          data: req.body,
          headers: { 'x-user-id': req.user!.sub },
        }),
      );
      res.status(response.status).json(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      res
        .status(axiosError.response?.status ?? 502)
        .json(axiosError.response?.data ?? { message: 'epidiet-service request failed' });
    }
  }
}
