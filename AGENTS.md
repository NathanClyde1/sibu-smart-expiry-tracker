# AGENTS.md

Context for anyone (human or AI) picking this repo up.

## What this project is

**Smart Expiry and Local Disposal Guide** — an app for households in Sibu, Sarawak, to waste less
food and dispose of what is left correctly.

The full concept has six parts. **Only the first two are built:**

| Part | Status |
| --- | --- |
| Secure authentication | built — mobile uses **Supabase Auth**, admin console uses the local API |
| Web admin backend (Sibu recycling centres, item categories) | built |
| Flutter mobile client (login, register, account) | written, **not compiled** — no Flutter SDK on the build machine |
| Pantry / expiry tracker | not started |
| SQLite offline cache + notifications | not started |
| GPS map of recycling centres | not started |

## ⚠️ Two backends, on purpose, for now

```
Flutter app  ──> Supabase (Auth + Postgres)          <- households
React admin  ──> Express API ──> SQLite (server/data) <- council staff
```

The mobile app is being built against Supabase because the team standardised on it. The admin
console still runs on the Express API that was written first. **These are two separate user stores
and two separate databases.**

The duplication is already real: recycling centres exist twice, as `recycling_centers` in Supabase
and `recycling_centres` in SQLite. Edits in the admin console do **not** reach the app. That is the
one open architectural decision in this repo: point the admin console at Supabase and retire the
Express API, or keep the split and accept it. Do not add a third path.

Note the spelling difference when you do: Supabase uses `recycling_centers` (US), SQLite uses
`recycling_centres` (UK).

## Layout

```
server/              Express + TypeScript API, SQLite via better-sqlite3, node:test suite
admin/               React 18 + Vite admin console (SPA, talks to /api through the Vite proxy)
flutter_mobile_app/  Flutter 3 client, split into feature folders (4 developers)
supabase/            SQL to run once in the Supabase project
scripts/             setup-features.mjs - folder scaffolding + ownership report
```

npm workspaces cover `server` and `admin`. `flutter_mobile_app/` is a separate Flutter project.

Inside the Flutter app, each feature owns one folder so branches do not collide:

```
lib/main.dart                          tech lead - auth-state routing
lib/core/                              tech lead - theme.dart, config.dart, widgets/
lib/features/shell/                    tech lead - bottom-nav shell
lib/features/auth/                     Member 4 - screens, services, widgets
lib/features/dashboard/                Member 1 - screens
lib/features/map_disposal/             Member 2 - screens
lib/features/sync_alerts/              Member 3 - screens
```

Branch rules live in `README.md` ("Team workflow"). Shared files - `main.dart`, `core/`,
`features/shell/`, `pubspec.yaml` - are tech-lead changes only.

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

Mobile:

```bash
cd flutter_mobile_app
flutter create --platforms=android,ios .   # generates android/ and ios/ (not committed)
flutter pub get
flutter run
```

`flutter_mobile_app/lib/core/config.dart` holds the Supabase URL and publishable key, overridable
with `--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`.

**Before the mobile app works, run `supabase/schema.sql` in the Supabase SQL editor.** Without it
there is no `profiles` table, so signup leaves no profile and `isAdmin()` always returns false.

## Authentication — mobile (Supabase)

`flutter_mobile_app/lib/features/auth/services/auth_service.dart` is the only auth entry point. It
wraps `supabase_flutter`, which also persists the session in platform secure storage — there is no
token code in this repo.

- `signUp` sends `data: {full_name}`; the `handle_new_user` trigger copies it into `public.profiles`.
- `isAdmin()` reads `profiles.is_admin`, returning `false` instead of throwing when the row is
  missing or RLS hides it.
- `profiles.is_admin` is **not client-writable**, but only because of the column grants at the
  bottom of `supabase/schema.sql`. This was verified the hard way: before those grants were
  applied, a signed-in household user could PATCH their own row and set `is_admin = true`.
  Row-level security does not stop that — the row *is* theirs, so the policy allows it. Never
  remove the revoke/grant block.
- Check it with `select has_column_privilege('authenticated','public.profiles','is_admin','UPDATE');`
  — it must return `false`.
- If email confirmation is enabled, `signUp` returns a null session and the register screen tells
  the user to confirm before signing in. Handle both cases.
- Promote an admin with SQL: `update public.profiles set is_admin = true where id = '<uuid>';`

The publishable (`sb_publishable_...`) key is meant to ship in clients. Never put the secret /
`service_role` key in the app.

## Authentication — admin console (Express)

