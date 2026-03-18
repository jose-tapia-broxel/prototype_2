import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { Permission } from './models';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If the user is not authenticated, redirect to login
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Get the required permissions from the route data
  const requiredPermissions = route.data['requiredPermissions'] as Permission | Permission[];

  if (!requiredPermissions) {
    // If no permissions are required, allow access
    return true;
  }

  // Check if the user has the required permissions
  const hasAccess = authService.hasPermissions(requiredPermissions);

  if (hasAccess) {
    return true;
  } else {
    // If the user doesn't have access, redirect to an unauthorized page or dashboard
    console.warn(`Access denied to route ${route.url}. Missing permissions: ${requiredPermissions}`);
    return router.createUrlTree(['/unauthorized']); // Or /dashboard
  }
};
