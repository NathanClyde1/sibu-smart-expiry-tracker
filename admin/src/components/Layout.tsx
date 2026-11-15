import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { User } from '../api';

export default function Layout({
  user,
  onSignOut,
  children,
}: {
  user: User;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♻
          </span>
          <div>
            <strong>Sibu Disposal Guide</strong>
            <small>Admin console</small>
          </div>
        </div>

        <nav>
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/centres">Recycling centres</NavLink>
          <NavLink to="/categories">Item categories</NavLink>
        </nav>

        <div className="sidebar-foot">
          <span className="avatar" aria-hidden="true">
            {user.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="who">
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <button className="btn btn-quiet btn-block" onClick={onSignOut}>
          Sign out
        </button>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
