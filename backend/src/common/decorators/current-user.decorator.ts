import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @example
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthenticatedUser) {
 *     return user;
 *   }
 *
 *   // Extract a single property:
 *   @Get('org')
 *   getOrg(@CurrentUser('organizationId') orgId: string) {
 *     return orgId;
 *   }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    return data ? user?.[data] : user;
  },
);
