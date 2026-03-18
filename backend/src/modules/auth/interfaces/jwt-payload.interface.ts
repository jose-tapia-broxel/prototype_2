/**
 * JWT payload shape embedded in every access token.
 * This is what gets decoded when a request hits a protected route.
 */
export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** Organization UUID — the tenant boundary */
  organizationId: string;
  /** User email */
  email: string;
  /** User role within the organization */
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  /** Token issued-at (epoch seconds, injected by JWT lib) */
  iat?: number;
  /** Token expiration (epoch seconds, injected by JWT lib) */
  exp?: number;
}

/**
 * Shape attached to `request.user` after JWT validation.
 */
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}
