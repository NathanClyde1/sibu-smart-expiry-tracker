import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api, refreshSession, setAccessToken, setSignedOutHandler, type User } from './api';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import Centres from './pages/Centres';
import Login from './pages/Login';
import Overview from './pages/Overview';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setSignedOutHandler(() => setUser(null));

    void (async () => {
      // A reload has no access token; the httpOnly cookie is the only way back in.
      if (await refreshSession()) {
        try {
          const { user: me } = await api<{ user: User }>('/api/auth/me');
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }

  if (booting) {
    return (
      <div className="boot">
        <span className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) return <Login onSignedIn={setUser} />;

  if (user.role !== 'admin') {
    return (
      <div className="boot">
        <div className="notice">
          <h2>Administrator access required</h2>
          <p>
            You are signed in as <strong>{user.email}</strong>, a household account. The recycling
            directory is managed by council administrators only.
          </p>
          <button className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout user={user} onSignOut={signOut}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/centres" element={<Centres />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