- **Access token**: HS256 JWT, 15 min, `Authorization: Bearer`. Stateless.
- **Refresh token**: 32 random bytes, 30 days, stored **hashed** in `refresh_tokens`, rotated on
  every use. Replaying a used token revokes every session for that user — deliberate, do not "fix" it.
- The browser receives the refresh token only as an `httpOnly`, `SameSite=Strict` cookie scoped to
  `/api/auth`. The SPA keeps the access token in memory, so no token touches `localStorage`.
- Passwords: `scrypt`, `scrypt$<salt>$<hash>` in one column. Do not add bcrypt.
- Roles: `household` | `admin`. **Registration always creates `household`.** Never accept `role`
  from a request body.
- Login/registration are rate limited in memory (10 attempts per 15 min per IP+email).

`/api/admin/*` is gated by `authenticate` + `requireAdmin`. Keep that ordering.

## Data model

**SQLite** (`server/src/db.ts`, `CREATE TABLE IF NOT EXISTS`, no migration runner yet):
`users`, `refresh_tokens`, `recycling_centres`, `item_categories`.

`disposal_method` is `recycle | compost | general | special` and drives the advice the app will
show. `accepted_materials` is a JSON string in SQLite, an array over the API.

**Supabase** (columns confirmed against the live project):

| Table | Columns |
| --- | --- |
| `profiles` | `id`, `full_name`, `household_size`, `is_admin`, `created_at` |
| `pantry_items` | `id`, `user_id`, `item_name`, `expiry_date`, `category`, `quantity`, `image_url`, `status` |
| `recycling_centers` | `id`, `name`, `address`, `latitude`, `longitude`, `accepted_materials`, `created_at` |

Two differences from the SQLite side that will bite later:

- **There is no category table in Supabase.** `pantry_items.category` is free text, while the admin
  console manages a `item_categories` table with a `disposal_method`. If the app is to show
  disposal advice per item, either add a categories table to Supabase or map the text to a fixed
  enum in the client. Decide before building the suggestion screen.
- `recycling_centers` has no `is_verified`, `opening_hours` or `notes` column, so the admin
  console's verification workflow cannot move over as-is.

`supabase/schema.sql` in this repo sets up `profiles` (table, signup trigger, RLS, column grants).
Re-running it is safe and only fills in what is missing.

## Seeded data is unverified

The Tzu-Chi and Jalan Pahlawan entries come from the project brief. **All coordinates are
approximate town-level positions.** The other two centres are placeholders. Before anything routes
a real user, an administrator must correct them and tick "Verified".

## Conventions

- TypeScript strict everywhere. Server is ESM (`"type": "module"`), so relative imports need `.js`.
- No ORM. `better-sqlite3` prepared statements, written inline in the route file that owns them.
- Validation with zod at every trust boundary; return `{ error: string }` with 4xx.
- API responses are camelCase; database columns are snake_case; serializers convert.
- Admin UI: hand-written CSS in `admin/src/styles.css`, no UI library, no Tailwind. Reuse
  `.card`, `.btn`, `.badge`, `.field` rather than inventing new styles.
- Flutter: Material 3, seed colour `#1F7A52`, shared chrome in
  `lib/features/auth/widgets/auth_scaffold.dart`, feature screens in `lib/features/*/screens/`,
  services in `lib/features/*/services/`, shared widgets in `lib/core/widgets/`. Use `SurfaceCard`
  rather than inventing a new card style.

## Gotchas

- `npm run dev -w server` runs with `cwd=server`, so `env.ts` loads `.env` from **both** `server/`
  and the repo root. Keep that when adding env files.
- `DATABASE_PATH` is resolved against the repo root, not the cwd.
- Changing `JWT_SECRET` invalidates every session — expected, but surprising in dev.
- SQLite on Windows locks the file; stop the API before deleting `server/data/app.db`.
- `flutter_mobile_app/` has no `android/` or `ios/` folders until `flutter create` is run.

## Next modules: where they plug in

- Pantry items: the table already exists (`pantry_items`). Use the real columns — `user_id`,
  `item_name`, `expiry_date`, `category`, `quantity`, `image_url`, `status` — and confirm RLS is
  on with `user_id = auth.uid()` before shipping, since that policy is what stops one household
  reading another's groceries.
- Recycling centres for the app: read `recycling_centers` from Supabase. The admin console writes
  to SQLite, so either point it at Supabase or the app will show stale data.
- Offline cache: sqflite mirror of `pantry_items`, not of the centres (centres should stay fresh).
- Notifications: `flutter_local_notifications` + a scheduled local check; no push server yet.
