# Calendar Booking Service

Сервис для записи на консультации и встречи. Гость выбирает свободный слот из
14-дневного календаря, владелец управляет типами событий и видит список броней.

## Hexlet tests and linter status

[![Actions Status](https://github.com/Sterphius/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Sterphius/ai-for-developers-project-386/actions)

## Архитектура

Три независимых пакета в одном репозитории:

| Пакет | Технологии | Назначение |
|---|---|---|
| `calendar-booking-spec/` | TypeSpec → OpenAPI | Контракт API, единственный источник истины |
| `web/` | React + Vite + TypeScript | UI для гостя и владельца |
| `server/` | Go 1.25, in-memory store | REST API, бизнес-логика без БД |

Данные сбрасываются при перезапуске сервера. Внешних зависимостей (кроме рантайма) нет.

## Production

Приложение доступно на Railway:

**https://calendar-booking-production-ccc7.up.railway.app**

Управление через [Railway Dashboard](https://railway.com/project/87c1032f-315c-48f0-901e-291641f4b756).

`PORT` задаётся платформой автоматически. При деплое собирается единый Docker-образ
с встроенным фронтендом — API и SPA доступны на одном порту.

## Быстрый старт

### 1. Запустить бэкенд

```bash
cd server && go run ./cmd/server
```

Бэкенд стартует на `:8080` с CORS для `http://localhost:5173`. При старте
создаются два типа событий (`intro-call` 30 мин, `consultation` 60 мин) и
профиль владельца.

### 2. Запустить фронтенд

```bash
cd web && npm run dev
```

Фронтенд стартует на `:5173`. По умолчанию ходит на `:4010` (Prism mock),
переключите `.env.development` на `http://localhost:8080` для работы с Go-бэкендом.

### 3. Открыть в браузере

- **Гость** — `http://localhost:5173/` — список встреч, выбор слота, бронирование
- **Владелец** — `http://localhost:5173/admin` — управление типами событий, список броней

### 4. Запустить тесты

```bash
cd server && go test ./...   # unit-тесты бизнес-логики
cd web && npm run lint       # typecheck (tsc --noEmit)
cd web && npm run test:e2e   # Playwright E2E
```

## CI / CD

| Событие | Workflow | Действие |
|---|---|---|
| `pull_request` в `main` | `ci.yml` | `go test ./...` + `npx tsc --noEmit` + Playwright E2E |
| `push` в `main` | `release-please.yml` | Создаёт Release PR с `CHANGELOG.md` |
| Мерж Release PR | `release-please.yml` | GitHub Release + git-тег `vX.Y.Z` |

Коммиты должны следовать [Conventional Commits](https://www.conventionalcommits.org/).
Нарушение формата блокируется хуком `commit-msg` (husky + commitlint).

## Контракт и кодогенерация

API описан в `calendar-booking-spec/main.tsp`. После изменений:

```bash
cd calendar-booking-spec && npm run build   # tsp compile → openapi.yaml
cd web && npm run gen:api                    # openapi-typescript → schema.d.ts
```

`web/src/api/schema.d.ts` — сгенерированный файл, не редактировать вручную.

## Структура репозитория

```
.github/workflows/
  ci.yml                # Проверка PR
  release-please.yml    # Автоматические релизы
calendar-booking-spec/  # TypeSpec контракт
server/                 # Go-бэкенд
  cmd/server/           # Точка входа
  internal/
    httpapi/            # HTTP-хендлеры
    store/              # Бизнес-правила и in-memory хранилище
    slots/              # Генерация 14-дневной сетки слотов
    model/              # Модели данных
    id/                 # Генерация идентификаторов
web/                    # React-фронтенд
  src/
    api/                # Сгенерированный клиент
    pages/              # Экраны (guest/, admin/)
    components/         # UI-компоненты (shadcn/ui)
    lib/                # Утилиты
```
