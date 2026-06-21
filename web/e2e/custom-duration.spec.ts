import { test, expect } from "@playwright/test";
import {
  createBooking,
  createEventType,
  deleteBooking,
  deleteEventType,
  futureSlotMinutes,
} from "./helpers";

const uid = () =>
  `e2e-cd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

let offset = 480;

test.describe("Гость — произвольная длительность", () => {

  // Сценарий A: селектор длительности отображается с дефолтом из типа события
  test("A: селектор длительности показывает дефолтное значение", async ({
    page,
  }) => {
    await page.goto("/book/intro-call");
    await page.waitForSelector("text=Свободные слоты");

    const input = page.locator("#duration");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("30"); // intro-call has 30 min duration
  });

  // Сценарий B: изменение длительности перезапрашивает слоты
  test("B: смена длительности перезагружает сетку слотов", async ({
    page,
  }) => {
    const id = uid();
    await createEventType(id, { durationMinutes: 30 });

    await page.goto(`/book/${id}`);
    await page.waitForSelector("text=Свободные слоты");

    // Запоминаем, сколько слотов было при 30 мин
    const slots30 = await page.locator("button:not([disabled])").count();

    // Меняем на 90 минут — слотов должно стать меньше
    const input = page.locator("#duration");
    await input.fill("90");
    await input.press("Enter");
    await page.waitForTimeout(500);

    const slots90 = await page.locator("button:not([disabled])").count();
    expect(slots90).toBeLessThan(slots30);

    await deleteEventType(id);
  });

  // Сценарий C: бронирование с произвольной длительностью
  test("C: бронь с произвольной длительностью завершается успехом", async ({
    page,
  }) => {
    offset += 30;
    const id = uid();
    await createEventType(id, { durationMinutes: 30 });

    const start = futureSlotMinutes(offset, 45);

    // Создаём бронь через API с durationMinutes=45
    const booking = await createBooking(id, start, "Custom Dur", "custom@test.com", 45);

    // Идём на страницу, меняем длительность на 45 и проверяем,
    // что занятый слот неактивен
    await page.goto(`/book/${id}`);
    await page.waitForSelector("text=Свободные слоты");

    const input = page.locator("#duration");
    await input.fill("45");
    await input.press("Enter");
    await page.waitForTimeout(500);

    // Ищем занятый слот
    const disabledSlot = page.locator("button:disabled").first();
    await expect(disabledSlot).toBeVisible();

    await deleteBooking(booking.id);
    await deleteEventType(id);
  });

  // Сценарий D: бронирование с произвольной длительностью через UI
  test("D: полный поток бронирования с произвольной длительностью", async ({
    page,
  }) => {
    offset += 30;
    const id = uid();
    await createEventType(id, { durationMinutes: 30 });

    await page.goto(`/book/${id}`);
    await page.waitForSelector("text=Свободные слоты");

    // Меняем длительность на 45 минут
    const input = page.locator("#duration");
    await input.fill("45");
    await input.press("Enter");
    await page.waitForTimeout(500);

    // Выбираем первый доступный слот
    const slotBtn = page.locator("button:not([disabled])", {
      hasText: "–",
    });
    const slotCount = await slotBtn.count();
    test.skip(slotCount === 0, "No available slots for 45 min duration");

    await slotBtn.first().click();

    // Заполняем форму
    await page.fill("#guestName", "Custom Duration Guest");
    await page.fill("#guestEmail", "custom-dur@test.com");
    await page.getByRole("button", { name: "Забронировать" }).click();

    // Проверяем успех
    await expect(page).toHaveURL(/\/book\/.+\/success$/, { timeout: 15000 });
    await expect(page.getByText("Встреча забронирована")).toBeVisible();
    await expect(page.getByText("45 мин")).toBeVisible();
    await expect(page.getByText("Custom Duration Guest")).toBeVisible();
    await expect(page.getByText("custom-dur@test.com")).toBeVisible();

    await deleteEventType(id);
  });

  // Сценарий E: кнопка «Сбросить» возвращает дефолтную длительность
  test("E: кнопка Сбросить возвращает длительность по умолчанию", async ({
    page,
  }) => {
    await page.goto("/book/intro-call");
    await page.waitForSelector("text=Свободные слоты");

    // Меняем длительность
    const input = page.locator("#duration");
    await input.fill("45");
    await input.press("Enter");
    await page.waitForTimeout(300);

    // Кликаем «Сбросить»
    await page.getByRole("button", { name: "Сбросить" }).click();
    await page.waitForTimeout(300);

    // Значение вернулось к 30
    await expect(input).toHaveValue("30");
  });
});
