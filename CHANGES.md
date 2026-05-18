# CHANGES.md

Append-only log of meaningful changes made by agents (AI or human) working on this repo. Newest entries at the top. Keep entries short — a few bullets each. If you change behaviour, dependencies, env vars, or the API contract, log it here.

**Log your changes when you finish a session.** Future agents check this before starting work.

## Format

```
## YYYY-MM-DD — <one-line summary>
- **Who**: <agent name or human handle>
- **Why**: <one sentence on the trigger / goal>
- **What changed**:
  - <file or area>: <what>
  - <file or area>: <what>
- **Migration / follow-up** (if any): <what the next agent needs to know>
```

Only log things future agents need to know. Skip noise.

---

## 2026-05-18 — getComments / getVideo instance fallback + WatchPage ref fix
- **Who**: Satoshi
- **Why**: Video at viewd.khurk.xyz/#/watch?v=WWoyWNhx2XU showed player but no comments/details when the active instance (viewd.replit.app) returned `{"error":"Invidious returned invalid JSON"}`. Comments endpoint had no fallback at all.
- **What changed**:
  - `src/lib/invidious.js`: Extracted `fallbackToOtherInstance()` — shared fallback that tries all other `KNOWN_INSTANCES` for any API endpoint. `getVideo` and `getComments` now both use it. Falls back when: network errors, HTTP errors OR `{"error":...}` responses. Only hard ERR responses from instaces.
  - `src/pages/WatchPage.jsx`: Added `continuationRef` pattern so `loadComments` always reads the live continuation value (fixes stale closure race when navigating between videos).
- **Migration / follow-up**: none

## 2026-05-18 — Test suite added + AGENTS.md / SYNC.md / CHANGES.md created
- **Who**: Satoshi
- **Why**: VIEWD needed comprehensive test coverage and proper agent onboarding docs to stay in sync with other repos.
- **What changed**:
  - `vite.config.js`: Added `test` config block (jsdom, setupFiles, globals).
  - `package.json`: Added `test`, `test:watch`, `test:int` scripts.
  - `src/test/setup.js`: Test environment mocks (localStorage, matchMedia, crypto, IntersectionObserver).
  - `src/test/store.test.js` (18 tests): Subscriptions, playlists CRUD, history, theme persistence.
  - `src/test/utils.test.js` (22 tests): All utility formatters (duration, views, published, thumbnails, avatars).
  - `src/test/SearchPage.test.jsx` (6 tests): Pagination (Previous/Next button logic, disabled states), sort reset, bug demo for unfiltered `data.length` check.
  - `src/test/WatchPage.test.jsx` (9 tests): Comment loading with continuation (multi-page verified), empty comments, loading state, keyboard shortcuts, theater mode.
  - `src/test/ChannelPage.test.jsx` (4 tests): Sort defaults and options, bug demo for raw API unwrapping.
  - `src/test/HomePage.test.jsx` (4 tests): Region selector render + refetch verification, bug demo for React Query cache.
  - `src/test/Sidebar.test.jsx` (9 tests): Mobile overlay, onClose propagation on overlay/nav-link/close-button click, active route highlighting, translate animation.
  - `test.mjs` (integration): Fixed GH Pages redirect handling (`-L` flag), flexible asset path matching.
  - `AGENTS.md`: Full project documentation (architecture, API layer, persistence, routing, testing, known issues).
  - `SYNC.md`: Cross-agent handoff log template.
  - `CHANGES.md`: This file.
  - `package.json`: Added `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` devDependencies.
- **Migration / follow-up**: `npm test` must be run from `viewd/` directory, not workspace root.
