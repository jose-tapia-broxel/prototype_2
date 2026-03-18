import { config } from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Load .env early so DB_MOCK is available at module-evaluation time.
config();

/**
 * Returns true when DB_MOCK=true in the environment.
 * In mock mode the app skips the PostgreSQL connection entirely.
 */
export function isMockMode(): boolean {
  return (process.env.DB_MOCK ?? 'false').toLowerCase() === 'true';
}

/**
 * TypeORM config for PostgreSQL.
 * When `isMockMode()` is true the app uses an in-memory SQLite database
 * so that the NestJS TypeORM module still boots without a running Postgres.
 */
export const typeOrmConfig: TypeOrmModuleOptions = isMockMode()
  ? {
      type: 'better-sqlite3',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true, // auto-create tables in memory
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'lowcode',
      autoLoadEntities: true,
      synchronize: false,
    };
