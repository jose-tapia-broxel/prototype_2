export type IntegrationType = 'REST' | 'GRAPHQL' | 'SOAP' | 'WEBHOOK';
export type AuthType = 'NONE' | 'BASIC' | 'BEARER' | 'OAUTH2' | 'API_KEY';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IntegrationAuth {
  type: AuthType;
  // Reference to a secure vault/secret manager, NEVER the actual secret
  credentialRef?: string; 
  
  // For API_KEY
  keyName?: string;
  keyLocation?: 'HEADER' | 'QUERY' | 'BODY';
}

export interface RetryPolicy {
  maxAttempts: number;
  initialIntervalMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[]; // e.g., [408, 429, 500, 502, 503, 504]
}

export interface CircuitBreakerConfig {
  failureThresholdPercentage: number;
  slidingWindowSize: number;
  openStateTimeoutMs: number;
}

export interface IntegrationMapping {
  // Templates like "{{context.user.name}}"
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any; // Can be a string template or a nested object with templates
}

export interface ResponseMapping {
  onSuccess?: {
    targetVariable: string; // Where to store the result in the workflow context
    extract?: string;       // JSONPath expression (e.g., "$.data.id")
  };
  onFailure?: {
    targetVariable: string;
    extract?: string;
  };
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  type: IntegrationType;
  
  config: {
    method: HttpMethod;
    url: string; // Supports templating: "https://api.example.com/users/{{context.userId}}"
    timeoutMs?: number;
  };
  
  auth: IntegrationAuth;
  requestMapping: IntegrationMapping;
  responseMapping?: ResponseMapping;
  
  resilience?: {
    retryPolicy?: RetryPolicy;
    circuitBreaker?: CircuitBreakerConfig;
  };
}
