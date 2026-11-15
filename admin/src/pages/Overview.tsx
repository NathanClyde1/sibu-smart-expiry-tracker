import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Category, type Centre, type Stats } from '../api';

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [statsRes, centresRes, categoriesRes] = await Promise.all([
          api<Stats>('/api/admin/stats'),
          api<{ centres: Centre[] }>('/api/admin/centres'),
          api<{ categories: Category[] }>('/api/admin/categories'),
        ]);
        setStats(statsRes);
        setCentres(centresRes.centres);
        setCategories(categoriesRes.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load overview');
      }
    })();
  }, []);

  const unverified = centres.filter((centre) => !centre.isVerified);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">What the mobile app will sync from this database.</p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="stat-grid">
        <div className="card stat">
          <span className="stat-label">Recycling centres</span>
          <strong>{stats?.centres ?? '—'}</strong>
          <small>{stats ? `${stats.verifiedCentres} verified` : ''}</small>
        </div>
        <div className="card stat">
          <span className="stat-label">Item categories</span>
          <strong>{stats?.categories ?? '—'}</strong>
          <small>drive disposal advice</small>
        </div>
        <div className="card stat">
          <span className="stat-label">Households</span>
          <strong>{stats?.households ?? '—'}</strong>
          <small>registered accounts</small>
        </div>
        <div className="card stat">
          <span className="stat-label">Needs review</span>
          <strong>{unverified.length}</strong>
          <small>unverified centres</small>
        </div>
      </div>

      <div className="two-col">
        <section className="card">
          <header className="card-head">
            <h2>Unverified centres</h2>
            <Link className="btn btn-quiet" to="/centres">
              Manage
            </Link>
          </header>
          {unverified.length === 0 ? (
            <p className="muted empty">Every centre is verified.</p>
          ) : (
            <ul className="plain-list">
              {unverified.map((centre) => (
                <li key={centre.id}>
                  <strong>{centre.name}</strong>
                  <small>{centre.address}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <h2>Disposal split</h2>
            <Link className="btn btn-quiet" to="/categories">
              Manage
            </Link>
          </header>
          <ul className="plain-list">
            {(['recycle', 'compost', 'general', 'special'] as const).map((method) => (
              <li key={method} className="split-row">
                <span className={`badge badge-${method}`}>{method}</span>
                <strong>{categories.filter((category) => category.disposalMethod === method).length}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
