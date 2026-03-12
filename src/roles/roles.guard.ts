import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { UserRequest } from 'src/user/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<UserRequest>();
    const userRole = request.user?.role;

    if (!userRole) {
      throw new UnauthorizedException('User role not found in token');
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    return true;
  }
}
