import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) return true;

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (err: unknown) {
      // Invalid/expired token on an optional route: proceed anonymously.
      // Log so mismatched JWT_SECRET or clock-skew issues are visible in gateway logs.
      this.logger.warn(`JWT verification failed — proceeding anonymously: ${(err as Error).message}`);
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
