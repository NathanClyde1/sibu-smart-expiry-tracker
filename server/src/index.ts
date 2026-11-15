import { createApp } from './app.js';
import { env } from './env.js';
import './db.js';
import { runSeed } from './seed.js';

// Idempotent: creates the admin account from env and seeds Sibu data once.
await runSeed();

const app = createApp();

app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port}`);
  if (!env.isProd) console.log('[api] dev mode - admin web app expected on http://localhost:5173');
});
