# AGENTS.md — Rules for AI assistants working on VIEWD

Read this first if you're an AI agent working on this repo. It tells you what VIEWD is, how it's wired, the rules, and the gotchas.

**Also read `SYNC.md`** (top 1–3 entries) before starting a session — it is the running handoff log between agents. When you finish a session, prepend a new entry to `SYNC.md` using the template in that file.

---

## 1. What this repo is

VIEWD is a privacy-first, minimal YouTube frontend PWA. It's a React 19 + Vite SPA that talks to **Invidious API instances** — no Google API keys, no tracking, no ads. It runs entirely client-side on GitHub Pages.

- **Live (custom domain)**: _(none yet — served from GitHub Pages under the `skulls206-creator.github.io/viewd/` subpath)_
- **Live (pages fallback)**: https://skulls206-creator.github.io/viewd/
- **Source repo**: `skulls206-creator/viewd`

---

## 2. Stack

| Tool | Version / Notes |
|---|---|
| React | 19 (no TypeScript — plain JSX) |
| Vite | 8, with `@vitejs/plugin-react` and `@tailwindcss/vite` |
| Tailwind CSS | 4 (CSS-first config via `index.css` with `@import "tailwindcss"`) |
| React Router | 7 (HashRouter — `#/` routes for GH Pages SPA) |
| TanStack Query | 5 (react-query) |
| Testing | Vitest 4 + Testing Library + jsdom |
| Packaging | npm (lockfile: `package-lock.json`) |
| Node | 20+ |

---

## 3. Architecture

```
src/
  main.jsx             Entry point — mounts <App />
  App.jsx              HashRouter + QueryClientProvider + layout (Header + Sidebar + <Routes>)
  index.css            Tailwind import + CSS variables for light/dark theme
  lib/
    invidious.js       Invidious API client (fetchApi, auto-failover, instance management)
    store.js           localStorage persistence layer (subscriptions, playlists, theme, history)
    utils.js           Formatters — formatDuration, formatViews, formatPublished, getBestThumbnail, etc.
  hooks/
    useInvidious.js    TanStack Query wrappers around lib/invidious.js
  components/
    Header.jsx         Top nav bar (search, sidebar toggle, subscriptions menu button, settings link)
    Sidebar.jsx        Slide-out nav drawer (home, trending, subs, history, subscribed channels)
    VideoCard.jsx      Video thumbnail card for grid layouts
    InstanceBanner.jsx Shows banner on auto-failover (not on manual instance change)
  pages/
    HomePage.jsx       Trending grid + region selector
    SearchPage.jsx     Search with sort filter + pagination (Previous/Next)
    WatchPage.jsx      Video player, comments, recommendations, keyboard shortcuts, subscribe/save
    ChannelPage.jsx    Channel info, subscribe button, video grid with sort (newest/oldest/popular)
    SubscriptionsPage.jsx Feed + channels grid + playlist CRUD (three-tab layout)
    TrendingPage.jsx   Dedicated trending page (same as HomePage without region selector)
    SettingsPage.jsx   Instance management, health check, theme toggle, build version
    HistoryPage.jsx    Watch history list
  test/
    setup.js           Test environment mocks (localStorage, matchMedia, IntersectionObserver, crypto)
    store.test.js      18 tests — subscriptions, playlists CRUD, history, theme
    utils.test.js      22 tests — all utility formatters
    SearchPage.test.jsx 6 tests — pagination, sort resets, bug demo (unfiltered data.length)
    WatchPage.test.jsx 9 tests — comment loading, continuation, keyboard shortcuts
    ChannelPage.test.jsx 4 tests — sort by new/old/popular, bug demo (raw API unwrap)
    HomePage.test.jsx   4 tests — region selector, queryKey behavior
    Sidebar.test.jsx    9 tests — mobile close, overlay, nav highlighting
```

---

## 4. Routing

Hash-based SPA routing via `HashRouter`:

| Route | Component | Description |
|---|---|---|
| `#/` | `HomePage` | Trending grid + region selector |
| `#/trending` | `TrendingPage` | Trending grid (no region selector) |
| `#/search?q=...&page=...` | `SearchPage` | Search with sort/pagination |
| `#/watch?v=...` | `WatchPage` | Video player + comments + recommendations |
| `#/channel/:id` | `ChannelPage` | Channel profile + videos |
| `#/subscriptions` | `SubscriptionsPage` | Feed / Channels / Playlists tabs |
| `#/settings` | `SettingsPage` | Instance config, theme, health |
| `#/history` | `HistoryPage` | Watch history |

---

## 5. Invidious API layer

Everything in `src/lib/invidious.js`. Key architecture:

