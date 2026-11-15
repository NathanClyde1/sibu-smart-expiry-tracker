import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env.js';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });

export const db = new Database(env.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'household' CHECK (role IN ('household', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

  CREATE TABLE IF NOT EXISTS recycling_centres (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    address      TEXT NOT NULL,
    latitude     REAL NOT NULL,
    longitude    REAL NOT NULL,
    opening_hours TEXT,
    accepted_materials TEXT NOT NULL DEFAULT '[]',
    notes        TEXT,
    is_verified  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS item_categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    disposal_method TEXT NOT NULL CHECK (disposal_method IN ('recycle', 'compost', 'general', 'special')),
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type Role = 'household' | 'admin';
export type DisposalMethod = 'recycle' | 'compost' | 'general' | 'special';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: Role;
  created_at: string;
}

export interface CentreRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  opening_hours: string | null;
  accepted_materials: string;
  notes: string | null;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  disposal_method: DisposalMethod;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
