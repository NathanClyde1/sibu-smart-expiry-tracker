import { randomBytes } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';

// `npm run dev -w server` runs with cwd=server, but the .env lives at the repo root.
dotenv.config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '..', '.env')],
});

const isProd = process.env.NODE_ENV === 'production';

/** Dev convenience only: an ephemeral secret means sessions die on restart. */
function jwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (isProd) throw new Error('JWT_SECRET is required in production');
  console.warn('[env] JWT_SECRET not set - using an ephemeral development secret');
  return randomBytes(48).toString('hex');
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtSecret(),
  databasePath: path.resolve(process.cwd(), '..', process.env.DATABASE_PATH ?? 'server/data/app.db'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  accessTokenTtl: '15m' as const,
  refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
};

export const seedAdmin = {
  email: process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@sibu.gov.my',
  password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
  name: process.env.SEED_ADMIN_NAME || 'Sibu Council Admin',
};
