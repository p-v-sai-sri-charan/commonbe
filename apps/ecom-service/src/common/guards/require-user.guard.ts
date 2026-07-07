import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Rejects requests that arrived without a gateway-injected x-user-id.
 * Needed because the gateway's /ecom/* proxy uses OptionalJwtAuthGuard —
 * anonymous requests pass through, so user-owned resources must enforce
 * authentication here rather than trusting every request to carry a user.
 */
@Injectable()
export class RequireUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Login required');
    }
    return true;
  }
}
