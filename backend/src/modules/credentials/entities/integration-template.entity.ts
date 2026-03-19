import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

export type TemplateCategory = 
  | 'api'
  | 'database'
  | 'messaging'
  | 'storage'
  | 'analytics'
  | 'payment'
  | 'crm'
  | 'productivity'
  | 'custom';

@Entity('integration_templates')
@Index(['isPublic', 'isActive'])
@Index(['category', 'isActive'])
export class IntegrationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: uuidColumnType(), nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: TemplateCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider!: string; // e.g., 'Stripe', 'Salesforce', 'SendGrid'

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Index()
  icon?: string; // URL or icon identifier

  // Template configuration - pre-filled integration config
  // This is the default config that users can customize
  @Column({ name: 'config_template', type: jsonColumnType() })
  configTemplate!: Record<string, unknown>;

  // Required credential type for this template
  @Column({ name: 'required_credential_type', type: 'varchar', length: 50, nullable: true })
  requiredCredentialType?: string;

  // Field definitions for the config panel
  // e.g., [{ name: 'endpoint', type: 'text', label: 'API Endpoint', required: true }]
  @Column({ name: 'config_fields', type: jsonColumnType(), default: [] })
  configFields!: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'code';
    label: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;

  // Tags for searching/filtering
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount!: number;

  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  documentation?: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
