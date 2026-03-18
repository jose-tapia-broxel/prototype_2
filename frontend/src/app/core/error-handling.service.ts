import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../models/api.model';

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string[];
  timestamp: Date;
  dismissed: boolean;
}

/**
 * Error Handling Service
 * Phase 5: Frontend Core - Centralized error handling
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  // Error notifications for UI display
  notifications = signal<ErrorNotification[]>([]);
  
  // Last error for debugging
  lastError = signal<ApiError | null>(null);

  /**
   * Handle HTTP errors and return user-friendly messages
   */
  handleHttpError(error: HttpErrorResponse): ApiError {
    let apiError: ApiError;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      apiError = {
        statusCode: 0,
        message: 'A network error occurred. Please check your connection.',
        error: 'Network Error'
      };
    } else {
      // Server-side error
      apiError = this.parseServerError(error);
    }

    this.lastError.set(apiError);
    this.addNotification('error', this.getErrorTitle(apiError.statusCode), apiError.message);

    return apiError;
  }

  /**
   * Handle generic errors
   */
  handleError(error: unknown, context?: string): void {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    const title = context ? `Error in ${context}` : 'Error';
    
    this.addNotification('error', title, message);
    
    console.error(`[ErrorHandlingService] ${title}:`, error);
  }

  /**
   * Add warning notification
   */
  addWarning(title: string, message: string): void {
    this.addNotification('warning', title, message);
  }

  /**
   * Add info notification
   */
  addInfo(title: string, message: string): void {
    this.addNotification('info', title, message);
  }

  /**
   * Dismiss a notification
   */
  dismissNotification(id: string): void {
    this.notifications.update(notifications =>
      notifications.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.set([]);
  }

  /**
   * Get active (non-dismissed) notifications
   */
  getActiveNotifications(): ErrorNotification[] {
    return this.notifications().filter(n => !n.dismissed);
  }

  private addNotification(
    type: 'error' | 'warning' | 'info',
    title: string,
    message: string,
    details?: string[]
  ): void {
    const notification: ErrorNotification = {
      id: this.generateId(),
      type,
      title,
      message,
      details,
      timestamp: new Date(),
      dismissed: false
    };

    this.notifications.update(notifications => [notification, ...notifications].slice(0, 10));

    // Auto-dismiss info and warning after 5 seconds
    if (type !== 'error') {
      setTimeout(() => this.dismissNotification(notification.id), 5000);
    }
  }

  private parseServerError(error: HttpErrorResponse): ApiError {
    // Try to parse as ApiError format from backend
    if (error.error && typeof error.error === 'object') {
      return {
        statusCode: error.status,
        message: error.error.message || this.getDefaultMessage(error.status),
        error: error.error.error || error.statusText,
        details: error.error.details
      };
    }

    return {
      statusCode: error.status,
      message: this.getDefaultMessage(error.status),
      error: error.statusText
    };
  }

  private getErrorTitle(statusCode: number): string {
    switch (statusCode) {
      case 0:
        return 'Connection Error';
      case 400:
        return 'Invalid Request';
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Validation Error';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Server Error';
      case 502:
      case 503:
      case 504:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection.';
      case 400:
        return 'The request was invalid. Please check your input.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This operation conflicts with existing data.';
      case 422:
        return 'The submitted data failed validation.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 502:
        return 'The server is temporarily unavailable. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      case 504:
        return 'The server took too long to respond. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
