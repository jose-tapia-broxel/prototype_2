import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  IntegrationConfig,
  IntegrationExecutionContext,
  IntegrationExecutionResult,
  ApiCallConfig,
  CacheOperationConfig,
  TransformationConfig,
} from '../interfaces/integration-types';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { CredentialVaultService } from '../../credentials/services/credential-vault.service';

/**
 * Integration Node Processor
 * 
 * Executes integration nodes by delegating to specific handlers
 * based on the integration type. Handles error management, retries,
 * and telemetry emission.
 */
@Injectable()
export class IntegrationNodeProcessorService {
  private readonly logger = new Logger(IntegrationNodeProcessorService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly events: DomainEventsService,
    private readonly credentialVault: CredentialVaultService,
  ) {}

  /**
   * Main execution entry point for integration nodes
   */
  async execute(context: IntegrationExecutionContext): Promise<IntegrationExecutionResult> {
    const startedAt = new Date();
    
    this.logger.log(
      `Executing integration node ${context.nodeId} (${context.config.integrationType})`,
    );

    // Emit start event
    await this.events.emit({
      eventName: 'integration.started',
      eventCategory: 'workflow' as any, // TODO: Add 'integration' to EventCategory enum
      organizationId: context.organizationId,
      entityType: 'WorkflowNode',
      entityId: context.nodeId,
      occurredAt: new Date(),
      metadata: {
        workflowInstanceId: context.workflowInstanceId,
        integrationType: context.config.integrationType,
      },
    });

    try {
      // Execute integration with retry logic
      const result = await this.executeWithRetry(context);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // Emit completion event
      await this.events.emit({
        eventName: 'integration.completed',
        eventCategory: 'workflow' as any, // TODO: Add 'integration' to EventCategory enum
        organizationId: context.organizationId,
        entityType: 'WorkflowNode',
        entityId: context.nodeId,
        occurredAt: new Date(),
        metadata: {
          workflowInstanceId: context.workflowInstanceId,
          integrationType: context.config.integrationType,
          durationMs,
          success: result.success,
        },
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          startedAt,
          completedAt,
          durationMs,
        },
      };
    } catch (error) {
      const err = error as Error;
      const startedAt = new Date();
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      this.logger.error(
        `Integration execution failed for node ${context.nodeId}: ${err.message}`,
        err.stack,
      );

      // Emit failure event
      await this.events.emit({
        eventName: 'integration.failed',
        eventCategory: 'workflow' as any, // TODO: Add 'integration' to EventCategory enum
        organizationId: context.organizationId,
        entityType: 'WorkflowNode',
        occurredAt: new Date(),
        entityId: context.nodeId,
        metadata: {
          workflowInstanceId: context.workflowInstanceId,
          integrationType: context.config.integrationType,
          error: err.message,
          durationMs,
        },
      });

      return {
        success: false,
        error: {
          code: 'INTEGRATION_EXECUTION_ERROR',
          message: err.message,
          details: err.stack,
        },
        metadata: {
          startedAt,
          completedAt,
          durationMs,
        },
      };
    }
  }

