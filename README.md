# VIEWD

A modern, privacy-first YouTube alternative frontend powered by the [Invidious](https://invidious.io/) API.

Built with React 19, Vite, Tailwind CSS v4, and React Query.

## Features

- **Trending videos** sorted by region
- **Search** with sort options (relevance, rating, date, views)
- **Video player** with theater mode, keyboard shortcuts (F for fullscreen, T for theater), PiP
- **Channel browsing** with subscribe/unsubscribe
- **Subscriptions** stored locally in your browser
- **Playlists** — create, manage, save videos — all client-side
- **Comments** — read-only display
- **Dark / Light / System theme** toggle
- **Instance management** — browse public CORS-enabled Invidious instances, test health, or set a custom one
- **Fully responsive** — mobile, tablet, desktop
- **Skeleton loading states** on all pages

## No Server Required

- All data comes directly from public Invidious API instances (no proxy needed)
- Subscriptions and playlists are stored in localStorage
- Deployable as a static site (GitHub Pages, Netlify, Vercel, etc.)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

The GitHub Actions workflow in `.github/workflows/deploy.yml` automatically deploys to GitHub Pages on every push to `main`.

## License

MIT
