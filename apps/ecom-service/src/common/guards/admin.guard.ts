import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rolesHeader = request.headers['x-user-roles'] as string | undefined;
    const roles = rolesHeader ? rolesHeader.split(',').map((r) => r.trim()) : [];
    if (!roles.includes('admin')) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
