import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

export type CredentialType = 
  | 'api_key'
  | 'oauth2'
  | 'basic_auth'
  | 'bearer_token'
  | 'custom';

export type AuthProvider = 
  | 'google'
  | 'microsoft'
  | 'github'
  | 'salesforce'
  | 'slack'
  | 'custom';

@Entity('credentials')
@Index(['organizationId', 'isActive'])
@Index(['organizationId', 'credentialType'])
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  @Index()
  organizationId!: string;

  @Column({ name: 'user_id', type: uuidColumnType(), nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'credential_type', type: 'varchar', length: 50 })
  credentialType!: CredentialType;

  @Column({ name: 'auth_provider', type: 'varchar', length: 50, nullable: true })
  authProvider?: AuthProvider;

  // Encrypted credentials data stored as JSONB
  // For API keys: { apiKey: string }
  // For OAuth2: { accessToken: string, refreshToken: string, expiresAt: Date }
  // For Basic Auth: { username: string, password: string }
  // For Bearer: { token: string }
  @Column({ name: 'encrypted_data', type: 'text' })
  encryptedData!: string;

  // Metadata (not encrypted) - store non-sensitive info
  // e.g., { scopes: ['read', 'write'], tokenEndpoint: 'https://...' }
  @Column({ type: jsonColumnType(), default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'expires_at', type: timestampColumnType(), nullable: true })
  expiresAt?: Date;

  @Column({ name: 'last_used_at', type: timestampColumnType(), nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'rotation_policy_days', type: 'int', nullable: true })
  rotationPolicyDays?: number;

  @Column({ name: 'rotation_reminder_sent', type: 'boolean', default: false })
  rotationReminderSent!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: timestampColumnType(), nullable: true })
  deletedAt?: Date;
}
