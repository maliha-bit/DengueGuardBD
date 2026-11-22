# DengueGuard BD — Frontend

Bilingual (English / বাংলা), mobile-first web app (PWA) for dengue in Bangladesh. It shows a
division-wise 7-day dengue risk forecast and connects citizens to hospital beds, doctor
appointments, symptom triage, home care guidance, labs, blood/platelet donors and breeding-site
reporting. Staff portals cover Hospital Staff, Lab Staff, Health Authority Officers and the System
Administrator.

**Live demo:** https://maliha-bit.github.io/DengueGuardBD/

Requirements: `docs/DengueGuard_BD_SRS.pdf` (FR01–FR39, NFR01–NFR32, UC01–UC35).

> **Simulated data.** The FastAPI backend is not ready yet. All data comes from a mock API layer
> (`src/api/mock`) with seeded, simulated records. None of it is real dengue statistics.

## Tech stack

React 18 · Vite · TypeScript (strict) · Tailwind CSS · React Router v6 · TanStack Query v5 ·
i18next · Recharts · react-leaflet + OpenStreetMap · lucide-react · react-hook-form + zod ·
vite-plugin-pwa · Vitest + React Testing Library · Playwright + axe-core · ESLint + Prettier

## Getting started

Requires Node.js 22.

```bash
git clone -b frontend https://github.com/maliha-bit/DengueGuardBD.git
cd DengueGuardBD
npm install
npm run dev          # http://localhost:5173
```

### Environment variables

| Variable        | Default | Meaning                                                              |
| --------------- | ------- | -------------------------------------------------------------------- |
| `VITE_USE_MOCK` | `true`  | `true` serves simulated data from `src/api/mock` (300–600 ms delay). |
| `VITE_API_URL`  | `/api`  | FastAPI base URL, used only when `VITE_USE_MOCK=false`.              |

`.env` and `.env.production` both set `VITE_USE_MOCK=true` for now.

### Demo roles

Use **Demo role** in the user menu to switch the mock signed-in user: citizen, donor, hospital
staff, lab staff, health authority or administrator. Public pages (risk map, hospital and lab
search, symptom checker, home care, chatbot, emergency, offline help) work without signing in.

## Scripts

| Command                 | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                                      |
| `npm run build`         | Type-check (`tsc -b`) and production build into `dist/`              |
| `npm run preview`       | Serve the production build                                           |
| `npm run lint`          | ESLint (incl. `jsx-a11y`), zero warnings allowed                     |
| `npm run format`        | Prettier (with Tailwind class sorting)                               |
| `npm run test -- --run` | Vitest unit/component tests, incl. the en/bn missing-key test        |
| `npm run test:e2e`      | Playwright on desktop (1280×800) and phone (390×844), incl. axe      |
| `npm run test:preview`  | Playwright against the production build: manifest, service worker, offline reload, base path |

Before committing: `npm run lint`, `npm run test -- --run`, `npm run test:e2e`, `npm run build`.

## Project structure

```
src/
  app/            router, providers, shells (CitizenShell, StaffShell), RequireRole guard
  components/ui/  Card, StatCard, Pill, Badge, Button, Skeleton, EmptyState, ErrorState, Modal, Sheet…
  components/     Sidebar, BottomNav, Topbar, RiskBadge, EmergencyButton, Disclaimer, InstallButton…
  features/       one folder per area (risk, hospitals, appointments, triage, homecare, chatbot,
                  donors, labs, reports, offline, hospital-portal, lab-portal, authority, admin…)
  api/            client.ts, staffClient.ts, queries, types.ts (ERD names), mock/ (handlers + seed)
  locales/        en.json, bn.json, locales.test.ts
  lib/            formatters (Bangla digits), risk rules, PWA hooks, lazyPage, utils
e2e/              Playwright tests against the dev server
e2e-preview/      Playwright tests against the production build (PWA)
```

## Accessibility and language

- WCAG 2.1 AA: risk is always text + icon + colour; touch targets ≥ 44×44 px; visible focus rings;
  skip link; dialogs trap focus, close on Esc and return focus.
- `e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1 A + AA) on every citizen page, the Bangla dashboard and
  every staff portal page. Serious or critical findings fail the run.
- Every string goes through i18next. `src/locales/locales.test.ts` fails if a key is missing or
  empty in either language, or if `{{placeholders}}` differ between languages.
- Medical screens show "Follows DGHS/WHO guidance. Not a diagnosis."

## Performance

Every page is lazy-loaded through `src/lib/lazyPage.tsx`, which wraps `React.lazy` and adds
`preload()`. Vendor code is split into separate cached chunks (`vendor-react`, `vendor-query`,
`vendor-i18n`, `vendor-forms`, `vendor-recharts`, `vendor-leaflet`, `mock-data`). Leaflet and
Recharts load only on the pages that use them. The app-shell entry chunk is about 142 kB
(about 44 kB gzip).

## PWA and offline

- Installable: web manifest with 192/512 px and maskable icons. The **Install app** button in the
  top bar appears only when the browser offers installation.
- The service worker (Workbox, `autoUpdate`) precaches the whole app shell, every lazy page and both
  languages. Google Fonts and OpenStreetMap tiles are cached at runtime.
- When offline, a banner appears with a link to `/offline`. That page lists emergency numbers
  (999, 16263) and the last-seen division risk saved on the device. If a page's code cannot load,
  the route error screen offers Retry and a link to offline help.

## Run the backend

The FastAPI backend lives in `backend/` (branch `backend`). It's a separate Python project from the
frontend above.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env       # then paste your real Neon DATABASE_URL into .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

`GET http://localhost:8000/api/v1/health` returns `{"status", "version", "database"}`. `database`
is `"disconnected"` until `.env` has a real, reachable `DATABASE_URL`.

## Deployment

`.github/workflows/deploy.yml` builds with `VITE_USE_MOCK=true` and deploys `dist/` to GitHub Pages
on every push to `frontend`, live at https://maliha-bit.github.io/DengueGuardBD/. Production
builds use the `/DengueGuardBD/` base path (set in `vite.config.ts`, case-sensitive), and `404.html` is a
copy of `index.html` so deep links work.
