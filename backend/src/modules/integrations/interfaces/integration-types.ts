/**
 * Integration Types & Interfaces
 * Defines the contract for all integration node types
 */

// ─────────────────────────────────────────────────────────────
// INTEGRATION NODE TYPES
// ─────────────────────────────────────────────────────────────

export type IntegrationNodeType =
  | 'api_call'
  | 'webhook_listener'
  | 'cache_operation'
  | 'cdn_upload'
  | 'firebase_action'
  | 'browser_action'
  | 'custom_route'
  | 'transformation'
  | 'sdk_function';

// ─────────────────────────────────────────────────────────────
// BASE INTEGRATION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface BaseIntegrationConfig {
  integrationType: string;
  credentialId?: string;
  timeout?: number;
  errorHandling?: ErrorHandlingConfig;
  outputs?: Record<string, string>; // JSONPath mappings for response
}

export interface ErrorHandlingConfig {
  strategy: 'retry' | 'fail' | 'fallback' | 'ignore';
  maxRetries?: number;
  retryDelayMs?: number;
  fallbackValue?: unknown;
  onError?: 'log' | 'alert' | 'continue';
}

// ─────────────────────────────────────────────────────────────
// API CALL CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface ApiCallConfig extends BaseIntegrationConfig {
  integrationType: 'api_call';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown> | string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic' | 'oauth2';
  validateStatus?: number[];
}

// ─────────────────────────────────────────────────────────────
// WEBHOOK LISTENER CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface WebhookListenerConfig extends BaseIntegrationConfig {
  integrationType: 'webhook_listener';
  webhookId: string;
  expectedEventType?: string;
  signatureVerification?: {
    enabled: boolean;
    algorithm: 'hmac-sha256' | 'hmac-sha512';
    secretKey: string;
  };
}

// ─────────────────────────────────────────────────────────────
// CACHE OPERATION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface CacheOperationConfig extends BaseIntegrationConfig {
  integrationType: 'cache_operation';
  operation: 'read' | 'write' | 'invalidate' | 'exists';
  key: string;
  ttl?: number; // Seconds
  value?: unknown; // For write operations
  fallbackToSource?: {
    enabled: boolean;
    sourceNodeId?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// CDN UPLOAD CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface CdnUploadConfig extends BaseIntegrationConfig {
  integrationType: 'cdn_upload';
  provider: 'aws_s3' | 'gcs' | 'azure_blob' | 'cloudinary';
  source: string; // Reference to file in context
  destination: {
    bucket: string;
    path: string;
    makePublic: boolean;
  };
  options?: {
    compress?: boolean;
    generateThumbnail?: boolean;
    maxSizeBytes?: number;
    contentType?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// FIREBASE ACTION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface FirebaseActionConfig extends BaseIntegrationConfig {
  integrationType: 'firebase_action';
  action: 'firestore_read' | 'firestore_write' | 'auth_verify' | 'storage_upload';
  collection?: string;
  documentId?: string;
  data?: Record<string, unknown>;
  merge?: boolean; // For firestore_write
}

// ─────────────────────────────────────────────────────────────
// BROWSER ACTION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface BrowserActionConfig extends BaseIntegrationConfig {
  integrationType: 'browser_action';
  action:
    | 'set_cookie'
    | 'read_cookie'
    | 'delete_cookie'
    | 'set_local_storage'
    | 'read_local_storage'
    | 'track_analytics_event'
    | 'capture_geolocation'
    | 'request_notification_permission';
  params: Record<string, unknown>;
  waitForCompletion?: boolean;
}

// ─────────────────────────────────────────────────────────────
// TRANSFORMATION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface TransformationConfig extends BaseIntegrationConfig {
  integrationType: 'transformation';
  transformType: 'map' | 'filter' | 'aggregate' | 'format' | 'conditional';
  sourceField: string;
  targetField: string;
  transformation: unknown; // JSONata expression or template
}

// ─────────────────────────────────────────────────────────────
// SDK FUNCTION CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface SdkFunctionConfig extends BaseIntegrationConfig {
  integrationType: 'sdk_function';
  functionCode: string; // TypeScript/JavaScript code
  language: 'typescript' | 'javascript';
  allowedModules?: string[]; // Whitelist of npm modules
  resourceLimits?: {
    timeoutMs?: number;
    memoryMb?: number;
    cpuShares?: number;
  };
}

// ─────────────────────────────────────────────────────────────
// UNION TYPE FOR ALL INTEGRATION CONFIGS
// ─────────────────────────────────────────────────────────────

export type IntegrationConfig =
  | ApiCallConfig
  | WebhookListenerConfig
  | CacheOperationConfig
  | CdnUploadConfig
  | FirebaseActionConfig
  | BrowserActionConfig
  | TransformationConfig
  | SdkFunctionConfig;

// ─────────────────────────────────────────────────────────────
// INTEGRATION EXECUTION RESULT
// ─────────────────────────────────────────────────────────────

export interface IntegrationExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
    retryCount?: number;
    cost?: number; // In cents
  };
}

// ─────────────────────────────────────────────────────────────
// INTEGRATION CONTEXT
// ─────────────────────────────────────────────────────────────

export interface IntegrationExecutionContext {
  organizationId: string;
  workflowInstanceId: string;
  nodeId: string;
  workflowContext: Record<string, unknown>;
  config: IntegrationConfig;
  credentials?: Record<string, unknown>; // Decrypted credentials
}
