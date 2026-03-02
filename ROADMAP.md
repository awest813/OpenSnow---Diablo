# OpenSnow — Diablo Roadmap

This roadmap tracks modernization and reliability work for the browser-based Diablo runtime.

Status legend:
- ✅ Done
- 🚧 In Progress
- 🔲 Planned
- ⏸ Deferred

---

## 2026 Strategic Objectives

1. **Stabilize architecture boundaries** between app shell, worker, storage, and transports.
2. **Modernize the toolchain** to reduce contributor setup friction and build times.
3. **Increase multiplayer reliability** with better diagnostics and recovery UX.
4. **Improve accessibility and mobile UX** without regressing core gameplay behavior.
5. **Raise confidence** through targeted unit, integration, and regression coverage.

---

## Phase 0 — Completed Foundations

- ✅ Worker extraction and loader boundary setup (`src/api/loader.js`, `src/api/game.worker.js`)
- ✅ Input module extraction for file drop and event listener lifecycle
- ✅ Unit tests for packet handling, codec, and key extracted modules
- ✅ Save manager and UI decomposition started from monolithic app flow
- ✅ Build and architecture docs established (`README.md`, `docs/build-guide.md`, architecture docs)

---

## Phase 1 — Application Surface Decomposition

**Goal:** keep `App.js` focused on composition, routing of intent, and top-level state.

### Completed
- ✅ Touch control state machine extraction
- ✅ Keyboard and mouse handler extraction
- ✅ Session lifecycle extraction into dedicated engine/session module
- ✅ Error overlay and save manager isolation
- ✅ Loading/start screen isolation from core orchestration logic

### Next
- 🔲 Introduce formal session context (React Context + typed contract)
- 🔲 Move remaining modal orchestration into dedicated UI controllers
- 🔲 Establish explicit app-level state transitions (`booting`, `ready`, `running`, `error`, `recovering`)
- 🔲 Add regression tests around transition boundaries and recovery paths

---

## Phase 2 — Toolchain Modernization

**Goal:** replace legacy CRA/Webpack-4 constraints with a maintainable modern stack.

- 🔲 Decide final migration path: **Vite + React 18** (preferred) or **Webpack 5** fallback
- 🔲 Upgrade React to 18 and validate strict-mode compatibility
- 🔲 Upgrade Jest/jsdom and align test environment with current browser APIs
- 🔲 Refresh ESLint config and enforce linting in CI
- 🔲 Remove obsolete Node/OpenSSL compatibility flags
- 🔲 Document a reproducible setup with target "clone to running" < 10 minutes
- 🔲 Benchmark and publish before/after build + startup metrics

---

## Phase 3 — Runtime Boundary Hardening

**Goal:** prevent lifecycle leaks and reduce implicit coupling across modules.

- 🔲 Define formal message schemas for worker request/response/event channels
- 🔲 Add compatibility adapter for legacy message shapes during migration
- 🔲 Split loader adapters by responsibility (render/audio/storage/network)
- 🔲 Introduce explicit disposal contracts (listeners, intervals, workers, transports)
- 🔲 Add startup/shutdown integration tests that verify clean teardown
- 🔲 Surface storage and initialization failures clearly in UI (no silent fallback)

---

## Phase 4 — Multiplayer Reliability and Visibility

**Goal:** make multiplayer failures diagnosable and recoverable by users.

- 🔲 Introduce transport abstraction (`Transport` interface with PeerJS/WebSocket adapters)
- 🔲 Add structured connection lifecycle logging and error categorization
- 🔲 Expose connection status in UI (`connecting`, `connected`, `retrying`, `failed`)
- 🔲 Add guided recovery actions (retry, reconnect, copy session ID, share link)
- 🔲 Add handshake/version checks to reduce protocol mismatch failures
- 🔲 Add compatibility regression tests for common join/host flows
- 🔲 Publish self-host relay server documentation for advanced users

---

## Phase 5 — UX, Accessibility, and Performance

**Goal:** iterative improvements that preserve gameplay correctness.

### Mobile & Touch
- 🔲 Layout presets for touch controls
- 🔲 Better two-finger pan sensitivity calibration
- 🔲 Gesture conflict handling (tap/pan/long-press)
- 🔲 First-run onboarding for MPQ import on mobile

### Accessibility
- 🔲 Keyboard-operable overlay controls
- 🔲 Focus trap + return-focus behavior for dialogs
- 🔲 Improved ARIA labeling and semantic landmarks in app chrome
- 🔲 Optional high-contrast UI mode (outside core game rendering)

### Performance
- 🔲 Reduce startup main-thread blocking
- 🔲 Profile worker hotspots and optimize render patch pipeline
- 🔲 Lazy-load MPQ compression tooling
- 🔲 Add bundle-size budget checks in CI

### PWA & Offline
- 🔲 Clear service-worker update UX
- 🔲 Reliable offline shareware mode with deterministic precache
- 🔲 Better timing for install prompt surfacing

---

## Deferred / Under Consideration

- ⏸ TypeScript migration (revisit after toolchain stabilization)
- ⏸ Gamepad/controller support
- ⏸ Advanced low-latency audio scheduling improvements
- ⏸ Optional cloud save sync (would require backend)
- ⏸ Official Dockerized relay reference deployment

---

## Contribution alignment

If you want to contribute against this roadmap:

1. Choose a 🔲 planned item and open a scoped issue first.
2. Describe expected behavior changes and risks.
3. Land work in small PRs with tests where feasible.
4. Update docs when workflows, setup, or user-visible behavior changes.
