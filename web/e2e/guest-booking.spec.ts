import { test, expect } from "@playwright/test";
import {
  createBooking,
  createEventType,
  deleteBooking,
  deleteEventType,
  futureSlotMinutes,
} from "./helpers";

const uid = () =>
  `e2e-gb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test.describe("Гость — бронирование", () => {
  const seededId = "intro-call";

  // Сценарий 1: список типов событий загружается
  test("1: список типов событий отображается", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Выберите вид встречи")).toBeVisible();
    await expect(page.getByText("Вводный звонок")).toBeVisible();
    await expect(page.getByText("Консультация")).toBeVisible();
  });

  // Сценарий 2, 5: полный поток бронирования → успех
  test("2/5: бронирование через форму завершается успехом", async ({
    page,
  }) => {
    const guestName = "Тест Гость";
    const guestEmail = "test@example.com";

    await page.goto(`/book/${seededId}`);
    await page.waitForSelector("text=Свободные слоты");

    const slotBtn = page.locator("button:not([disabled])", {
      hasText: "–",
    });
    await slotBtn.first().click();

    await page.fill("#guestName", guestName);
    await page.fill("#guestEmail", guestEmail);
    await page.getByRole("button", { name: "Забронировать" }).click();

    await expect(page).toHaveURL(/\/book\/intro-call\/success$/, { timeout: 15000 });
    await expect(page.getByText("Встреча забронирована")).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText(guestEmail)).toBeVisible();
  });

  // Сценарий 3: занятый слот отображается как недоступный
  test("3: занятый слот показывается disabled", async ({ page }) => {
    const id = uid();
    await createEventType(id, { durationMinutes: 15 });

    const start = futureSlotMinutes(240, 15);
    const booking = await createBooking(
      id,
      start,
      "Occupier",
      "occupier@test.com",
    );

    await page.goto(`/book/${id}`);
    await page.waitForSelector("text=Свободные слоты");

    await expect(page.locator("button:disabled").first()).toBeVisible();

    await deleteBooking(booking.id);
    await deleteEventType(id);
  });

  // Сценарий 4: несуществующий тип события → редирект + тост
  test("4: несуществующий eventTypeId редиректит на / с тостом", async ({
    page,
  }) => {
    await page.goto("/book/nonexistent-id-12345");
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.getByText("Выберите вид встречи")).toBeVisible();
    await expect(page.getByText("Тип события не найден.")).toBeVisible();
  });
});
