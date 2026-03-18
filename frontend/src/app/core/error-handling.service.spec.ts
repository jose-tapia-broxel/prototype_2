import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlingService, ErrorNotification } from './error-handling.service';

/**
 * Error Handling Service Tests
 * 
 * Tests error handling, notification management, and user feedback
 */
describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlingService],
    });
    service = TestBed.inject(ErrorHandlingService);
  });

  afterEach(() => {
    service.clearNotifications();
  });

  // ─────────────────────────────────────────────────────────────
  // HTTP ERROR HANDLING
  // ─────────────────────────────────────────────────────────────

  describe('HTTP Error Handling', () => {
    it('should handle client-side network error', () => {
      const error = new HttpErrorResponse({
        error: new ErrorEvent('Network error', { message: 'Connection failed' }),
        status: 0,
        statusText: 'Unknown Error',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(0);
      expect(apiError.message).toContain('network');
      expect(service.lastError()).toEqual(apiError);
    });

    it('should handle 400 Bad Request with validation errors', () => {
      const error = new HttpErrorResponse({
        error: {
          message: 'Validation failed',
          error: 'Bad Request',
          details: ['Name is required', 'Email is invalid'],
        },
        status: 400,
        statusText: 'Bad Request',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toBe('Validation failed');
      expect(apiError.details).toEqual(['Name is required', 'Email is invalid']);
    });

    it('should handle 401 Unauthorized', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Invalid token' },
        status: 401,
        statusText: 'Unauthorized',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(401);
      expect(apiError.error).toBe('Unauthorized');
    });

    it('should handle 403 Forbidden', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Access denied' },
        status: 403,
        statusText: 'Forbidden',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(403);
    });

    it('should handle 404 Not Found', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Workflow not found' },
        status: 404,
        statusText: 'Not Found',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(404);
      expect(apiError.message).toBe('Workflow not found');
    });

    it('should handle 409 Conflict', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Resource was modified by another user' },
        status: 409,
        statusText: 'Conflict',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(409);
    });

    it('should handle 422 Unprocessable Entity', () => {
      const error = new HttpErrorResponse({
        error: {
          message: 'Cannot process request',
          details: ['Invalid workflow state'],
        },
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(422);
    });

    it('should handle 429 Too Many Requests', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Rate limit exceeded' },
        status: 429,
        statusText: 'Too Many Requests',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(429);
    });

    it('should handle 500 Internal Server Error', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(500);
    });

    it('should handle 502 Bad Gateway', () => {
      const error = new HttpErrorResponse({
        error: null,
        status: 502,
        statusText: 'Bad Gateway',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(502);
    });

    it('should handle 503 Service Unavailable', () => {
      const error = new HttpErrorResponse({
        error: null,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(503);
    });

    it('should handle plain text error response', () => {
      const error = new HttpErrorResponse({
        error: 'Something went wrong',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(500);
      expect(apiError.error).toBe('Internal Server Error');
    });

    it('should add notification when handling HTTP error', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Server error' },
        status: 500,
        statusText: 'Internal Server Error',
      });

      service.handleHttpError(error);

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('error');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GENERIC ERROR HANDLING
  // ─────────────────────────────────────────────────────────────

  describe('Generic Error Handling', () => {
    it('should handle Error instance', () => {
      const error = new Error('Something went wrong');

      service.handleError(error, 'TestContext');

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe('Something went wrong');
      expect(notifications[0].title).toContain('TestContext');
    });

    it('should handle string error', () => {
      service.handleError('String error');

      const notifications = service.notifications();
      expect(notifications[0].message).toBe('An unexpected error occurred');
    });

    it('should handle null/undefined error', () => {
      service.handleError(null);

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
    });

    it('should handle object error without message', () => {
      service.handleError({ code: 'ERR001' });

      const notifications = service.notifications();
      expect(notifications[0].message).toBe('An unexpected error occurred');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  describe('Notification Management', () => {
    it('should add error notification', () => {
      const error = new HttpErrorResponse({
        error: { message: 'Error 1' },
        status: 500,
        statusText: 'Error',
      });

      service.handleHttpError(error);

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].type).toBe('error');
    });

    it('should add warning notification', () => {
      service.addWarning('Warning Title', 'Warning message');

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].title).toBe('Warning Title');
    });

    it('should add info notification', () => {
      service.addInfo('Info Title', 'Info message');

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('info');
    });

    it('should dismiss notification by id', () => {
      service.addWarning('Test', 'Test message');
      const id = service.notifications()[0].id;

      service.dismissNotification(id);

      expect(service.notifications()[0].dismissed).toBe(true);
    });

    it('should get only active (non-dismissed) notifications', () => {
      service.addWarning('Warning 1', 'Message 1');
      service.addWarning('Warning 2', 'Message 2');
      const id = service.notifications()[0].id;
      service.dismissNotification(id);

      const active = service.getActiveNotifications();

      expect(active.length).toBe(1);
      expect(active[0].title).toBe('Warning 1');
    });

    it('should clear all notifications', () => {
      service.addWarning('Warning', 'Message');
      service.addInfo('Info', 'Message');

      service.clearNotifications();

      expect(service.notifications().length).toBe(0);
    });

    it('should limit notifications to 10', () => {
      for (let i = 0; i < 15; i++) {
        service.addWarning(`Warning ${i}`, `Message ${i}`);
      }

      expect(service.notifications().length).toBe(10);
    });

    it('should add new notifications at the beginning', () => {
      service.addWarning('First', 'First message');
      service.addWarning('Second', 'Second message');

      expect(service.notifications()[0].title).toBe('Second');
      expect(service.notifications()[1].title).toBe('First');
    });

    it('should auto-dismiss info notifications after timeout', fakeAsync(() => {
      service.addInfo('Auto Dismiss', 'Will be dismissed');
      const id = service.notifications()[0].id;

      expect(service.notifications()[0].dismissed).toBe(false);

      tick(5001);

      expect(service.notifications().find(n => n.id === id)?.dismissed).toBe(true);
    }));

    it('should auto-dismiss warning notifications after timeout', fakeAsync(() => {
      service.addWarning('Auto Dismiss', 'Will be dismissed');
      const id = service.notifications()[0].id;

      tick(5001);

      expect(service.notifications().find(n => n.id === id)?.dismissed).toBe(true);
    }));

    it('should NOT auto-dismiss error notifications', fakeAsync(() => {
      const error = new HttpErrorResponse({
        error: { message: 'Error' },
        status: 500,
        statusText: 'Error',
      });
      service.handleHttpError(error);
      const id = service.notifications()[0].id;

      tick(10000);

      expect(service.notifications().find(n => n.id === id)?.dismissed).toBe(false);
    }));

    it('should include timestamp in notification', () => {
      const before = new Date();
      service.addWarning('Test', 'Message');
      const after = new Date();

      const notification = service.notifications()[0];
      expect(notification.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(notification.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should generate unique ids for notifications', () => {
      service.addWarning('First', 'Message');
      service.addWarning('Second', 'Message');
      service.addWarning('Third', 'Message');

      const ids = service.notifications().map(n => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty error message', () => {
      const error = new HttpErrorResponse({
        error: { message: '' },
        status: 500,
        statusText: 'Internal Server Error',
      });

      const apiError = service.handleHttpError(error);

      expect(apiError.statusCode).toBe(500);
    });

    it('should handle dismissing non-existent notification', () => {
      service.addWarning('Test', 'Message');

      // Should not throw
      service.dismissNotification('non-existent-id');

      expect(service.notifications().length).toBe(1);
    });

    it('should handle multiple rapid errors', () => {
      for (let i = 0; i < 5; i++) {
        service.handleHttpError(
          new HttpErrorResponse({
            error: { message: `Error ${i}` },
            status: 500,
            statusText: 'Error',
          })
        );
      }

      expect(service.notifications().length).toBe(5);
    });

    it('should track lastError correctly', () => {
      const error1 = new HttpErrorResponse({
        error: { message: 'First' },
        status: 400,
        statusText: 'Bad Request',
      });
      const error2 = new HttpErrorResponse({
        error: { message: 'Second' },
        status: 500,
        statusText: 'Internal Server Error',
      });

      service.handleHttpError(error1);
      expect(service.lastError()?.message).toBe('First');

      service.handleHttpError(error2);
      expect(service.lastError()?.message).toBe('Second');
    });
  });
});
