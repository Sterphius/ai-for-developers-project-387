.DEFAULT_GOAL := run

.PHONY: run
.PHONY: server
.PHONY: web
.PHONY: build
.PHONY: gen-api
.PHONY: test
.PHONY: test-e2e

run:                     ## Run both backend and frontend (Ctrl+C kills both)
	@echo "Starting Go backend on :8080 ..."
	cd server && go run ./cmd/server &
	@sleep 1
	@echo "Starting Vite dev server on :5173 ..."
	cd web && npm run dev; kill $$! 2>/dev/null || true

server:                   ## Start Go backend on :8080
	cd server && go run ./cmd/server

web:                      ## Start Vite dev server on :5173
	cd web && npm run dev

build: gen-api            ## Build everything (spec → OpenAPI → frontend types)

gen-api:                  ## Regenerate frontend types from TypeSpec contract
	cd calendar-booking-spec && npm run build
	cd web && npm run gen:api

test:                     ## Run Go unit tests
	cd server && go test ./...

test-e2e:                 ## Run Playwright E2E tests (builds frontend, runs BE + Vite preview)
	cd web && npm run test:e2e
