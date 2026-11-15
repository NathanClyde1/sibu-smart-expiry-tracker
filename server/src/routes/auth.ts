import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, type UserRow } from '../db.js';
import { env } from '../env.js';
import { authenticate, signAccessToken, type AuthUser } from '../auth.js';
import { createRefreshToken, hashPassword, hashToken, verifyPassword } from '../password.js';
import { rateLimit } from '../rateLimit.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'seg_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  displayName: z.string().trim().min(2, 'Household name is too short').max(80),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
});

function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, role: row.role, displayName: row.display_name };
}

/** Issues a fresh access token and a rotated refresh token for this device. */
function startSession(req: Request, res: Response, user: AuthUser) {
  const { token, hash } = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlMs).toISOString();

  db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    user.id,
    hash,
    expiresAt,
  );

  // Browsers get the refresh token only as an httpOnly cookie. Native clients
  // ask for it in the body so they can keep it in the OS keychain.
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: env.refreshTokenTtlMs,
  });

  const body: { accessToken: string; refreshToken?: string; user: AuthUser } = {
    accessToken: signAccessToken(user),
    user,
  };
  if (req.get('X-Client') === 'mobile') body.refreshToken = token;

  return res.json(body);
}

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { email, password, displayName } = parsed.data;
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    const user: AuthUser = {
      id: randomUUID(),
      email,
      role: 'household',
      displayName,
    };

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
    ).run(user.id, user.email, await hashPassword(password), user.displayName, user.role);

    res.status(201);
    return startSession(req, res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Email and password are required' });

    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email) as
      | UserRow
      | undefined;

    // Same response and roughly the same work for unknown email and wrong password.
    if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    return startSession(req, res, toAuthUser(row));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', (req, res) => {
  const presented: unknown = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (typeof presented !== 'string' || !presented) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const stored = db
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .get(hashToken(presented)) as
    | { id: string; user_id: string; expires_at: string; revoked_at: string | null }
    | undefined;

  if (!stored) return res.status(401).json({ error: 'Invalid refresh token' });

  // A rotated token being replayed means it leaked: drop every session for that user.
  if (stored.revoked_at) {
    db.prepare('UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE user_id = ? AND revoked_at IS NULL').run(
      stored.user_id,
    );
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return res.status(401).json({ error: 'Session revoked. Please sign in again.' });
  }

  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(stored.user_id) as UserRow | undefined;
  if (!row) return res.status(401).json({ error: 'Account no longer exists' });

  db.prepare('UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE id = ?').run(stored.id);
  return startSession(req, res, toAuthUser(row));
});

authRouter.post('/logout', (req, res) => {
  const presented: unknown = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (typeof presented === 'string' && presented) {
    db.prepare('UPDATE refresh_tokens SET revoked_at = datetime(\'now\') WHERE token_hash = ? AND revoked_at IS NULL').run(
      hashToken(presented),
    );
  }

  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  return res.status(204).end();
});

authRouter.get('/me', authenticate, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as UserRow | undefined;
  if (!row) return res.status(401).json({ error: 'Account no longer exists' });
  return res.json({ user: toAuthUser(row) });
});
