# election-cos-app — Election-COS1.0

Multi-tenant, offline-first PWA for South African political campaign field
operations. Built against `IC-ECOS-BUILD-2026-V2` (governing spec —
`docs/` and inline comments cite section numbers throughout; read
**[BUILD-STATUS.md](./BUILD-STATUS.md) first** for what's real vs. placeholder).

## Quick start

```bash
npm install
cp .env.example .env      # fill in once a Firebase project exists — see BUILD-STATUS.md
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run check:all` | lint + typecheck + hex-literal check + unit tests (what CI runs) |
| `npm run test` / `test:watch` | Vitest |
| `npm run check:hex` | fails on raw hex colours outside `src/design/tokens.ts` |

## Layout

```
src/
  app/        shell, routing, providers, nav, error boundary
  auth/       capability model, Firebase Auth wrapper (minimal-footprint), seed roles
  dal/        Data Access Layer — ports (storage-agnostic) + firestore adapters
  design/     tokens.ts — the only place colour/type constants live
  modules/    one folder per functional module (war-room, voters, finance, ...)
  offline/    Dexie schema + sync contract types (Phase 4)
  lib/        shared helpers (money, ...)
functions/    Cloud Functions 2nd gen — resolveCapabilities, sync, unmaskCandidateIdNumber
openapi/      sync.yaml — the offline sync contract, written before its implementation
docs/         phase gate records (currently: Phase 1 IA consolidation)
```

**Architectural rule that matters most:** nothing outside
`src/dal/adapters/firestore/**` may import a Firebase SDK. Everything else
goes through `src/dal`. This is enforced by `.eslintrc.cjs` and is what
makes the eventual PostgreSQL migration (Phase 8, conditional on a paying
customer) a contained swap instead of a rewrite.
