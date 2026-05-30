/**
 * Post-build script: stamps the service worker with a unique cache version.
 *
 * After `vite build` copies `public/service-worker.js` into `build/`, this
 * script reads it, replaces the `__CACHE_VERSION__` placeholder with a string
 * derived from the package version and a hash of the build asset filenames,
 * then writes the file back.  Changing the cache version on every deploy
 * ensures browsers install the new service worker and clear the old cache.
 *
 * Usage (via package.json "build" script):
 *   vite build && node scripts/generate-sw.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const rootDir = process.cwd();
const swPath = path.join(rootDir, 'build', 'service-worker.js');
const assetsDir = path.join(rootDir, 'build', 'assets');
const pkgPath = path.join(rootDir, 'package.json');

if (!existsSync(swPath)) {
  console.error('[generate-sw] service-worker.js not found in build/. Run vite build first.');
  process.exit(1);
}

// Read the app version from package.json.
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const appVersion = pkg.version || '0.0.0';

// Compute a short hash of all asset filenames so the cache version changes
// whenever any output file changes (and only then).
let assetHash = 'dev';
if (existsSync(assetsDir)) {
  const names = readdirSync(assetsDir).sort().join(',');
  assetHash = crypto.createHash('sha256').update(names).digest('hex').slice(0, 8);
}

const cacheVersion = `${appVersion}-${assetHash}`;

const original = readFileSync(swPath, 'utf-8');
if (!original.includes('__CACHE_VERSION__')) {
  console.warn('[generate-sw] __CACHE_VERSION__ placeholder not found in service-worker.js — skipping stamp.');
  process.exit(0);
}

const stamped = original.replace('__CACHE_VERSION__', cacheVersion);
writeFileSync(swPath, stamped, 'utf-8');

console.log(`[generate-sw] Service worker stamped: opentristam-${cacheVersion}`);
