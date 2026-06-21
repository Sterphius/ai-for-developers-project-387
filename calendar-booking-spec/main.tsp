import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

/**
 * Календарный сервис бронирования.
 *
 * Контракт описывает публичную часть (для гостей) и админскую часть (для владельца).
 *
 * Ключевые решения:
 * - Грануляция слотов: сетка по длительности выбранного типа события (шаг = durationMinutes).
 *   Гость может переопределить шаг, передав `durationMinutes` в запрос слотов и при создании
 *   бронирования.
 * - Доступность: 24/7, окно 14 дней от текущей даты, без рабочих часов.
 * - Данные гостя при брони: имя + email.
 * - Авторизация отсутствует. Эндпоинты владельца открыты, профиль владельца — единственный,
 *   задан по умолчанию.
 * - Время: все метки — UTC (utcDateTime), длительность — минуты.
 */
@service(#{ title: "Calendar Booking Service" })
@info(#{ version: "1.0.0" })
@server("https://api.example.com", "Сервер бронирования")
namespace CalendarBooking;

// ---------------------------------------------------------------------------
// Модели данных
// ---------------------------------------------------------------------------

/**
 * Тип события (создаётся владельцем).
 */
model EventType {
  /** Идентификатор типа события. Задаётся владельцем (произвольная строка). */
  id: string;

  /** Название типа события. */
  title: string;

  /** Описание типа события. */
  description: string;

  /** Длительность события в минутах. Используется как шаг сетки слотов. */
  @minValue(1)
  durationMinutes: int32;
}

/**
 * Тело запроса на создание типа события.
 *
 * По ТЗ владелец «задаёт id» → id включается в модель создания.
 */
model EventTypeCreate {
  /** Идентификатор типа события, задаётся владельцем. */
  id: string;

  /** Название типа события. */
  title: string;

  /** Описание типа события. */
  description: string;

  /** Длительность события в минутах. */
  @minValue(1)
  durationMinutes: int32;
}

/**
 * Тело запроса на частичное обновление типа события.
 *
 * Все поля опциональны — обновляются только переданные. Вне минимума ТЗ.
 */
model EventTypeUpdate {
  /** Название типа события. */
  title?: string;

  /** Описание типа события. */
  description?: string;

  /** Длительность события в минутах. */
  @minValue(1)
  durationMinutes?: int32;
}

/**
 * Вычисляемый слот в календаре.
 *
 * Слоты строятся по сетке с шагом durationMinutes от начала окна.
 * Занятые слоты возвращаются с флагом `available: false` (удобно для UI календаря).
 */
model Slot {
  /** Начало слота (UTC). */
  start: utcDateTime;

  /** Конец слота (UTC). Равен start + шаг сетки. */
  end: utcDateTime;

  /** Доступен ли слот для бронирования. */
  available: boolean;
}

/**
 * Бронирование встречи.
 */
model Booking {
  /** Идентификатор бронирования. */
  id: string;

  /** Идентификатор типа события. */
  eventTypeId: string;

  /** Начало встречи (UTC). */
  start: utcDateTime;

  /** Конец встречи (UTC). Вычисляется сервером как start + durationMinutes. */
  end: utcDateTime;

  /** Имя гостя. */
  guestName: string;

  /** Email гостя. */
  @format("email")
  guestEmail: string;

  /** Момент создания бронирования (UTC). */
  createdAt: utcDateTime;
}

/**
 * Тело запроса на создание бронирования.
 *
 * Поле `end` не передаётся — оно вычисляется сервером из durationMinutes выбранного типа
 * (или из переданного `durationMinutes`).
 */
model BookingCreate {
  /** Идентификатор типа события. */
  eventTypeId: string;

  /** Желаемое начало встречи (UTC). Должно быть выровнено по сетке durationMinutes. */
  start: utcDateTime;

  /** Имя гостя. */
  guestName: string;

  /** Email гостя. */
  @format("email")
  guestEmail: string;

  /** Длительность встречи в минутах. Если не указана, используется длительность типа события. */
  @minValue(1)
  durationMinutes?: int32;
}

/**
 * Профиль владельца календаря.
 *
 * Единственный предзаданный профиль по умолчанию. Аутентификация отсутствует.
 */
model Owner {
  /** Идентификатор владельца. */
  id: string;

  /** Имя владельца. */
  name: string;

  /** Email владельца. */
  @format("email")
  email: string;
}

/**
 * Единый формат ошибок.
 */
@error
model Error {
  /** Машиночитаемый код ошибки. */
  code: ErrorCode;

  /** Человекочитаемое сообщение об ошибке. */
  message: string;
}

/**
 * Коды ошибок API.
 */
union ErrorCode {
  /** Слот уже занят (нарушено правило занятости интервалов). */
  SlotTaken: "SLOT_TAKEN",

  /** Тип события не найден. */
  EventTypeNotFound: "EVENT_TYPE_NOT_FOUND",

  /** Слот вне 14-дневного окна или не выровнен по сетке. */
  InvalidSlot: "INVALID_SLOT",

  /** Бронирование не найдено. */
  BookingNotFound: "BOOKING_NOT_FOUND",
}

// ---------------------------------------------------------------------------
// Переиспользуемые ответы об ошибках
// ---------------------------------------------------------------------------

/** 400 Bad Request — слот вне 14-дневного окна или невалидная сетка. */
model BadRequestError {
  ...Body<Error>;

  @statusCode statusCode: 400;
}

/** 404 Not Found — тип события (или бронирование) не найдены. */
model NotFoundError {
  ...Body<Error>;

  @statusCode statusCode: 404;
}

/** 409 Conflict — слот занят (пересечение интервалов). */
model ConflictError {
  ...Body<Error>;

  @statusCode statusCode: 409;
}

// ---------------------------------------------------------------------------
// Публичная часть (гость) — /api
// ---------------------------------------------------------------------------

/**
 * Публичные эндпоинты для гостей.
 */
@route("/api")
@tag("Public")
namespace Public {
  /**
   * Список доступных типов событий (видов брони).
   * Страница видов брони для гостя.
   */
  @route("/event-types")
  @get
  op listEventTypes(): EventType[];

  /**
   * Получить тип события по id (публично, для страницы бронирования гостя).
   */
  @route("/event-types/{id}")
  @get
  op getEventType(@path id: string): EventType | NotFoundError;

  /**
   * Свободные слоты для выбранного типа события.
   *
   * Бизнес-правила:
   * - Окно 14 дней: слоты строятся только в пределах [now, now+14d].
   * - Сетка: слоты выровнены по durationMinutes от начала окна.
   * - Занятые слоты возвращаются с `available: false`.
   * - Если переданы `from`/`to`, они обрезаются по 14-дневному окну.
   * - Если передан `durationMinutes`, сетка строится с указанным шагом;
   *   иначе используется шаг из типа события.
   */
  @route("/event-types/{id}/slots")
  @get
  op getSlots(
    /** Идентификатор типа события. */
    @path id: string,

    /** Начало запрашиваемого диапазона (UTC). Опционально. */
    @query from?: utcDateTime,

    /** Конец запрашиваемого диапазона (UTC). Опционально. */
    @query to?: utcDateTime,

    /** Шаг сетки в минутах. Если не указан, используется durationMinutes типа события. */
    @minValue(1)
    @query durationMinutes?: int32,
  ): Slot[] | NotFoundError | BadRequestError;

  /**
   * Создание бронирования.
   *
   * Бизнес-правила:
   * - Правило занятости: пересечение интервалов [start, end) с любым существующим
   *   бронированием запрещено → 409 Conflict (SLOT_TAKEN).
   * - Окно 14 дней: start должен попадать в [now, now+14d] → иначе 400 (INVALID_SLOT).
   * - Сетка: start должен быть выровнен по durationMinutes от начала окна → иначе 400.
   * - Тип события должен существовать → иначе 404 (EVENT_TYPE_NOT_FOUND).
   * - `end` вычисляется сервером из durationMinutes выбранного типа (или из переданного
   *   `durationMinutes` в теле запроса).
   */
  @route("/bookings")
  @post
  op createBooking(@body booking: BookingCreate):
    | {
        @statusCode statusCode: 201;
        @body booking: Booking;
      }
    | BadRequestError
    | NotFoundError
    | ConflictError;
}

// ---------------------------------------------------------------------------
// Админская часть (владелец) — /api/admin
// ---------------------------------------------------------------------------

/**
 * Админские эндпоинты владельца.
 *
 * Аутентификация отсутствует. Профиль владельца — единственный, задан по умолчанию.
 */
@route("/api/admin")
@tag("Admin")
namespace Admin {
  /**
   * Создание типа события.
   */
  @route("/event-types")
  @post
  op createEventType(@body eventType: EventTypeCreate): {
    @statusCode statusCode: 201;
    @body eventType: EventType;
  } | BadRequestError;

  /**
   * Список типов событий (для управления владельцем).
   */
  @route("/event-types")
  @get
  op listEventTypes(): EventType[];

  /**
   * Получить тип события по id.
   *
   * Вне минимума ТЗ — для полноты CRUD.
   */
  @route("/event-types/{id}")
  @get
  op getEventType(@path id: string): EventType | NotFoundError;

  /**
   * Обновить тип события (частичное обновление).
   *
   * Вне минимума ТЗ — для полноты CRUD.
   */
  @route("/event-types/{id}")
  @patch
  op updateEventType(
    @path id: string,
    @body eventType: EventTypeUpdate,
  ): EventType | NotFoundError | BadRequestError;

  /**
   * Удалить тип события.
   *
   * Вне минимума ТЗ — для полноты CRUD.
   */
  @route("/event-types/{id}")
  @delete
  op deleteEventType(@path id: string): {
    @statusCode statusCode: 204;
  } | NotFoundError;

  /**
   * Единый список предстоящих встреч всех типов, отсортированный по `start`.
   */
  @route("/bookings")
  @get
  op listBookings(): Booking[];

  /**
   * Удалить бронирование.
   *
   * Вне минимума ТЗ — для полноты CRUD.
   */
  @route("/bookings/{id}")
  @delete
  op deleteBooking(@path id: string): {
    @statusCode statusCode: 204;
  } | NotFoundError;

  /**
   * Получить профиль владельца.
   *
   * Возвращает единственный предзаданный профиль по умолчанию. Аутентификации нет.
   * Опционально — для полноты.
   */
  @route("/owner")
  @get
  op getOwner(): Owner;
}
