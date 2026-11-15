export type Role = 'household' | 'admin';
export type DisposalMethod = 'recycle' | 'compost' | 'general' | 'special';

export interface User {
  id: string;
  email: string;
  role: Role;
  displayName: string;
}

export interface Centre {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  acceptedMaterials: string[];
  notes: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  disposalMethod: DisposalMethod;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  centres: number;
  verifiedCentres: number;
  categories: number;
  households: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * The access token lives in memory only, so an XSS payload cannot read it from
 * storage. A page reload re-establishes the session through the httpOnly
 * refresh cookie.
 */
let accessToken: string | null = null;
let onSignedOut: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSignedOutHandler(handler: () => void) {
  onSignedOut = handler;
}

function send(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(path, { ...init, headers, credentials: 'include' });
}

let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as { accessToken: string };
      setAccessToken(body.accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);

  if (res.status === 401 && !path.endsWith('/auth/refresh') && (await refreshSession())) {
    res = await send(path, init);
  }

  if (res.status === 401) {
    setAccessToken(null);
    onSignedOut?.();
    throw new ApiError('Your session has ended. Please sign in again.', 401);
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? 'Request failed', res.status);
  return body as T;
}
