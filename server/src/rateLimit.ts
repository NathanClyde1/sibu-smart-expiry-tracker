import type { NextFunction, Request, Response } from 'express';

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window limiter held in memory. Single-process only: if the API is ever
 * scaled horizontally, move this to the shared store alongside the sessions.
 */
export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }) {
  const hits = new Map<string, Window>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.key?.(req) ?? req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > options.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many attempts. Try again shortly.' });
    }

    next();
  };
}
