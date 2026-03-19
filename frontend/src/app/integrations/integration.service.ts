import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Credential {
  id: string;
  name: string;
  description?: string;
  credentialType: 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token' | 'custom';
  authProvider?: string;
  isActive: boolean;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCredentialRequest {
  name: string;
  description?: string;
  credentialType: 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token' | 'custom';
  authProvider?: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  rotationPolicyDays?: number;
}

export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  icon?: string;
  configTemplate: Record<string, unknown>;
  requiredCredentialType?: string;
  configFields: Array<{
    name: string;
    type: string;
    label: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
    options?: Array<{ value: string; label: string }>;
  }>;
  tags?: string[];
  isPublic: boolean;
  useCount: number;
  rating?: number;
  createdAt: Date;
}

export interface OAuthProvider {
  name: string;
  scopes: string[];
}

/**
 * Integration Service
 * 
 * Handles API calls for credentials, OAuth, and integration templates.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private http = inject(HttpClient);
  private baseUrl = '/api'; // TODO: Get from environment

  // ─────────────────────────────────────────────────────────────
  // CREDENTIALS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all credentials for the organization
   */
  getCredentials(options?: {
    type?: string;
    active?: boolean;
  }): Observable<Credential[]> {
    let params = new HttpParams();
    if (options?.type) params = params.set('type', options.type);
    if (options?.active !== undefined) params = params.set('active', String(options.active));

    return this.http.get<Credential[]>(`${this.baseUrl}/credentials`, { params });
  }

  /**
   * Get a single credential (encrypted data not included)
   */
  getCredential(id: string): Observable<Credential> {
    return this.http.get<Credential>(`${this.baseUrl}/credentials/${id}`);
  }

  /**
   * Get credential with decrypted data
   * USE CAREFULLY - only call when needed
   */
  getDecryptedCredential(id: string): Observable<Credential & { credentials: Record<string, unknown> }> {
    return this.http.get<Credential & { credentials: Record<string, unknown> }>(
      `${this.baseUrl}/credentials/${id}/decrypted`
    );
  }

  /**
   * Create a new credential
   */
  createCredential(data: CreateCredentialRequest): Observable<Credential> {
    return this.http.post<Credential>(`${this.baseUrl}/credentials`, data);
  }

  /**
   * Update a credential
   */
  updateCredential(id: string, data: Partial<CreateCredentialRequest>): Observable<Credential> {
    return this.http.put<Credential>(`${this.baseUrl}/credentials/${id}`, data);
  }

  /**
   * Delete a credential
   */
  deleteCredential(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/credentials/${id}`);
  }

  /**
   * Test if a credential is valid
   */
  testCredential(id: string): Observable<{ valid: boolean; message?: string }> {
    return this.http.post<{ valid: boolean; message?: string }>(
      `${this.baseUrl}/credentials/${id}/test`,
      {}
    );
  }

  /**
   * Refresh OAuth token
   */
  refreshOAuthToken(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/credentials/${id}/refresh`, {});
  }

  // ─────────────────────────────────────────────────────────────
  // OAUTH
  // ─────────────────────────────────────────────────────────────

  /**
   * Get available OAuth providers
   */
  getOAuthProviders(): Observable<OAuthProvider[]> {
    return this.http.get<OAuthProvider[]>(`${this.baseUrl}/oauth/providers`);
  }

  /**
   * Initiate OAuth flow
   * Returns authorization URL to redirect user to
   */
  initiateOAuth(data: {
    provider: string;
    scopes?: string[];
    credentialName?: string;
  }): Observable<{ authorizationUrl: string }> {
    return this.http.post<{ authorizationUrl: string }>(
      `${this.baseUrl}/oauth/authorize`,
      data
    );
  }

  /**
   * Start OAuth flow (opens popup/redirect)
   */
  startOAuthFlow(provider: string, scopes?: string[], credentialName?: string): void {
    this.initiateOAuth({ provider, scopes, credentialName }).subscribe(
      (response) => {
        // Open OAuth URL in popup or redirect
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          response.authorizationUrl,
          'OAuth Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // INTEGRATION TEMPLATES
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all integration templates
   */
  getTemplates(options?: {
    category?: string;
    search?: string;
    tags?: string[];
  }): Observable<IntegrationTemplate[]> {
    let params = new HttpParams();
    if (options?.category) params = params.set('category', options.category);
    if (options?.search) params = params.set('search', options.search);
    if (options?.tags) params = params.set('tags', options.tags.join(','));

    return this.http.get<IntegrationTemplate[]>(
      `${this.baseUrl}/integration-templates`,
      { params }
    );
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(category?: string, limit: number = 10): Observable<IntegrationTemplate[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (category) params = params.set('category', category);

    return this.http.get<IntegrationTemplate[]>(
      `${this.baseUrl}/integration-templates/popular`,
      { params }
    );
  }

  /**
   * Get a single template by ID
   */
  getTemplate(id: string): Observable<IntegrationTemplate> {
    return this.http.get<IntegrationTemplate>(
      `${this.baseUrl}/integration-templates/${id}`
    );
  }

  /**
   * Mark template as used (increment use count)
   */
  markTemplateUsed(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/integration-templates/${id}/use`,
      {}
    );
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get credentials filtered by type
   */
  getCredentialsByType(type: string): Observable<Credential[]> {
    return this.getCredentials({ type });
  }

  /**
   * Get active credentials only
   */
  getActiveCredentials(): Observable<Credential[]> {
    return this.getCredentials({ active: true });
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): Observable<IntegrationTemplate[]> {
    return this.getTemplates({ search: query });
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): Observable<IntegrationTemplate[]> {
    return this.getTemplates({ category });
  }
}
