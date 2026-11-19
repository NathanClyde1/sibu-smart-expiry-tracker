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
| `npm run setup:features` | Create the Flutter feature folders and print the branch rules |
| `npm run setup:features -- --check` | Report only; exits 1 if a feature file is missing |

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

## Team workflow (4 developers)

Two projects, four feature owners. Each developer works inside **one** feature folder and nothing
else, so two people never edit the same file.

| Owner | Feature folder | Branch prefix | Screen file |
| --- | --- | --- | --- |
| Member 1 | `flutter_mobile_app/lib/features/dashboard/` | `feature/dashboard-*` | `screens/dashboard_screen.dart` |
| Member 2 | `flutter_mobile_app/lib/features/map_disposal/` | `feature/map-disposal-*` | `screens/map_disposal_screen.dart` |
| Member 3 | `flutter_mobile_app/lib/features/sync_alerts/` | `feature/sync-alerts-*` | `screens/sync_alerts_screen.dart` |
| Member 4 | `flutter_mobile_app/lib/features/auth/` | `feature/auth-*` | `screens/login_screen.dart` |
| Tech lead | `lib/main.dart`, `lib/core/`, `lib/features/shell/`, `pubspec.yaml` | `chore/*`, `fix/*` | `shell/main_navigation_screen.dart` |

**Shared files are tech-lead only.** `main.dart`, `lib/core/` (theme, config, shared widgets),
`lib/features/shell/` (the bottom-nav shell) and `pubspec.yaml` are owned by the lead. If a feature
needs a new dependency or a new tab, ask — do not edit them in a feature branch, because that is the
one place two branches will conflict.

### Rules

1. **Never commit to `main`.** Branch from an up-to-date `main`:
   ```bash
   git switch main && git pull
   git switch -c feature/dashboard-expiry-countdown
   ```
2. **One branch, one feature, one screen.** Stay inside your feature folder. If you need something
   from `core/`, read it; don't change it.
3. **Commit style:** `feat(<feature>): <what changed>`, `fix(<feature>): ...`,
   `test(<feature>): ...`. Feature names are `auth`, `dashboard`, `map-disposal`, `sync-alerts`.
4. **Pull `main` before opening a PR** and fix conflicts in your branch, not in `main`:
   ```bash
   git fetch origin && git rebase origin/main
   ```
5. **Every PR needs one reviewer** (the tech lead for shared-file changes, a teammate otherwise)
   and must build: `cd flutter_mobile_app && flutter analyze && flutter test`.
6. **Squash-merge into `main`.** One feature, one commit on `main`. Never force-push `main`.
7. **Delete the branch after merge.** `git switch main && git pull && git branch -d <branch>`.

### Scaffolding

`npm run setup:features` creates any missing feature folders and lists the ownership table. It
**never writes Dart source**, so it cannot overwrite work in progress. If a starter file is
missing, restore it from `main`:

```bash
git checkout main -- flutter_mobile_app/lib
```

## Mobile client

`flutter_mobile_app/` is a Flutter app: sign in, create a household, view the account, sign out.
Authentication runs on **Supabase Auth**; the session is persisted by `supabase_flutter` in platform
secure storage. The signed-in shell is a four-tab bottom nav (Pantry, Dispose, Alerts, Account)
wired in `lib/features/shell/main_navigation_screen.dart`.

```bash
cd flutter_mobile_app
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
