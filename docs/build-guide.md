# DiabloWeb Build Guide

This guide covers everything you need to develop, test, and build DiabloWeb locally — from a first-time clone through production deployment.

---

## Contents

- [Prerequisites](#prerequisites)
- [Cloning the Repository](#cloning-the-repository)
- [Installing Dependencies](#installing-dependencies)
- [Development Server](#development-server)
- [Running Tests](#running-tests)
- [Production Build](#production-build)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Rebuilding the WebAssembly Modules](#rebuilding-the-webassembly-modules)
- [Environment Variables](#environment-variables)
- [Common Issues](#common-issues)

---

## Prerequisites

| Tool | Required version | Notes |
|---|---|---|
| **Node.js** | 20.x (LTS) | Older versions hit OpenSSL compatibility issues with Webpack 4 |
| **npm** | 9+ (bundled with Node 20) | Do not use Yarn — lockfile is npm-only |
| **Git** | Any recent version | — |

Check your versions:

```bash
node --version   # should print v20.x.x
npm --version    # should print 9.x or higher
```

No other system tools are required. The WASM binaries are pre-built and checked into the repo (`src/api/Diablo.jscc`, `src/api/DiabloSpawn.jscc`, `src/mpqcmp/MpqCmp.jscc`).

---

## Cloning the Repository

```bash
git clone https://github.com/d07RiV/diabloweb.git
cd diabloweb
```

---

## Installing Dependencies

```bash
npm ci --legacy-peer-deps
```

**Why these flags?**

- `--legacy-peer-deps` — `sass-loader@9` and `peerjs@1.4.7` declare peer dependency ranges that don't resolve cleanly under npm 7+. This flag restores the npm 6 resolution behavior and is required.
- `npm ci` instead of `npm install` — ensures a reproducible install from the lockfile rather than re-resolving ranges.
- `--ignore-scripts` is used in CI but is not needed locally unless you want to skip optional post-install scripts.

The install should complete in under two minutes on a standard connection. There are no native module builds — the old `node-sass` dependency has been replaced with `sass` (Dart Sass).

---

## Development Server

```bash
npm start
```

This starts `webpack-dev-server` on **http://localhost:3000** with hot module replacement enabled.

### Shareware mode (no game files needed)

Place `spawn.mpq` in the `public/` folder before starting the dev server:

```bash
cp /path/to/spawn.mpq public/spawn.mpq
npm start
```

The dev server will serve `spawn.mpq` and the game will load the shareware version automatically. If `spawn.mpq` is absent, the site will attempt to download it from the CDN hosted alongside the live demo.

### Retail mode

You do not need to place `DIABDAT.MPQ` anywhere on disk. Instead, drag and drop it onto the running browser window. The file is read in-browser and stored in IndexedDB — it never touches your local filesystem through Node.

### Port conflicts

If port 3000 is in use, the dev server auto-selects the next available port and prints the URL to the terminal.

---

## Running Tests

```bash
npm test
```

In a local terminal this runs Jest in **interactive watch mode**. To run all tests once without watching:

```bash
npm test -- --watchAll=false
```

To run tests with coverage:

```bash
npm test -- --watchAll=false --coverage
```

Coverage is collected from all files matching `src/**/*.{js,jsx,ts,tsx}`.

### What is tested

| Module | Test file |
|---|---|
| Codec (SHA1 stream cipher, MPQ crypto) | `src/api/codec.test.js` |
| Packet serialization / multiplayer protocol | `src/api/packet.test.js` |
| Save-file parsing | `src/api/savefile.test.js` |
| Sound API | `src/api/sound.test.js` |
| Drag-and-drop detection | `src/input/fileDrop.test.js` |
| File-drop target lifecycle | `src/input/fileDropTarget.test.js` |
| Event listener lifecycle | `src/input/eventListeners.test.js` |
| Touch controls | `src/input/touchControls.test.js` |

Web Worker code and WASM-dependent modules are not unit-tested (they require a real browser environment). Use the dev server for manual testing of the engine, audio, and multiplayer paths.

---

## Production Build

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

Or, since `NODE_OPTIONS` is set in the CI workflow:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
npm run build
```

**Why `--openssl-legacy-provider`?**

Webpack 4 uses the MD4 hash algorithm internally, which was removed from OpenSSL 3 (the default in Node 17+). This flag re-enables the legacy OpenSSL provider. This will no longer be needed once the bundler is upgraded to Vite or Webpack 5 (tracked in Phase 2 of the roadmap).

The production bundle is written to `build/`. It includes:

| Output | Description |
|---|---|
| `build/static/js/` | Chunked JS bundles (main + vendor splits) |
| `build/static/css/` | Minified CSS |
| `build/service-worker.js` | Workbox-generated PWA service worker |
| `build/manifest.json` | PWA manifest |
| `build/index.html` | Entry point with injected script tags |
| `build/storage.html` | Cross-origin storage migration helper |

The build script also prints a gzip size report and warns if any bundle exceeds 512 KB.

### Serving the build locally

Any static file server works:

```bash
npx serve -s build
# or
python3 -m http.server 5000 --directory build
```

Open `http://localhost:5000` (or whatever port the server prints).

> **Note:** The app uses a service worker. If you serve from a different port than your dev server, the browser may have a stale service worker cached. Open DevTools → Application → Service Workers → click **Unregister** to clear it.

---

## Deploying to GitHub Pages

The `deploy` script uses [gh-pages](https://github.com/tschaub/gh-pages) to push the `build/` directory to the `gh-pages` branch of the repository.

```bash
npm run build       # build first
npm run deploy      # push build/ to the gh-pages branch
```

This requires push access to the repository. The live site at [https://d07RiV.github.io/diabloweb/](https://d07RiV.github.io/diabloweb/) is served from that branch.

---

## Rebuilding the WebAssembly Modules

The pre-built WASM binaries are committed to the repository. You only need to rebuild them if you are modifying the C++ game engine.

The C++ source lives in the separate [d07RiV/devilution](https://github.com/d07RiV/devilution) repository, which is a fork of [diasurgical/devilution](https://github.com/diasurgical/devilution) with modifications to:

- Remove all platform-specific dependencies.
- Expose the minimal JS-callable interface (`DApi_*` functions).
- Adapt event handling to an asynchronous, message-passing model.

### Build environment

Emscripten is required to compile the C++ source to WebAssembly.

```bash
# Install Emscripten SDK (one-time setup)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Compile

Follow the build instructions in [d07RiV/devilution](https://github.com/d07RiV/devilution). The output files are:

| Output file | Destination in this repo |
|---|---|
| `Diablo.js` / `Diablo.wasm` | Compiled into `src/api/Diablo.jscc` |
| `DiabloSpawn.js` / `DiabloSpawn.wasm` | Compiled into `src/api/DiabloSpawn.jscc` |
| `MpqCmp.js` / `MpqCmp.wasm` | Compiled into `src/mpqcmp/MpqCmp.jscc` |

The `.jscc` extension is the convention used by this project for Emscripten JS-glue files that are imported by `worker-loader`.

After replacing the `.jscc` files, run `npm run build` and verify the game boots correctly.

---

## Environment Variables

The following environment variables affect the build. They are read from the process environment — you can set them in your shell or in a `.env` file at the repo root (dotenv is supported).

| Variable | Default | Purpose |
|---|---|---|
| `NODE_OPTIONS` | — | Set to `--openssl-legacy-provider` when running Node 17+ with Webpack 4 |
| `CI` | — | When set to `true`, `npm test` runs without watch mode; the build treats warnings as errors. Set to `false` to suppress warning-as-error behavior during local builds. |
| `PORT` | `3000` | Dev server port (auto-incremented if in use) |
| `BROWSER` | `true` | Set to `none` to prevent the dev server from auto-opening a browser tab |
| `PUBLIC_URL` | `/diabloweb` | Base path injected by Webpack's `DefinePlugin`; matches the `homepage` field in `package.json` |

For local development, `CI=false` is the most useful override:

```bash
CI=false npm run build
```

This suppresses ESLint warning-as-error behavior and the `CI=true` build-time checks.

---

## Common Issues

### `Error: error:0308010C:digital envelope routines::unsupported`

**Cause:** Node 17+ with Webpack 4.

**Fix:** Add `NODE_OPTIONS=--openssl-legacy-provider` to your environment or prefix the command:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

---

### `npm ci` fails with peer dependency errors

**Cause:** Running without `--legacy-peer-deps`.

**Fix:**

```bash
npm ci --legacy-peer-deps
```

---

### `Cannot find module 'sass'`

**Cause:** The `sass` package is in `devDependencies` and wasn't installed (e.g., `npm ci --production` was used).

**Fix:** Run a full install without the `--production` flag:

```bash
npm ci --legacy-peer-deps
```

---

### Blank screen / "Loading…" hangs in dev mode

**Likely causes:**

1. **Missing `spawn.mpq`** — The app is waiting for the shareware data file. Either place `spawn.mpq` in `public/` or drag-drop `DIABDAT.MPQ` onto the page.
2. **Stale service worker** — Open DevTools → Application → Service Workers → Unregister, then hard-reload.
3. **SharedArrayBuffer not available** — Some features require `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. The dev server sets these; a custom static server may not.

---

### Game loads but there is no audio

**Cause:** Browsers suspend `AudioContext` until a user gesture is detected.

**Fix:** Click or tap anywhere on the page. The game's Web Audio context will resume automatically on the first interaction.

---

### Dev server `EADDRINUSE` (port in use)

The dev server will automatically try the next available port. If you want a specific port:

```bash
PORT=4000 npm start
```

---

### Tests fail with `TextEncoder is not defined`

**Cause:** The `jest-environment-jsdom-fourteen` environment doesn't include `TextEncoder` by default in some configurations.

**Fix:** This is handled by `react-app-polyfill/jsdom` in `jest.setupFiles`. If you see this error, ensure the `setupFiles` entry is present in `package.json`'s `jest` config.

---

## CI Workflow Summary

The `.github/workflows/ci.yml` workflow runs on every push and pull request:

```
actions/checkout@v4
actions/setup-node@v4 (node-version: 20, cache: npm)
npm ci --ignore-scripts --legacy-peer-deps
npm test -- --watchAll=false --ci
npm run build  (with CI=false, NODE_OPTIONS=--openssl-legacy-provider)
```

`--ignore-scripts` is used in CI to avoid any post-install native builds. Locally you don't need this flag.

All three steps (install → test → build) must pass before a PR can merge.
