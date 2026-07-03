import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest, JwtPayload } from './jwt-auth.guard';

/**
 * Same token extraction/verification as JwtAuthGuard, but never throws:
 * attaches `request.user` when a valid Bearer token is present, otherwise
 * lets the request through anonymously. For proxy controllers that mix
 * public and user-gated routes behind one wildcard handler — the backing
 * service is responsible for rejecting requests that actually require a user.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) return true;

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      // Invalid/expired token on an optional route: proceed anonymously
      // rather than failing the request.
    }
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
