import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';

// Environment must be set before the modules that read it are imported.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seg-test-'));
process.env.DATABASE_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256';
process.env.NODE_ENV = 'test';
process.env.SEED_ADMIN_EMAIL = 'admin@test.local';
process.env.SEED_ADMIN_PASSWORD = 'AdminPass123!';
process.env.CORS_ORIGINS = 'http://localhost:5173';

const { createApp } = await import('../src/app.js');
const { db } = await import('../src/db.js');
const { runSeed } = await import('../src/seed.js');

let server: Server;
let base = '';
let adminToken = '';
let householdToken = '';
let householdRefresh = '';

interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

async function call<T = any>(
  method: string,
  url: string,
  options: { body?: unknown; token?: string; cookie?: string; client?: string } = {},
): Promise<Res<T>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.client) headers['X-Client'] = options.client;

  const res = await fetch(`${base}${url}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await res.text();
  return {
    status: res.status,
    body: text ? (JSON.parse(text) as T) : (undefined as T),
    headers: res.headers,
  };
}

before(async () => {
  await runSeed();
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  base = `http://127.0.0.1:${address.port}`;
});

after(() => {
  server?.close();
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('seed data', () => {
  it('creates the admin account and Sibu centres', async () => {
    const login = await call('POST', '/api/auth/login', {
      body: { email: 'admin@test.local', password: 'AdminPass123!' },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'admin');

    const centres = await call('GET', '/api/admin/centres', { token: login.body.accessToken });
    assert.equal(centres.status, 200);
    assert.ok(centres.body.centres.length >= 2);
    assert.ok(
      centres.body.centres.some((c: { name: string }) => c.name.includes('Tzu-Chi')),
      'Tzu-Chi centre should be seeded',
    );
  });
});

describe('registration and login', () => {
  it('registers a household account and returns a token', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'Home@Example.com', password: 'FamilyPass123', displayName: 'Tan Household' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'home@example.com');
    assert.equal(res.body.user.role, 'household');
    assert.ok(res.body.accessToken);
    // Browsers must never receive the refresh token in the body.
    assert.equal(res.body.refreshToken, undefined);
    assert.match(res.headers.get('set-cookie') ?? '', /seg_refresh=.*HttpOnly/i);

    householdToken = res.body.accessToken;
  });

  it('refuses a duplicate email', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'home@example.com', password: 'FamilyPass123', displayName: 'Tan Household' },
    });
    assert.equal(res.status, 409);
  });

  it('refuses a short password', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'short@example.com', password: 'abc', displayName: 'Short' },
    });
    assert.equal(res.status, 400);
  });

  it('never lets a client register itself as admin', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: {
        email: 'sneaky@example.com',
        password: 'SneakyPass123',
        displayName: 'Sneaky',
        role: 'admin',
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'household');
  });

  it('rejects a wrong password', async () => {
    const res = await call('POST', '/api/auth/login', {
      body: { email: 'home@example.com', password: 'not-the-password' },
    });
    assert.equal(res.status, 401);
  });

  it('returns the same message for an unknown account', async () => {
    const res = await call('POST', '/api/auth/login', {
      body: { email: 'nobody@example.com', password: 'whatever123' },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Incorrect email or password');
  });

  it('gives mobile clients the refresh token in the body', async () => {
    const res = await call('POST', '/api/auth/login', {
      body: { email: 'home@example.com', password: 'FamilyPass123' },
      client: 'mobile',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.refreshToken);
    householdRefresh = res.body.refreshToken;
    householdToken = res.body.accessToken;
  });
});

describe('protected routes', () => {
  it('rejects requests without a token', async () => {
    const res = await call('GET', '/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('returns the current user', async () => {
    const res = await call('GET', '/api/auth/me', { token: householdToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.displayName, 'Tan Household');
  });

  it('rejects a tampered token', async () => {
    const res = await call('GET', '/api/auth/me', { token: `${householdToken}x` });
    assert.equal(res.status, 401);
  });

  it('blocks household accounts from the admin API', async () => {
    const res = await call('GET', '/api/admin/centres', { token: householdToken });
    assert.equal(res.status, 403);
  });

  it('blocks unauthenticated access to the admin API', async () => {
    const res = await call('GET', '/api/admin/stats');
    assert.equal(res.status, 401);
  });
});

describe('refresh token rotation', () => {
  it('issues a new access token and invalidates the used refresh token', async () => {
    const first = await call('POST', '/api/auth/refresh', {
      body: { refreshToken: householdRefresh },
      client: 'mobile',
    });
    assert.equal(first.status, 200);
    assert.ok(first.body.accessToken);
    assert.ok(first.body.refreshToken);
    assert.notEqual(first.body.refreshToken, householdRefresh);

    // Replaying the rotated token is treated as theft and kills the family.
    const replay = await call('POST', '/api/auth/refresh', {
      body: { refreshToken: householdRefresh },
    });
    assert.equal(replay.status, 401);

    const afterReplay = await call('POST', '/api/auth/refresh', {
      body: { refreshToken: first.body.refreshToken },
    });
    assert.equal(afterReplay.status, 401, 'all sessions for that user must be revoked');
  });

  it('rejects a garbage refresh token', async () => {
    const res = await call('POST', '/api/auth/refresh', { body: { refreshToken: 'nope' } });
    assert.equal(res.status, 401);
  });
});

describe('admin centre management', () => {
  before(async () => {
    const login = await call('POST', '/api/auth/login', {
      body: { email: 'admin@test.local', password: 'AdminPass123!' },
    });
    adminToken = login.body.accessToken;
  });

  it('creates, updates and deletes a centre', async () => {
    const created = await call('POST', '/api/admin/centres', {
      token: adminToken,
      body: {
        name: 'Test Drop-off',
        address: 'Jalan Test, 96000 Sibu',
        latitude: 2.29,
        longitude: 111.83,
        acceptedMaterials: ['Paper', 'Glass'],
      },
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.centre.acceptedMaterials, ['Paper', 'Glass']);
    const id = created.body.centre.id as string;

    const patched = await call('PATCH', `/api/admin/centres/${id}`, {
      token: adminToken,
      body: { name: 'Renamed Drop-off', isVerified: false },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.centre.name, 'Renamed Drop-off');
    assert.equal(patched.body.centre.isVerified, false);
    assert.deepEqual(patched.body.centre.acceptedMaterials, ['Paper', 'Glass'], 'untouched fields survive');

    const removed = await call('DELETE', `/api/admin/centres/${id}`, { token: adminToken });
    assert.equal(removed.status, 204);

    const missing = await call('DELETE', `/api/admin/centres/${id}`, { token: adminToken });
    assert.equal(missing.status, 404);
  });

  it('validates coordinates', async () => {
    const res = await call('POST', '/api/admin/centres', {
      token: adminToken,
      body: { name: 'Bad Coords', address: 'Somewhere in Sibu', latitude: 999, longitude: 111.8 },
    });
    assert.equal(res.status, 400);
  });

  it('rejects duplicate category names', async () => {
    const body = { name: 'Compost Test', disposalMethod: 'compost' };
    const first = await call('POST', '/api/admin/categories', { token: adminToken, body });
    assert.equal(first.status, 201);

    const duplicate = await call('POST', '/api/admin/categories', { token: adminToken, body });
    assert.equal(duplicate.status, 409);

    await call('DELETE', `/api/admin/categories/${first.body.category.id}`, { token: adminToken });
  });

  it('reports stats', async () => {
    const res = await call('GET', '/api/admin/stats', { token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.centres, 'number');
    assert.equal(typeof res.body.categories, 'number');
  });
});

describe('login rate limiting', () => {
  it('stops brute force after ten attempts', async () => {
    const attempt = () =>
      call('POST', '/api/auth/login', {
        body: { email: 'bruteforce@example.com', password: `guess-${randomUUID()}` },
      });

    for (let i = 0; i < 10; i += 1) {
      const res = await attempt();
      assert.equal(res.status, 401);
    }

    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
  });
});
