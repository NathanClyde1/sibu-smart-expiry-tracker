# Smart Expiry and Local Disposal Guide

Auth + admin backend for a Sibu food-waste app. The mobile client logs households in; the web
console lets council administrators maintain the recycling centres and item categories the app
shows.

**Built so far:** secure authentication (household and admin) and the web admin dashboard.
The pantry, offline cache, notifications and map are not implemented — see `AGENTS.md`.

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

`mobile/` is a Flutter app: sign in, create a household, view the account, sign out. It stores the
refresh token in the platform keychain and refreshes access tokens automatically.

```bash
cd mobile
flutter create --platforms=android,ios .   # generates android/ and ios/ (not committed)
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

`10.0.2.2` is the Android emulator's route to the host. On a physical device use your machine's LAN
IP and enable cleartext HTTP for debug builds.

## Security notes

- Access tokens last 15 minutes and live in memory in the browser, never in storage.
- Refresh tokens are rotated on every use and stored hashed; replay revokes the family.
- Passwords are scrypt-hashed. Registration cannot create an admin.
- Login is rate limited per IP and email.
- Seeded coordinates are approximate and must be verified before the app routes anyone with them.
