import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlingService } from '../error-handling.service';

/**
 * Error Handling Interceptor
 * Phase 5: Frontend Core - Centralized error handling
 * 
 * Intercepts all HTTP errors and routes them through ErrorHandlingService
 * for consistent error handling and user notifications.
 */
export const errorHandlingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const errorService = inject(ErrorHandlingService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't handle errors for non-API calls
      if (!req.url.startsWith('/api') && !req.url.includes('/api/')) {
        return throwError(() => error);
      }

      // Process the error and create user-friendly message
      const apiError = errorService.handleHttpError(error);

      // Re-throw the error for component-level handling if needed
      return throwError(() => apiError);
    })
  );
};
