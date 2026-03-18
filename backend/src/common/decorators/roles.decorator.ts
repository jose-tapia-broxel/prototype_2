import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator that declares which roles are allowed on a handler or controller.
 * Used together with RolesGuard.
 *
 * @example
 *   @Roles('owner', 'admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Post()
 *   create() { ... }
 */
export const Roles = (...roles: Array<'owner' | 'admin' | 'editor' | 'viewer'>) =>
  SetMetadata(ROLES_KEY, roles);
