import { test, expect } from "@playwright/test";
import {
  createEventType,
  createBooking,
  deleteBooking,
  deleteEventType,
  futureSlotMinutes,
} from "./helpers";

const uid = () =>
  `e2e-cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

let offset = 360;

test.describe("Cross-role сценарии", () => {
  // Сценарий 15: бронь, сделанная гостем, видна админу без перезагрузки
  test("15: бронь гостя видна в админке", async ({ browser }) => {
    offset += 20;
    const eventTypeId = uid();
    await createEventType(eventTypeId, { durationMinutes: 15 });
    const start = futureSlotMinutes(offset, 15);

    const booking = await createBooking(
      eventTypeId,
      start,
      "Cross Role Guest",
      "cross@test.com",
    );

    const adminPage = await browser.newPage();
    await adminPage.goto("/admin/bookings");
    await expect(
      adminPage.getByText("Cross Role Guest"),
    ).toBeVisible();
    await expect(adminPage.getByText("cross@test.com")).toBeVisible();

    await deleteBooking(booking.id);
    await deleteEventType(eventTypeId);
    await adminPage.close();
  });

  // Сценарий 17: удаление типа события не ломает страницу броней
  test("17: удаление event type не ломает /admin/bookings", async ({
    page,
  }) => {
    offset += 20;
    const eventTypeId = uid();
    await createEventType(eventTypeId, { title: "Удаляемый тип", durationMinutes: 15 });
    const start = futureSlotMinutes(offset, 15);
    const booking = await createBooking(
      eventTypeId,
      start,
      "Orphan Guest",
      "orphan@test.com",
    );

    await deleteEventType(eventTypeId);

    await page.goto("/admin/bookings");
    await expect(page.getByText("Orphan Guest")).toBeVisible();
    await expect(page.getByText("Удаляемый тип")).not.toBeVisible();

    await deleteBooking(booking.id);
  });
});
