# AGENTS.md

Context for anyone (human or AI) picking this repo up.

## What this project is

**Smart Expiry and Local Disposal Guide** — an app for households in Sibu, Sarawak, to waste less
food and dispose of what is left correctly.

The full concept has six parts. **Only two are built so far:**

| Part | Status |
| --- | --- |
| Secure authentication (household + admin) | built |
| Web admin backend (Sibu recycling centres, item categories) | built |
| Flutter mobile client (auth screens only) | written, **not compiled** — no Flutter SDK on the build machine |
| Pantry / expiry tracker | not started |
| SQLite offline cache + notifications | not started |
| GPS map of recycling centres | not started |

Do not assume the remaining modules exist. When adding them, follow the patterns below.

## Layout

```
server/   Express + TypeScript API, SQLite via better-sqlite3, node:test suite
admin/    React 18 + Vite admin console (SPA, talks to /api through the Vite proxy)
mobile/   Flutter 3 client: login, register, account
```

npm workspaces. One `npm install` at the root covers `server` and `admin`.

## Run it

```bash
cp .env.example .env      # then set JWT_SECRET
npm install
npm run dev               # API :4000, admin :5173
npm test                  # 20 API tests, temp database, no server needed
npm run build             # tsc + vite build
```

First boot seeds an admin account from `SEED_ADMIN_*`, 4 Sibu recycling centres and 13 item
categories. Seeding is idempotent: it only fills empty tables and never resets a password.

## Authentication model

- **Access token**: HS256 JWT, 15 min, sent as `Authorization: Bearer`. Stateless.
- **Refresh token**: 32 random bytes, 30 days, stored **hashed** (SHA-256) in `refresh_tokens`.
  Rotated on every use. Replaying a used token revokes every session for that user — that is
  deliberate, do not "fix" it.
- **Browser** clients receive the refresh token only as an `httpOnly`, `SameSite=Strict` cookie
  scoped to `/api/auth`. The admin SPA keeps the access token in a module variable (memory), so no
  token ever touches `localStorage`.
- **Mobile** clients send `X-Client: mobile` on login/refresh and receive the refresh token in the
  JSON body, which they store in `flutter_secure_storage`.
- Passwords: `scrypt` with a per-user salt, `scrypt$<salt>$<hash>` in one column. Never add bcrypt
  or another hashing dependency.
- Roles: `household` | `admin`. **Registration always creates `household`.** Never accept `role`
  from a request body. Admin accounts come from the seed or a manual DB change.
- Login/registration are rate limited in memory (10 attempts per 15 min per IP+email).

`/api/admin/*` is gated by `authenticate` + `requireAdmin`. Keep that ordering.

## Data model

`users`, `refresh_tokens`, `recycling_centres`, `item_categories`. Schema lives inline in
`server/src/db.ts` as `CREATE TABLE IF NOT EXISTS` — there is no migration runner yet. Adding a
column means editing that block plus handling existing databases (see below).

`disposal_method` is one of `recycle | compost | general | special` and drives the advice the app
will show. `accepted_materials` is a JSON string in SQLite, an array over the API.

## Seeded data is unverified

The Tzu-Chi and Jalan Pahlawan entries come from the project brief. **All coordinates are
approximate town-level positions.** The other two centres are placeholders. Before anything routes
a real user, an administrator must correct them and tick "Verified" — `is_verified` exists exactly
for that reason.

## Conventions

- TypeScript strict everywhere. Server is ESM (`"type": "module"`), so relative imports need `.js`.
- No ORM. `better-sqlite3` prepared statements, written inline in the route file that owns them.
- Validation with zod at every trust boundary; return `{ error: string }` with 4xx.
- API responses are camelCase; database columns are snake_case; serializers convert.
- Admin UI: hand-written CSS in `admin/src/styles.css`, no UI library, no Tailwind. Reuse
  `.card`, `.btn`, `.badge`, `.field` rather than inventing new styles.
- Flutter: Material 3, seed colour `#1F7A52`, shared chrome in `widgets/auth_scaffold.dart`.

## Gotchas

- `npm run dev -w server` runs with `cwd=server`, so `env.ts` loads `.env` from **both** `server/`
  and the repo root. Keep that when adding env files.
- `DATABASE_PATH` is resolved against the repo root, not the cwd.
- Changing `JWT_SECRET` invalidates every session — expected, but surprising in dev.
- SQLite on Windows locks the file; stop the API before deleting `server/data/app.db`.
- The Flutter app targets `http://10.0.2.2:4000` by default (Android emulator → host). Override
  with `--dart-define=API_BASE_URL=http://<lan-ip>:4000` on a real device, and note that plain
  HTTP needs `android:usesCleartextTraffic="true"` in the debug manifest.
- `mobile/` has no `android/` or `ios/` folders. Run `flutter create --platforms=android,ios .`
  inside it once to generate them.

## Next modules: where they plug in

- Pantry items: new `pantry_items` table with `user_id`, photo path, expiry date, category id.
  Reachable from `/api/inventory`, household role only.
- Public read API for the app: `GET /api/centres` and `GET /api/categories` without admin gating.
  Keep the admin routes separate.
- Offline cache: sqflite mirror of the pantry, not of the centres (centres should stay fresh).
- Notifications: `flutter_local_notifications` + a scheduled local check; no push server yet.
