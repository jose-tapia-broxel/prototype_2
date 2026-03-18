/**
 * In-memory mock data provider.
 * Simulates the database layer until PostgreSQL is connected.
 * Replace with real TypeORM repositories when DB is ready.
 */

export interface MockOrganization {
  id: string;
  slug: string;
  name: string;
  settingsJson: Record<string, unknown>;
  createdAt: string;
}

export interface MockUser {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ── Seed Organizations ──────────────────────────────────────────────
const ORGANIZATIONS: MockOrganization[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    settingsJson: { locale: 'en', timezone: 'America/Mexico_City' },
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'globex-inc',
    name: 'Globex Inc.',
    settingsJson: { locale: 'es', timezone: 'America/Bogota' },
    createdAt: '2026-02-01T00:00:00Z',
  },
];

// ── Seed Users ──────────────────────────────────────────────────────
// Passwords: all seeded users use "P@ssw0rd!" → bcrypt hash placeholder
const SEED_PASSWORD_HASH =
  '$2b$10$MOCK_HASH_REPLACE_WITH_BCRYPT_WHEN_DB_READY';

const USERS: MockUser[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizationId: '11111111-1111-1111-1111-111111111111',
    email: 'admin@acme.com',
    displayName: 'Alice Admin',
    passwordHash: SEED_PASSWORD_HASH,
    role: 'owner',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizationId: '11111111-1111-1111-1111-111111111111',
    email: 'editor@acme.com',
    displayName: 'Bob Editor',
    passwordHash: SEED_PASSWORD_HASH,
    role: 'editor',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-16T00:00:00Z',
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    organizationId: '22222222-2222-2222-2222-222222222222',
    email: 'admin@globex.com',
    displayName: 'Carlos Admin',
    passwordHash: SEED_PASSWORD_HASH,
    role: 'owner',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-02-01T00:00:00Z',
  },
];

// ── Public accessors (simulate repository calls) ────────────────────

export class MockDataProvider {
  static findOrganizationById(id: string): MockOrganization | undefined {
    return ORGANIZATIONS.find((o) => o.id === id);
  }

  static findOrganizationBySlug(slug: string): MockOrganization | undefined {
    return ORGANIZATIONS.find((o) => o.slug === slug);
  }

  static findUserById(id: string): MockUser | undefined {
    return USERS.find((u) => u.id === id);
  }

  static findUserByEmail(
    organizationId: string,
    email: string,
  ): MockUser | undefined {
    return USERS.find(
      (u) => u.organizationId === organizationId && u.email === email,
    );
  }

  static findUsersByOrganization(organizationId: string): MockUser[] {
    return USERS.filter((u) => u.organizationId === organizationId);
  }

  static getAllOrganizations(): MockOrganization[] {
    return [...ORGANIZATIONS];
  }

  static getAllUsers(): MockUser[] {
    return [...USERS];
  }
}