  /**
   * Execute with retry logic based on error handling config
   */
  private async executeWithRetry(
    context: IntegrationExecutionContext,
  ): Promise<IntegrationExecutionResult> {
    const errorHandling = context.config.errorHandling;
    const maxRetries = errorHandling?.maxRetries ?? 0;
    const retryDelayMs = errorHandling?.retryDelayMs ?? 1000;

    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeIntegration(context);

        if (result.success) {
          return result;
        }

        // If strategy is fail and execution didn't succeed, throw
        if (errorHandling?.strategy === 'fail') {
          throw new Error(result.error?.message ?? 'Integration execution failed');
        }

        // Return result (even if not successful) if we're not retrying
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (attempt < maxRetries) {
          this.logger.warn(
            `Integration attempt ${attempt + 1} failed, retrying in ${retryDelayMs}ms...`,
          );
          await this.delay(retryDelayMs);
        }
      }
    }

    // All retries exhausted
    if (errorHandling?.strategy === 'fallback' && errorHandling.fallbackValue !== undefined) {
      return {
        success: true,
        data: errorHandling.fallbackValue,
      };
    }

    if (errorHandling?.strategy === 'ignore') {
      return {
        success: true,
        data: null,
      };
    }

    throw lastError;
  }

  /**
   * Execute specific integration type
   */
  private async executeIntegration(
    context: IntegrationExecutionContext,
  ): Promise<IntegrationExecutionResult> {
    switch (context.config.integrationType) {
      case 'api_call':
        return this.executeApiCall(context.config as ApiCallConfig, context);

      case 'cache_operation':
        return this.executeCacheOperation(context.config as CacheOperationConfig, context);

      case 'transformation':
        return this.executeTransformation(context.config as TransformationConfig, context);

      // Placeholder for other integration types
      case 'webhook_listener':
      case 'cdn_upload':
      case 'firebase_action':
      case 'browser_action':
      case 'sdk_function':
        return {
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: `Integration type ${context.config.integrationType} not yet implemented`,
          },
        };

      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_INTEGRATION_TYPE',
            message: `Unknown integration type: ${(context.config as any).integrationType}`,
          },
        };
    }
  }

  /**
   * Execute API Call integration
   */
  private async executeApiCall(
    config: ApiCallConfig,
    context: IntegrationExecutionContext,
  ): Promise<IntegrationExecutionResult> {
    try {
      // Fetch credentials if credentialId is provided
      let credentials: Record<string, unknown> | undefined;
      if (config.credentialId) {
        const decryptedCredential = await this.credentialVault.getDecrypted(
          config.credentialId,
          context.organizationId
        );
        credentials = decryptedCredential.credentials;
      }

      // Replace template variables in URL, headers, body
      const url = this.replaceTemplateVariables(config.url, context.workflowContext);
      const headers = this.replaceObjectTemplates(config.headers ?? {}, context.workflowContext);
      const queryParams = this.replaceObjectTemplates(
        config.queryParams ?? {},
        context.workflowContext,
      );
      const body = config.body
        ? this.replaceObjectTemplates(config.body, context.workflowContext)
        : undefined;

      // Add authentication headers if credentials provided
      if (credentials) {
        this.applyAuthentication(headers, config.authType ?? 'none', credentials);
      }

      this.logger.debug(`Making ${config.method} request to ${url}`);

      // Make HTTP request with @nestjs/axios
      const response = await firstValueFrom(
        this.httpService.request({
          method: config.method,
          url,
          headers,
          params: queryParams,
          data: body,
          timeout: config.timeout || 30000,
          validateStatus: (status) => {
            if (config.validateStatus && config.validateStatus.length > 0) {
              return config.validateStatus.includes(status);
            }
            return status >= 200 && status < 300;
          },
        })
      );

      // Apply output mappings if specified
      const data = this.applyOutputMappings(response.data, config.outputs ?? {});

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: data,
        },
      };
    } catch (error) {
      const err = error as any;
      this.logger.error(`API call failed: ${err.message}`);

      return {
        success: false,
        error: {
          code: err.response?.status ? `HTTP_${err.response.status}` : 'API_CALL_ERROR',
          message: err.message,
          details: {
            url: config.url,
            method: config.method,
            response: err.response?.data,
          },
        },
      };
    }
  }

  /**
   * Execute Cache Operation integration
   */
  private async executeCacheOperation(
    config: CacheOperationConfig,
    context: IntegrationExecutionContext,
  ): Promise<IntegrationExecutionResult> {
    // Simplified in-memory cache for demonstration
    // In production, use Redis or similar
    const cacheKey = this.replaceTemplateVariables(config.key, context.workflowContext);

    try {
      switch (config.operation) {
        case 'read':
          // Simulate cache read
          const cachedValue = await this.readFromCache(cacheKey);
          if (cachedValue !== null) {
            return { success: true, data: cachedValue };
          }

          // Fallback to source if configured
          if (config.fallbackToSource?.enabled) {
            this.logger.debug(`Cache miss for ${cacheKey}, falling back to source`);
            return {
              success: true,
              data: null,
            };
          }

          return { success: false, error: { code: 'CACHE_MISS', message: 'Key not found in cache' } };

        case 'write':
          await this.writeToCache(cacheKey, config.value, config.ttl);
          return { success: true, data: { key: cacheKey } };

        case 'invalidate':
          await this.invalidateCache(cacheKey);
          return { success: true, data: { key: cacheKey, invalidated: true } };

        case 'exists':
          const exists = await this.cacheExists(cacheKey);
          return { success: true, data: { exists } };

        default:
          return {
            success: false,
            error: { code: 'INVALID_OPERATION', message: 'Unknown cache operation' },
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CACHE_OPERATION_ERROR',
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Execute Transformation integration
   */
  private async executeTransformation(
    config: TransformationConfig,
    context: IntegrationExecutionContext,
  ): Promise<IntegrationExecutionResult> {
    try {
      const sourceValue = this.getNestedProperty(context.workflowContext, config.sourceField);

      // Simple transformation logic (extend based on transformType)
      let transformedValue: unknown;

      switch (config.transformType) {
        case 'map':
          transformedValue = this.applyMapping(sourceValue, config.transformation);
          break;

        case 'format':
          transformedValue = this.applyFormatting(sourceValue, config.transformation);
          break;

        default:
          transformedValue = sourceValue;
      }

      return {
        success: true,
        data: {
          [config.targetField]: transformedValue,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: (error as Error).message,
        },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Replace template variables like {{context.userId}} with actual values
   */
  private replaceTemplateVariables(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
      const value = this.getNestedProperty(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Replace templates in objects recursively
   */
  private replaceObjectTemplates(obj: any, context: Record<string, unknown>): any {
    if (typeof obj === 'string') {
      return this.replaceTemplateVariables(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceObjectTemplates(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.replaceObjectTemplates(obj[key], context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Get nested property from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply output mappings using JSONPath-like syntax
   */
  private applyOutputMappings(data: any, mappings: Record<string, string>): any {
    const result: any = {};

    for (const [key, path] of Object.entries(mappings)) {
      // Simplified JSONPath: $.data.user.name -> data.user.name
      const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
      result[key] = this.getNestedProperty(data, cleanPath);
    }

    return Object.keys(result).length > 0 ? result : data;
  }

  /**
   * Apply authentication to headers
   */
  private applyAuthentication(
    headers: Record<string, string>,
    authType: string,
    credentials: Record<string, unknown>,
  ): void {
    switch (authType) {
      case 'bearer':
        if (credentials.token) {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        }
        break;

      case 'api_key':
        if (credentials.apiKey && credentials.headerName) {
          headers[credentials.headerName as string] = credentials.apiKey as string;
        }
        break;

      case 'basic':
        if (credentials.username && credentials.password) {
          const encoded = Buffer.from(
            `${credentials.username}:${credentials.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Placeholder cache methods (implement with Redis in production)
  private async readFromCache(key: string): Promise<unknown> {
    // TODO: Implement Redis cache read
    return null;
  }

  private async writeToCache(key: string, value: unknown, ttl?: number): Promise<void> {
    // TODO: Implement Redis cache write
  }

  private async invalidateCache(key: string): Promise<void> {
    // TODO: Implement Redis cache invalidation
  }

  private async cacheExists(key: string): Promise<boolean> {
    // TODO: Implement Redis cache exists check
    return false;
  }

  // Placeholder transformation methods
  private applyMapping(value: unknown, transformation: unknown): unknown {
    // TODO: Implement JSONata or similar transformation
    return value;
  }

  private applyFormatting(value: unknown, transformation: unknown): unknown {
    // TODO: Implement formatting (dates, currency, etc.)
    return value;
  }
}
