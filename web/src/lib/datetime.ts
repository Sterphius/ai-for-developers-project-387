/**
 * Утилиты работы со временем.
 * API оперирует UTC (ISO-строки). UI показывает локальное время с указанием зоны.
 */

const dayKeyFmt = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Локальное название таймзоны пользователя, например "Europe/Moscow". */
export const localTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";

/** Ключ дня (локальный) для группировки слотов/броней. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Человекочитаемый заголовок дня: "понедельник, 17 июня". */
export function formatDayHeading(iso: string): string {
  return capitalize(dayKeyFmt.format(new Date(iso)));
}

/** Время слота: "14:30". */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** Дата и время: "17 июня, 14:30". */
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** Диапазон времени слота: "14:30 – 15:00". */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** Длительность в минутах → "30 мин" / "1 ч 30 мин". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/** Группировка элементов с ISO-полем по локальному дню, с сохранением порядка. */
export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string,
): { key: string; heading: string; items: T[] }[] {
  const groups = new Map<string, { heading: string; items: T[] }>();
  for (const item of items) {
    const iso = getIso(item);
    const key = dayKey(iso);
    if (!groups.has(key)) {
      groups.set(key, { heading: formatDayHeading(iso), items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    heading: value.heading,
    items: value.items,
  }));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
