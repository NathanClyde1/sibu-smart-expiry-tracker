#!/usr/bin/env node
// Prepares the Flutter app for a four-developer split and reports what is
// missing. Creates the feature folders if someone cloned before they existed;
// never writes Dart source, so it can never clobber a teammate's work.
//
//   node scripts/setup-features.mjs          # create folders, report gaps
//   node scripts/setup-features.mjs --check  # report only, exit 1 if incomplete

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = join(repoRoot, 'flutter_mobile_app');
const libRoot = join(appRoot, 'lib');

const OWNERS = [
  ['Member 1 - Dashboard', 'dashboard'],
  ['Member 2 - Map & disposal', 'map_disposal'],
  ['Member 3 - Sync & alerts', 'sync_alerts'],
  ['Member 4 - Auth', 'auth'],
  ['Tech lead', 'shell'],
];

// [feature, file relative to the feature folder]
const EXPECTED = [
  ['auth', 'services/auth_service.dart'],
  ['auth', 'screens/login_screen.dart'],
  ['auth', 'screens/register_screen.dart'],
  ['auth', 'screens/account_screen.dart'],
  ['auth', 'widgets/auth_scaffold.dart'],
  ['dashboard', 'screens/dashboard_screen.dart'],
  ['map_disposal', 'screens/map_disposal_screen.dart'],
  ['sync_alerts', 'screens/sync_alerts_screen.dart'],
  ['shell', 'main_navigation_screen.dart'],
];

if (!existsSync(appRoot)) {
  console.error(`[setup] ${appRoot} does not exist. Run this from the repo root.`);
  process.exit(1);
}

const directories = new Set([
  'core/widgets',
  ...EXPECTED.map(([feature, file]) => `features/${feature}/${dirname(file)}`),
]);

for (const directory of directories) {
  mkdirSync(join(libRoot, directory), { recursive: true });
}

const missing = EXPECTED.filter(([feature, file]) => !existsSync(join(libRoot, 'features', feature, file)));

for (const [feature, file] of missing) {
  console.warn(`[setup] missing: ${relative(repoRoot, join(libRoot, 'features', feature, file))}`);
}

console.log('\nFolder ownership\n');
for (const [owner, feature] of OWNERS) {
  const path = `flutter_mobile_app/lib/features/${feature}/`;
  console.log(`  ${owner.padEnd(26)} ${feature.padEnd(14)} ${path}`);
}

console.log(`
Branch per feature (never commit to main)

  git switch main && git pull
  git switch -c feature/<feature>-<short-task>
  # ... work only inside flutter_mobile_app/lib/features/<feature>/
  git add -A && git commit -m "feat(<feature>): <what changed>"
  git push -u origin HEAD

  feature/auth-<task>          Member 4
  feature/dashboard-<task>     Member 1
  feature/map-disposal-<task>  Member 2
  feature/sync-alerts-<task>   Member 3

Shared files (main.dart, core/, shell/, pubspec.yaml) are tech-lead changes.
Open the PR with a reviewer and squash-merge into main.
`);

if (missing.length > 0) {
  console.warn(`[setup] ${missing.length} expected file(s) missing. Restore them with:`);
  console.warn('  git checkout main -- flutter_mobile_app/lib\n');

  if (process.argv.includes('--check')) process.exit(1);
}
