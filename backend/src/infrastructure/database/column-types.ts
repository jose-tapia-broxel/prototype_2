import { isMockMode } from '../database/typeorm.config';

/**
 * Portable TypeORM column types.
 * Returns the correct column type depending on whether we're in mock (SQLite) or production (Postgres) mode.
 */
export function jsonColumnType(): 'simple-json' | 'jsonb' {
  return isMockMode() ? 'simple-json' : 'jsonb';
}

export function uuidColumnType(): 'varchar' | 'uuid' {
  return isMockMode() ? 'varchar' : 'uuid';
}

export function timestampColumnType(): 'datetime' | 'timestamptz' {
  return isMockMode() ? 'datetime' : 'timestamptz';
}

export function nowDefault(): () => string {
  return isMockMode() ? () => "datetime('now')" : () => 'NOW()';
}
