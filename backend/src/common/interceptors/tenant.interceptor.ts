import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * TenantInterceptor — CRITICAL SECURITY LAYER
 *
 * 1. Reads `request.user` (set by JwtAuthGuard / Passport).
 * 2. Extracts `organizationId` and stamps it onto the request.
 * 3. If the route has an `:orgId` param, it validates the user belongs to that org.
 *
 * Every protected controller receives `request.organizationId` automatically.
 * Services should always read org context from the request — never trust the body.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user?.organizationId) {
      throw new ForbiddenException('Missing tenant context');
    }

    // Stamp the canonical org id onto the request for downstream use.
    request.organizationId = user.organizationId;

    // If the route contains :orgId, enforce it matches the token.
    const routeOrgId: string | undefined = request.params?.orgId;
    if (routeOrgId && routeOrgId !== user.organizationId) {
      this.logger.warn(
        `Tenant mismatch: user org=${user.organizationId} tried to access org=${routeOrgId}`,
      );
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return next.handle();
  }
}
