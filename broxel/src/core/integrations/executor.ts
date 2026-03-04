import { IntegrationDefinition } from './models';
import { ExecutionContext } from '../rule-engine/ast/types';
import { TemplateEngine } from './template-engine';

export interface IntegrationAdapter {
  // Fetch the actual secret from Vault/KMS
  resolveCredential(ref: string): Promise<string>;
  
  // Perform the actual HTTP call (Axios/Fetch wrapper)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeHttp(method: string, url: string, headers: Record<string, string>, body: any): Promise<any>;
}

export class IntegrationExecutor {
  constructor(private adapter: IntegrationAdapter) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(definition: IntegrationDefinition, context: ExecutionContext): Promise<any> {
    // 1. Resolve URL
    let url = TemplateEngine.renderString(definition.config.url, context);
    
    // 2. Resolve Headers & Body
    const headers = TemplateEngine.renderObject(definition.requestMapping.headers || {}, context);
    const body = TemplateEngine.renderObject(definition.requestMapping.body, context);
    
    // 3. Inject Authentication
    if (definition.auth && definition.auth.type !== 'NONE' && definition.auth.credentialRef) {
      const secret = await this.adapter.resolveCredential(definition.auth.credentialRef);
      
      switch (definition.auth.type) {
        case 'BEARER':
          headers['Authorization'] = `Bearer ${secret}`;
          break;
        case 'BASIC':
          headers['Authorization'] = `Basic ${Buffer.from(secret).toString('base64')}`;
          break;
        case 'API_KEY':
          if (definition.auth.keyLocation === 'HEADER' && definition.auth.keyName) {
            headers[definition.auth.keyName] = secret;
          } else if (definition.auth.keyLocation === 'QUERY' && definition.auth.keyName) {
            // Append to URL
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}${definition.auth.keyName}=${encodeURIComponent(secret)}`;
          }
          break;
        // OAUTH2 would be more complex, involving token fetching/refreshing
      }
    }

    // 4. Resilience (Retry Logic)
    let attempt = 0;
    const maxAttempts = definition.resilience?.retryPolicy?.maxAttempts || 1;
    const retryableCodes = definition.resilience?.retryPolicy?.retryableStatusCodes || [];
    
    while (attempt < maxAttempts) {
      try {
        // 5. Execute Transport
        const response = await this.adapter.executeHttp(
          definition.config.method,
          url,
          headers,
          body
        );
        
        // 6. Response Mapping (Success)
        return this.mapResponse(response, definition.responseMapping?.onSuccess);
        
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        attempt++;
        
        const statusCode = error.response?.status || 500;
        
        if (attempt >= maxAttempts || !retryableCodes.includes(statusCode)) {
          // 7. Response Mapping (Failure)
          if (definition.responseMapping?.onFailure) {
            return this.mapResponse(error.response?.data || error.message, definition.responseMapping.onFailure);
          }
          throw error; // Re-throw if no failure mapping
        }
        
        // Exponential Backoff
        const backoff = (definition.resilience?.retryPolicy?.initialIntervalMs || 1000) * 
                        Math.pow(definition.resilience?.retryPolicy?.backoffMultiplier || 2, attempt - 1);
        
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapResponse(responseData: any, mappingConfig?: { targetVariable: string, extract?: string }): any {
    if (!mappingConfig) return responseData;
    
    let extractedValue = responseData;
    
    // Very basic JSONPath implementation (just dot notation for now)
    if (mappingConfig.extract && mappingConfig.extract.startsWith('$.')) {
      const path = mappingConfig.extract.substring(2); // Remove "$."
      const parts = path.split('.');
      
      for (const part of parts) {
        if (extractedValue === null || extractedValue === undefined) break;
        extractedValue = extractedValue[part];
      }
    }
    
    return {
      [mappingConfig.targetVariable]: extractedValue
    };
  }
}
