# SYNC.md — Cross-Agent After-Action Report

> **Purpose:** This file is the running handoff log between agents working on
> VIEWD. Whoever finishes a session updates the **Latest entry** at the top.
> Whoever starts a session reads this file first, *after* `AGENTS.md`.
>
> **Rules:**
> - Append new entries at the top (newest first). Do not rewrite history.
> - Keep each entry short: what changed, why, what's pending, open questions.
> - Never commit secrets, tokens, or paths to local keys here.

---

## How to use this file

Each session, the finishing agent adds one entry using the template below.
The next agent reads the top 1–3 entries to catch up before doing anything.

If an entry's **Pending / Open questions** section has items, the next agent
should address them or explicitly defer them with a reason.

### Entry template

```md
## YYYY-MM-DD — <Agent name> — <short title>

**Branch:** main (or other)

**Why:** <one sentence on the trigger / goal>

**What changed:**
- <file or area>: <what>
- <file or area>: <what>

**Issues found:**
- <any bugs, regressions, or concerns uncovered during this session>

**Pending / Open questions:**
- <what the next agent needs to pick up or decide on>
```

---

## 2026-05-18 — Satoshi — Fallback fix for API instance errors + WatchPage ref

**Branch:** main

**Why:** https://viewd.khurk.xyz/#/watch?v=WWoyWNhx2XU showed the video player (youtube-nocookie.com iframe) but no comments, channel info, or video details. Root cause: `viewd.replit.app` returns `{"error":...}` for that video, and `getComments` had zero fallback logic. `getVideo` only fell back if current instance wasn't pixora.

**What changed:**
- `src/lib/invidious.js`: New shared `fallbackToOtherInstance()` iterates all `KNOWN_INSTANCES` (excluding current) and tries each. Also rejects `{"error":...}` responses, not just HTTP errors. Both `getVideo` and `getComments` now use it.
- `src/pages/WatchPage.jsx`: Added `continuationRef` pattern so the comment effect doesn't capture stale closure state when navigating between videos.

**Issues found:**
- `viewd.replit.app` returns `{"error":"Invidious returned invalid JSON"}` for some videos (but works for trending/search). This instance is the #2 known instance but has reliability issues.
- `getComments` had NO fallback; would just silently return empty comments on any non-catastrophic API error.
- `getVideo` only fell back to pixora if current instance wasn't pixora (circular).

**Pending / Open questions:**
- Should `viewd.replit.app` stay in `KNOWN_INSTANCES`? It has a ~20% error rate on video detail endpoints.
- `npm test` must be run from `viewd/` directory, not workspace root

## 2026-05-18 — Satoshi — Test suite + agent docs

**Branch:** main

**Why:** Skulls requested test coverage for flagged issues and agent onboarding files for VIEWD to stay in sync with other repos.

**What changed:**
- Full vitest suite: 72 tests across 7 files (store, utils, SearchPage, WatchPage, ChannelPage, HomePage, Sidebar)
- `test.mjs` updated for GH Pages redirect handling
- `vite.config.js`: vitest config (jsdom, setupFiles)
- `AGENTS.md`: Full project docs (architecture, API layer, persistence, known issues)
- `SYNC.md`: Cross-agent handoff template
- `CHANGES.md`: This file

**Issues found:**
- Search pagination Next button checks `data.length < 20` on unfiltered API response (includes channels/playlists), not filtered video count
- Homepage region selector has 5-min staleTime which may feel stale when switching back to a previously-selected region
- Integration tests were all failing on 301 redirects (no `-L`) and asset path changes

**Pending / Open questions:**
- No custom domain or CNAME configured yet
- Service worker / PWA full verification not done
- No TypeScript migration planned
- `npm test` must be run from `viewd/` directory, not workspace root
