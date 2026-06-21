import { expect, type Page } from "@playwright/test";

const API = "http://localhost:8080/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

export async function createEventType(
  id: string,
  overrides?: Partial<{
    title: string;
    description: string;
    durationMinutes: number;
  }>,
): Promise<void> {
  await apiPost("/admin/event-types", {
    id,
    title: overrides?.title ?? `Test ${id}`,
    description: overrides?.description ?? "",
    durationMinutes: overrides?.durationMinutes ?? 30,
  });
}

export async function createBooking(
  eventTypeId: string,
  start: string,
  guestName: string,
  guestEmail: string,
  durationMinutes?: number,
): Promise<{ id: string }> {
  return apiPost("/bookings", {
    eventTypeId,
    start,
    guestName,
    guestEmail,
    ...(durationMinutes !== undefined && { durationMinutes }),
  });
}

export async function deleteEventType(id: string): Promise<void> {
  await apiDelete(`/admin/event-types/${encodeURIComponent(id)}`);
}

export async function listBookings() {
  return apiGet<unknown[]>("/admin/bookings");
}

export async function deleteBooking(id: string): Promise<void> {
  await apiDelete(`/admin/bookings/${encodeURIComponent(id)}`);
}

/** Fetches slots and returns the first available one (start ISO + end ISO). */
export async function findAvailableSlot(eventTypeId: string): Promise<{
  start: string;
  end: string;
}> {
  const slots = await apiGet<
    { start: string; end: string; available: boolean }[]
  >(`/event-types/${encodeURIComponent(eventTypeId)}/slots`);
  const avail = slots.find((s) => s.available);
  if (!avail) throw new Error("No available slots found");
  return { start: avail.start, end: avail.end };
}

/** Returns a UTC ISO string N minutes from now, aligned to the server's grid. */
export function futureSlotMinutes(
  minutesFromNow: number,
  durationMinutes: number,
): string {
  const now = new Date();

  // GridOrigin(now) — start of current UTC day (mirrors server logic).
  const gridOrigin = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );

  // Target: now + minutesFromNow
  const target = new Date(now.getTime() + minutesFromNow * 60_000);

  // First grid boundary >= target
  const stepMs = durationMinutes * 60_000;
  const diff = target.getTime() - gridOrigin.getTime();
  const steps = Math.ceil(diff / stepMs);
  return new Date(gridOrigin.getTime() + steps * stepMs).toISOString();
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Navigates to / and waits for event type cards to appear. */
export async function goHome(page: Page) {
  await page.goto("/");
  await page.waitForSelector("text=Выберите вид встречи");
}

/** Returns the href of the first "Выбрать время" link on the home page. */
export async function pickFirstEventType(page: Page) {
  await page.locator('a:has-text("Выбрать время")').first().click();
}

/** Navigates to /admin. */
export async function goAdmin(page: Page) {
  await page.goto("/admin");
  await page.waitForSelector("text=Кабинет владельца");
}
