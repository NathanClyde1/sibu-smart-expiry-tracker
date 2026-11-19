# Smart Expiry and Local Disposal Guide

Auth + admin backend for a Sibu food-waste app. Households sign in through Supabase Auth in the
Flutter client; the web console lets council administrators maintain the recycling centres and
item categories the app shows.

**Built so far:** secure authentication (household via Supabase, admin via the local API) and the
web admin dashboard. The pantry, offline cache, notifications and map are not implemented — see
`AGENTS.md` for the open backend decision.

## Quick start

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # paste into JWT_SECRET
npm install
npm run dev
```

- Admin console: <http://localhost:5173>
- API: <http://localhost:4000/api/health>
- Seeded sign-in: `admin@sibu.gov.my` / the `SEED_ADMIN_PASSWORD` in your `.env`

The database is created and seeded on first start at `server/data/app.db`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (:4000) and admin console (:5173) together |
| `npm test` | API test suite (temp DB, no server required) |
| `npm run build` | Type-check and build both packages |
| `npm run seed` | Re-run seeding by hand (idempotent) |

## API

| Method | Path | Who |
| --- | --- | --- |
| POST | `/api/auth/register` | anyone — always creates a household |
| POST | `/api/auth/login` | anyone |
| POST | `/api/auth/refresh` | cookie or `refreshToken` body |
| POST | `/api/auth/logout` | authenticated |
| GET | `/api/auth/me` | authenticated |
| GET/POST | `/api/admin/centres` | admin |
| PATCH/DELETE | `/api/admin/centres/:id` | admin |
| GET/POST | `/api/admin/categories` | admin |
| PATCH/DELETE | `/api/admin/categories/:id` | admin |
| GET | `/api/admin/stats` | admin |

## Mobile client

`mobile/` is a Flutter app: sign in, create a household, view the account, sign out. Authentication
runs on **Supabase Auth**; the session is persisted by `supabase_flutter` in platform secure
storage.

```bash
cd mobile
flutter create --platforms=android,ios .   # generates android/ and ios/ (not committed)
flutter pub get
flutter run
```

**One-time setup:** run `supabase/schema.sql` in the Supabase SQL editor. It creates `profiles`,
the trigger that fills it on signup, and the row-level security that keeps `is_admin` out of reach
of the client.

Point at a different project with
`--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`.


## Security notes

- Household accounts are Supabase identities; admins are local API accounts. They are separate
  stores today — see `AGENTS.md` for the open decision.
- Admin access tokens last 15 minutes and live in memory in the browser, never in storage.
- Admin refresh tokens are rotated on every use and stored hashed; replay revokes the family.
- Passwords are scrypt-hashed on the API; Supabase hashes its own.
- Registration cannot create an admin on either side.
- `profiles.is_admin` is not client-writable — RLS plus column grants.
- Login is rate limited per IP and email on the API.
- Seeded coordinates are approximate and must be verified before the app routes anyone with them.
