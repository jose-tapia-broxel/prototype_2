import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CredentialVaultService, CreateCredentialDto } from './credential-vault.service';
import { AuthProvider } from '../entities/credential.entity';

export interface OAuthProvider {
  name: AuthProvider;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthAuthorizationRequest {
  provider: AuthProvider;
  scopes?: string[];
  state?: string;
  organizationId: string;
  userId?: string;
  credentialName?: string;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  provider: AuthProvider;
  organizationId: string;
  userId?: string;
  credentialName?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

@Injectable()
export class OAuthService {
  private readonly providers: Map<AuthProvider, Partial<OAuthProvider>> = new Map([
    [
      'google',
      {
        name: 'google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['openid', 'email', 'profile'],
      },
    ],
    [
      'microsoft',
      {
        name: 'microsoft',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: ['openid', 'email', 'profile'],
      },
    ],
    [
      'github',
      {
        name: 'github',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['user:email', 'read:user'],
      },
    ],
    [
      'salesforce',
      {
        name: 'salesforce',
        authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
        tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
        scopes: ['api', 'refresh_token'],
      },
    ],
    [
      'slack',
      {
        name: 'slack',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['chat:write', 'channels:read'],
      },
    ],
  ]);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialVaultService: CredentialVaultService,
  ) {}

  /**
   * Get OAuth provider configuration
   */
  private getProviderConfig(provider: AuthProvider): OAuthProvider {
    const partialConfig = this.providers.get(provider);
    if (!partialConfig) {
      throw new BadRequestException(`OAuth provider ${provider} is not configured`);
    }

    // Load from environment variables
    const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = process.env[`OAUTH_${provider.toUpperCase()}_REDIRECT_URI`] || 
                       `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/oauth/callback/${provider}`;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        `OAuth provider ${provider} is not configured. Missing OAUTH_${provider.toUpperCase()}_CLIENT_ID or CLIENT_SECRET`
      );
    }

    return {
      ...partialConfig,
      clientId,
      clientSecret,
      redirectUri,
    } as OAuthProvider;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthorizationUrl(request: OAuthAuthorizationRequest): string {
    const config = this.getProviderConfig(request.provider);
    
    const state = request.state || this.generateState(request.organizationId, request.userId);
    const scopes = request.scopes || config.scopes;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent', // Force consent to ensure refresh token
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Generate state parameter for OAuth flow (includes org/user info)
   */
  private generateState(organizationId: string, userId?: string): string {
    const stateData = {
      organizationId,
      userId,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  /**
   * Parse state parameter from OAuth callback
   */
  private parseState(state: string): { organizationId: string; userId?: string; timestamp: number } {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new BadRequestException('Invalid state parameter');
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(callbackData: OAuthCallbackData): Promise<string> {
    const config = this.getProviderConfig(callbackData.provider);
    const stateData = this.parseState(callbackData.state);

    // Exchange authorization code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(
      callbackData.code,
      config
    );

    // Calculate token expiration
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : undefined;

    // Store credentials in vault
    const credentialDto: CreateCredentialDto = {
      name: callbackData.credentialName || `${callbackData.provider} OAuth`,
      credentialType: 'oauth2',
      authProvider: callbackData.provider,
      credentials: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresAt: expiresAt?.toISOString(),
      },
      metadata: {
        scopes: tokenResponse.scope?.split(' ') || config.scopes,
        tokenUrl: config.tokenUrl,
      },
      organizationId: stateData.organizationId,
      userId: stateData.userId,
      expiresAt,
    };

    const credential = await this.credentialVaultService.create(credentialDto);
    return credential.id;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    config: OAuthProvider
  ): Promise<OAuthTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      });

      const response = await firstValueFrom(
        this.httpService.post<OAuthTokenResponse>(
          config.tokenUrl,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
          }
        )
      );

      return response.data;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to exchange code for tokens: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Refresh an OAuth2 access token
   */
  async refreshAccessToken(credentialId: string, organizationId: string): Promise<void> {
    const credential = await this.credentialVaultService.getDecrypted(credentialId, organizationId);

    if (credential.credentialType !== 'oauth2') {
      throw new BadRequestException('Credential is not an OAuth2 credential');
    }

    if (!credential.authProvider) {
      throw new BadRequestException('OAuth provider is not specified');
    }

    const config = this.getProviderConfig(credential.authProvider);
    const creds = credential.credentials as { refreshToken?: string };

    if (!creds.refreshToken) {
      throw new BadRequestException('Refresh token not available');
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const response = await firstValueFrom(
        this.httpService.post<OAuthTokenResponse>(
          config.tokenUrl,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
          }
        )
      );

      const expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000)
        : undefined;

      // Update credential with new tokens
      await this.credentialVaultService.update(credentialId, organizationId, {
        credentials: {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || creds.refreshToken, // Keep old refresh token if not provided
          tokenType: response.data.token_type || 'Bearer',
          expiresAt: expiresAt?.toISOString(),
        },
        expiresAt,
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to refresh token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): Array<{ name: AuthProvider; scopes: string[] }> {
    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      scopes: config.scopes || [],
    }));
  }
}
