# AGENTS.md

Calendar booking service. Three subprojects, each its own package:
- `calendar-booking-spec/` — TypeSpec contract, compiled to OpenAPI. Source of truth for the API.
- `web/` — React + Vite + TS frontend; its API types are generated from the contract.
- `server/` — Go backend (own module `calendar-booking/server`), in-memory store, no DB, data resets on restart.

## Contract → codegen pipeline (key workflow)

The contract drives the frontend types. After editing the API, rebuild then regenerate:

1. `calendar-booking-spec/`: `npm run build` (`tsp compile .`) → emits `tsp-output/openapi/openapi.yaml`.
2. `web/`: `npm run gen:api` → reads `../calendar-booking-spec/tsp-output/openapi/openapi.yaml`, writes `src/api/schema.d.ts`.

`web/src/api/schema.d.ts` is generated — never hand-edit it.

## web/ commands

- `npm run dev` — Vite dev server on :5173.
- `npm run mock` — Prism mock served from the contract on :4010.
- `npm run lint` — `tsc --noEmit` (lint == typecheck; there is no ESLint).
- `npm run build` — `tsc && vite build`.

Dev data flow: run `mock` and `dev` together. `VITE_API_BASE_URL` (`.env.development` → :4010) points the client at the Prism mock; switch the env var to the real backend without code changes.

## server/ commands

- `go run ./cmd/server` — backend on :8080, CORS allows :5173. Seeds two event types + owner; bookings start empty.
- `go test ./...` — unit tests for store (business rules) and slots (grid). No DB or external services needed.
- Business rules live in `internal/store`; handlers stay thin. The 14-day grid is anchored to `slots.WindowStart` (now rounded up to the minute) so slot generation and booking validation agree.
- Point the frontend at it via `web/.env.development` → `VITE_API_BASE_URL=http://localhost:8080`.

## Conventions / quirks

- All API timestamps are UTC RFC3339 strings; durations are in minutes. The frontend converts UTC↔local for display only.
- `@/*` path alias maps to `web/src/*`.
- UI is Tailwind v3 + shadcn-style components copied into `web/src/components/ui` (not an installed component lib).
- TypeSpec (`main.tsp`) gotchas already hit: `@info` does not accept a `description` field (put it in the namespace doc comment); do not use the deprecated `@patch(#{ implicitOptionality: true })` — use an explicit model with optional fields.

## CI

`.github/workflows/hexlet-check.yml` is auto-generated and marked DO NOT EDIT (Hexlet project check). It does not run project lint/tests — verify locally.

## Deployment (Railway)

Railway project `calendar-booking` (id `87c1032f...`) deploys both frontend and backend on every push to `main`.

- Repo connected as source (`Sterphius/ai-for-developers-project-387`), root Dockerfile builds both
- `Dockerfile` at repo root: builds the frontend (`node:22-alpine` → `npm run build`), then copies dist into the Go server, then builds the Go binary, final runtime image is `alpine:3.20`
- `server/internal/httpapi/embed.go` embeds the compiled frontend via `//go:embed static`
- Deployed to `https://calendar-booking-production-ccc7.up.railway.app`
- Railway GitHub App triggers auto-deploy on push to `main`
- Railway infrastructure defined in `.railway/railway.ts` (config-as-code)
