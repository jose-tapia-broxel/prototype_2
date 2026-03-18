import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the tenant organization ID from the request.
 * This value is set by the TenantInterceptor after JWT validation.
 *
 * @example
 *   @Get()
 *   list(@TenantId() orgId: string) {
 *     return this.service.findByOrg(orgId);
 *   }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);