- **`fetchApi(path, params)`** — core request builder. Prepends `currentInstance` + `/api/v1/`, attaches query params, sets 30s timeout. On network error / HTTP error, triggers **auto-failover**: iterates `KNOWN_INSTANCES` then the official Invidious instance list, finds a working instance, and swaps `currentInstance`. Replays the failed request on the new instance.
- **`getVideo(id)`** — calls `fetchApi`, but also has a **pixora fallback**: if the primary instance fails for video details, retries against `https://inv.thepixora.com`.
- **`KNOWN_INSTANCES`** = `['https://inv.thepixora.com', 'https://viewd.replit.app']` (bootstrapped; more discovered from `api.invidious.io/instances.json` on failover).
- **`INSTANCE_RECORDS`** = same URLs but with labels (`{ url, label }`). Exported via `instanceDisplay(url)` so Settings shows labels instead of raw URLs.
- **`instanceChangeListeners`** — event bus so `InstanceBanner` knows when an auto-failover happened (banner only on auto, not manual).

### API endpoints consumed

| Endpoint | Params | Wrapper fn |
|---|---|---|
| `/trending` | `region` | `getTrending()` |
| `/search` | `q`, `page`, `sort_by`, `type`, `duration`, `features`, `region` | `searchVideos()` |
| `/videos/:id` | — | `getVideo()` |
| `/channels/:id` | `sort_by`, `page` | `getChannel()` |
| `/channels/:id/videos` | `sort_by`, `page` | `getChannelVideos()` |
| `/comments/:id` | `continuation` | `getComments()` |
| `/playlists/:id` | `page` | `getPlaylist()` |
| `api.invidious.io/instances.json` | — | `fetchInstances()` |

**Note:** the `search` API returns a **mixed** array (`video`, `channel`, `playlist` types). `SearchPage` filters to `type === 'video'` before rendering. The pagination `data.length < 20` check is against the **unfiltered** array — this is a known bug (see test).

**Note:** `getChannelVideos` unwraps the API's `{ videos: [...], continuation }` response and returns just the array. The component expects an array.

---

## 6. Persistence layer (`src/lib/store.js`)

Everything stored in `localStorage` under a single key. No IndexedDB.

| Namespace | Key | What |
|---|---|---|
| `***` (one key) | Subscriptions | `[{ ucid, author, authorUrl, authorThumbnails, subscribed }]` |
| | Playlists | `[{ id, name, createdAt, videos: [...] }]` |
| | Theme | `'system' \| 'light' \| 'dark'` |
| `***` (separate key) | History | Last 50 watched videos (deduped by `videoId`, newest first) |
| `viewd_instance` (native key) | Active instance URL | Managed by `invidious.js` |

---

## 7. Deployment

- GitHub Pages, triggered by the standard `pages-build-deployment` action.
- Source is the `main` branch, built from the repo root.
- Vite config: `base: './'` (relative paths for subpath hosting).
- `CNAME` is not set — served under `skulls206-creator.github.io/viewd/`.

---

## 8. Testing

```
npm test          → vitest run          (72 unit tests)
npm run test:int  → node test.mjs       (12 integration tests against live API)
npm run test:watch → vitest             (watch mode)
```

### Unit tests (Vitest + jsdom + Testing Library)

Resident in `src/test/`. Every test file:

- Calls `render(<Component />)` wrapped in `QueryClientProvider` + `MemoryRouter`
- Mocks `useTrending`, `useSearch`, `useVideo`, `useChannel`, `useChannelVideos` via `vi.mock('../hooks/useInvidious.js')`
- Mocks `addToPlaylist`, `subscribe`, etc. from store via `vi.mock('../lib/store.js')`
- `setup.js` mocks `localStorage`, `matchMedia`, `IntersectionObserver`, `crypto.randomUUID`

Run from the **`viewd/` directory** — running `npx vitest` from the workspace root picks up test files from other repos.

### Integration tests (`test.mjs`)

Raw Node script (no framework) that curls the live deployment and Invidious API endpoints. Updated to follow GH Pages redirects (`-L` flag). Checks homepage loads, API endpoints respond, CORS headers present, build artifacts load.

---

## 9. Known issues / gotchas

1. **HashRouter, not BrowserRouter.** SPAs hosted on GitHub Pages subpaths need hash routing (`#/search`) because the server doesn't support `rewrite` rules.
2. **Search pagination bug.** Next button uses `data.length < 20` against the unfiltered search response (which includes channels/playlists). If the API returns ≥20 items but only 15 are videos, Next stays enabled even though there are no more video results to show. Fix: filter to `type === 'video'` first, then check `filtered.length < 20`.
3. **Channel video sort bug potential.** `getChannelVideos` correctly unwraps `{ videos: [...], continuation }` to a plain array. If a future change to the lib layer breaks this unwrapping, the component's `videos?.map(...)` will silently fail.
4. **React Query caching for region selector.** `useTrending(region)` uses `['trending', region]` as the queryKey. Switching from US→GB→US within 5 minutes will show the cached US data without a network fetch. This is correct caching but potentially confusing UX.
5. **Mobile sidebar close.** The `Sidebar` passes `onClose` to each `<Link>` — React Router's navigation fires concurrently with `onClose`. If the component unmounts too fast, `onClose` may not complete. In practice it works fine.
6. **PWA.** Static site with `manifest.json` and icons. Service worker needs verification.
7. **No TypeScript.** The entire codebase is plain JSX. If you add a production dependency, make sure it doesn't require TS.
