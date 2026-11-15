import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { Role } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.displayName },
    env.jwtSecret,
    { expiresIn: env.accessTokenTtl, algorithm: 'HS256' },
  );
}

function readAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = readAccessToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') throw new Error('bad subject');

    req.user = {
      id: payload.sub,
      email: String(payload.email ?? ''),
      role: payload.role === 'admin' ? 'admin' : 'household',
      displayName: String(payload.name ?? ''),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}
