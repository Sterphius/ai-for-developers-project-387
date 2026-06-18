import { test, expect } from "@playwright/test";
import {
  createEventType,
  createBooking,
  deleteBooking,
  deleteEventType,
  futureSlotMinutes,
} from "./helpers";

const uid = () =>
  `e2e-ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

let offset = 120;

test.describe("Админ — бронирования", () => {
  // Сценарий 13: бронь отображается в админке
  test("13: созданная бронь видна на странице предстоящих встреч", async ({
    page,
  }) => {
    offset += 20;
    const eventTypeId = uid();
    await createEventType(eventTypeId, { durationMinutes: 15 });
    const start = futureSlotMinutes(offset, 15);
    const booking = await createBooking(
      eventTypeId,
      start,
      "Admin Test Guest",
      "admin-test@example.com",
    );

    await page.goto("/admin/bookings");
    await expect(page.getByText("Admin Test Guest")).toBeVisible();
    await expect(
      page.getByText("admin-test@example.com"),
    ).toBeVisible();

    await deleteBooking(booking.id);
    await deleteEventType(eventTypeId);
  });

  // Сценарий 14: удаление брони из админки
  test("14: отмена брони из админки удаляет её", async ({ page }) => {
    offset += 20;
    const eventTypeId = uid();
    await createEventType(eventTypeId, { durationMinutes: 15 });
    const start = futureSlotMinutes(offset, 15);
    const booking = await createBooking(
      eventTypeId,
      start,
    "Admin Delete Guest",
      "admin-delete@example.com",
    );

    await page.goto("/admin/bookings");
    await expect(page.getByText("Admin Delete Guest")).toBeVisible();

    await page.getByLabel("Отменить бронирование").click();
    await page.getByRole("button", { name: "Отменить" }).click();

    await expect(
      page.getByText("Бронирование отменено."),
    ).toBeVisible();
    await expect(
      page.getByText("Admin Delete Guest"),
    ).not.toBeVisible();

    await deleteEventType(eventTypeId);
  });

  // Сценарий 16: список броней пуст
  test("16: пустой список броней", async ({ page }) => {
    // Не создаём бронь — идём сразу в пустой список
    await page.goto("/admin/bookings");
    await expect(page.getByText("Бронирований нет")).toBeVisible();
  });
});
