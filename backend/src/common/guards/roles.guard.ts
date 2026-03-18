import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enforces role-based access.
 *
 * Usage:
 *   @Roles('owner', 'admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Role hierarchy (highest → lowest): owner > admin > editor > viewer
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private static readonly HIERARCHY: Record<string, number> = {
    owner: 40,
    admin: 30,
    editor: 20,
    viewer: 10,
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userLevel = RolesGuard.HIERARCHY[user.role] ?? 0;
    const minRequired = Math.min(
      ...requiredRoles.map((r) => RolesGuard.HIERARCHY[r] ?? 100),
    );

    if (userLevel < minRequired) {
      throw new ForbiddenException(
        `Role '${user.role}' does not meet the minimum required role`,
      );
    }

    return true;
  }
}
