import { DomainEvent, createDomainEvent } from './domain-event.interface';

// ─────────────────────────────────────────────────────────────
// USER ACTION EVENTS
// ─────────────────────────────────────────────────────────────

export const USER_LOGIN_EVENT = 'user.login';
export const USER_LOGOUT_EVENT = 'user.logout';
export const USER_ACTION_EVENT = 'user.action';

export interface UserLoginEvent extends DomainEvent {
  eventName: typeof USER_LOGIN_EVENT;
  eventCategory: 'user_action';
  metadata: {
    userId: string;
    email: string;
    loginMethod: 'password' | 'sso' | 'token';
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface UserLogoutEvent extends DomainEvent {
  eventName: typeof USER_LOGOUT_EVENT;
  eventCategory: 'user_action';
  metadata: {
    userId: string;
    email: string;
    sessionDurationMs?: number;
  };
}

export interface UserActionEvent extends DomainEvent {
  eventName: typeof USER_ACTION_EVENT;
  eventCategory: 'user_action';
  metadata: {
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────────────────────
// SYSTEM EVENTS
// ─────────────────────────────────────────────────────────────

export const SYSTEM_STARTUP_EVENT = 'system.startup';
export const SYSTEM_SHUTDOWN_EVENT = 'system.shutdown';
export const SYSTEM_HEALTH_CHECK_EVENT = 'system.health_check';
export const SYSTEM_CONFIG_CHANGED_EVENT = 'system.config.changed';

export interface SystemStartupEvent extends DomainEvent {
  eventName: typeof SYSTEM_STARTUP_EVENT;
  eventCategory: 'system';
  metadata: {
    version: string;
    environment: string;
    startupDurationMs: number;
  };
}

export interface SystemHealthCheckEvent extends DomainEvent {
  eventName: typeof SYSTEM_HEALTH_CHECK_EVENT;
  eventCategory: 'system';
  metadata: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      durationMs: number;
      message?: string;
    }>;
  };
}

export interface SystemConfigChangedEvent extends DomainEvent {
  eventName: typeof SYSTEM_CONFIG_CHANGED_EVENT;
  eventCategory: 'system';
  metadata: {
    configKey: string;
    previousValue?: unknown;
    newValue?: unknown;
    changedBy?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// ERROR EVENTS
// ─────────────────────────────────────────────────────────────

export const UNHANDLED_ERROR_EVENT = 'error.unhandled';

export interface UnhandledErrorEvent extends DomainEvent {
  eventName: typeof UNHANDLED_ERROR_EVENT;
  eventCategory: 'error';
  metadata: {
    errorMessage: string;
    errorStack?: string;
    errorCode?: string;
    context?: Record<string, unknown>;
    requestId?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────

export function createUserLoginEvent(
  organizationId: string,
  metadata: UserLoginEvent['metadata'],
): UserLoginEvent {
  return createDomainEvent({
    eventName: USER_LOGIN_EVENT,
    eventCategory: 'user_action',
    organizationId,
    actorId: metadata.userId,
    entityType: 'user',
    entityId: metadata.userId,
    metadata,
  }) as UserLoginEvent;
}

export function createUserActionEvent(
  organizationId: string,
  metadata: UserActionEvent['metadata'],
  actorId?: string,
): UserActionEvent {
  return createDomainEvent({
    eventName: USER_ACTION_EVENT,
    eventCategory: 'user_action',
    organizationId,
    actorId,
    entityType: metadata.resourceType,
    entityId: metadata.resourceId,
    metadata,
  }) as UserActionEvent;
}

export function createUnhandledErrorEvent(
  organizationId: string,
  metadata: UnhandledErrorEvent['metadata'],
  actorId?: string,
): UnhandledErrorEvent {
  return createDomainEvent({
    eventName: UNHANDLED_ERROR_EVENT,
    eventCategory: 'error',
    organizationId,
    actorId,
    metadata,
  }) as UnhandledErrorEvent;
}
