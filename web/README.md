# Calendar Booking — Web UI

Фронтенд календарного сервиса бронирования. React + Vite + TypeScript, shadcn/ui + Tailwind, типы и клиент сгенерированы из TypeSpec-контракта.

## Роли (без авторизации)
- **Гость** — `/`: список видов брони, выбор слота (14 дней), создание брони.
- **Владелец** — `/admin`: управление типами событий (CRUD) и единый список предстоящих встреч.

## Стек
- React 18 + React Router 6
- @tanstack/react-query — данные/кеш/мутации
- openapi-typescript + openapi-fetch — типобезопасный клиент из `../calendar-booking-spec`
- shadcn/ui (Radix + Tailwind)

## Команды
```bash
npm install          # зависимости
npm run gen:api      # сгенерировать src/api/schema.d.ts из openapi.yaml
npm run mock         # Prism mock из контракта на :4010
npm run dev          # Vite dev на :5173 (VITE_API_BASE_URL=http://localhost:4010)
npm run build        # tsc + production build
```

## Разработка с моком
В двух терминалах:
```bash
npm run mock         # терминал 1
npm run dev          # терминал 2
```
Позже переключите `VITE_API_BASE_URL` на реальный бэкенд (Go) — код менять не нужно.

## Структура
- `src/api/` — сгенерированная схема, клиент, react-query хуки
- `src/lib/` — datetime (UTC↔локаль), маппинг ошибок, utils
- `src/components/` — общие компоненты + `ui/` (shadcn)
- `src/pages/guest/` — экраны гостя
- `src/pages/admin/` — экраны владельца
