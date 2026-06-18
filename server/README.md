# Calendar Booking — Go Backend

In-memory реализация календарного сервиса бронирования по контракту
`calendar-booking-spec`. Без внешних зависимостей, без базы данных — данные
хранятся в памяти и **сбрасываются при перезапуске**.

## Запуск
```bash
go run ./cmd/server                       # :8080, CORS для http://localhost:5173
go run ./cmd/server -addr :9090           # другой порт
go run ./cmd/server -cors-origin http://localhost:3000
```

При старте сидируются два типа событий (`intro-call` 30 мин, `consultation`
60 мин) и профиль владельца. Список бронирований пуст.

## Проверка
```bash
go build ./...
go vet ./...
go test ./...
```

## Структура
- `cmd/server` — точка входа: флаги, seed, CORS, graceful shutdown.
- `internal/model` — типы, повторяющие схемы контракта (JSON-теги 1:1).
- `internal/store` — потокобезопасное in-memory хранилище и **все бизнес-правила**.
- `internal/slots` — генерация сетки слотов на 14 дней (шаг = `durationMinutes`).
- `internal/httpapi` — маршруты (`net/http`, Go 1.22+ routing), хендлеры, CORS.
- `internal/id` — генерация id через `crypto/rand`.

## Бизнес-правила (в `internal/store`)
Проверки при создании брони (атомарно под мьютексом), в порядке контракта:
1. Тип события существует — иначе `404 EVENT_TYPE_NOT_FOUND`.
2. `start` в окне `[windowStart, windowStart+14d]` — иначе `400 INVALID_SLOT`.
3. `start` выровнен по сетке `durationMinutes` — иначе `400 INVALID_SLOT`.
4. Интервал `[start, start+duration)` не пересекается ни с одной бронью
   (любого типа) — иначе `409 SLOT_TAKEN`.

Конфликт id при создании типа события → `400 INVALID_SLOT` (по контракту у
`createEventType` только 400).

## Сетка слотов
`windowStart` = `now`, округлённое вверх до минуты — стабильный якорь сетки,
общий для генерации слотов и валидации брони. Слоты длиной `durationMinutes`,
занятые возвращаются с `available:false`. Параметры `from`/`to` у `/slots`
обрезаются по окну.

## Подключение фронтенда
Переключите `web/.env.development` → `VITE_API_BASE_URL=http://localhost:8080`.
Код фронта менять не нужно; CORS уже настроен на dev-origin Vite.
