import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

// Default org ID for development (should come from environment in production)
const DEFAULT_ORG_ID = 'default-org-id';

/**
 * Organization ID Header Interceptor
 * Phase 5: Frontend Core - Multi-tenant org_id headers
 * 
 * Automatically adds X-Organization-Id header to all API requests
 * for multi-tenant data isolation.
 */
export const orgIdInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Only add header for API calls
  if (!req.url.startsWith('/api') && !req.url.includes('/api/')) {
    return next(req);
  }

  // Try to get org ID from auth service, fallback to default
  let orgId: string | null = null;
  
  try {
    const authService = inject(AuthService);
    // Use tenantId from auth service user
    orgId = authService.user()?.tenantId || null;
  } catch {
    // AuthService might not be available during initialization
  }

  // Use default org ID if not authenticated
  if (!orgId) {
    orgId = DEFAULT_ORG_ID;
  }

  // If we still don't have an org ID, proceed without the header
  if (!orgId) {
    return next(req);
  }

  // Clone the request and add the organization header
  const clonedRequest = req.clone({
    setHeaders: {
      'X-Organization-Id': orgId
    }
  });

  return next(clonedRequest);
};
