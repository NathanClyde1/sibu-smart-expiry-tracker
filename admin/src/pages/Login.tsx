import { useState, type FormEvent } from 'react';
import { api, setAccessToken, type User } from '../api';

export default function Login({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api<{ accessToken: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(result.accessToken);

      if (result.user.role !== 'admin') {
        await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        setAccessToken(null);
        setError('That account is a household account. Only administrators can open this console.');
        return;
      }

      onSignedIn(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-aside">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♻
          </span>
          <div>
            <strong>Sibu Disposal Guide</strong>
            <small>Local recycling &amp; disposal</small>
          </div>
        </div>
        <h1>Keep Sibu&rsquo;s recycling directory accurate.</h1>
        <p>
          Update verified drop-off points, opening hours and accepted materials. Changes reach the
          mobile app on its next sync.
        </p>
        <ul>
          <li>Council-verified locations only</li>
          <li>Item categories drive in-app disposal advice</li>
          <li>Every change is timestamped</li>
        </ul>
      </section>

      <section className="login-main">
        <form className="card login-card" onSubmit={submit}>
          <h2>Administrator sign in</h2>
          <p className="muted">Household accounts cannot access this console.</p>

          {error && <div className="alert">{error}</div>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@sibu.gov.my"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
