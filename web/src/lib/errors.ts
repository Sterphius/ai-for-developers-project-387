import { ApiClientError } from "@/api/hooks";
import type { ErrorCode } from "@/api/client";

/** Человекочитаемые сообщения по кодам ошибок контракта. */
const ERROR_MESSAGES: Record<ErrorCode | "UNKNOWN", string> = {
  SLOT_TAKEN: "Этот слот только что заняли. Выберите другое время.",
  EVENT_TYPE_NOT_FOUND: "Тип события не найден.",
  INVALID_SLOT:
    "Слот недоступен: он вне 14-дневного окна или не выровнен по сетке.",
  BOOKING_NOT_FOUND: "Бронирование не найдено.",
  UNKNOWN: "Произошла ошибка. Попробуйте ещё раз.",
};

/** Достаёт понятное пользователю сообщение из любой ошибки. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return ERROR_MESSAGES[err.code] ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return ERROR_MESSAGES.UNKNOWN;
}
