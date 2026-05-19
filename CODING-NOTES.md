# CODING-NOTES — viewd

## What This Project Is
VIEWD — Modern Invidious Frontend. Privacy-first YouTube alternative. React 19, Vite, Tailwind v4, React Query. GitHub Pages deploy.

## Tech Stack
- React 19 + Vite + Tailwind v4
- TanStack React Query
- React Router DOM
- TypeScript (no tsconfig.json — uses jsconfig or inferred from Vite)
- Vitest + Testing Library for tests
- ESLint configured

## Structure
```
/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── lib/
├── vite.config.ts
├── eslint.config.js
├── tests/
└── package.json
```

## Build & Dev
- **Install:** `npm install` or `pnpm install`
- **Dev:** `pnpm run dev`
- **Build:** `pnpm run build`
- **Preview:** `pnpm run preview`
- **Test:** `pnpm test` / `pnpm test:int` / `pnpm test:watch`
- **Lint:** `pnpm run lint`
- **Deploy:** `pnpm run deploy` (GitHub Pages)

## Deploy
- GitHub Pages via `.github/workflows/deploy.yml`
- Vite base path configured for GitHub Pages subpath (/viewd/)

## TypeScript
- No tsconfig.json found — check if using jsconfig.json or pure JSDoc types
- Consider adding tsconfig.json with strict: true

## Tests & Lint
- Vitest + @testing-library/jest-dom
- ESLint with @eslint/js + eslint-plugin-react-hooks
- Integration tests configured

## Known Gotchas
- GitHub Pages subpath means vite config must set base: '/viewd/'
- Invidious instance API is external — instances can go down, add fallback
- YouTube API structure changes can break parsing
- PWA not configured (no vite-plugin-pwa)

## Previous Bugs / Regressions
*(Fill in as they happen)*
