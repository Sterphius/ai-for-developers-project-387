import { test, expect } from "@playwright/test";
import { createEventType, deleteEventType } from "./helpers";

const uid = () =>
  `e2e-et-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function rowWithTitle(page: import("@playwright/test").Page, title: string) {
  return page
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: title })
    .first();
}

test.describe("Админ — типы событий (CRUD)", () => {
  // Сценарий 8: создание типа события
  test("8: создание нового типа события", async ({ page }) => {
    const id = uid();
    const title = `Тестовый ${id}`;

    await page.goto("/admin");
    await page.getByRole("button", { name: "Создать тип" }).click();
    await page.fill("#et-id", id);
    await page.fill("#et-title", title);
    await page.fill("#et-desc", "Описание тестового типа");
    await page.fill("#et-duration", "45");
    await page.getByRole("button", { name: "Создать" }).click();

    await expect(page.getByText("Тип события создан.")).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    await deleteEventType(id);
  });

  // Сценарий 9: редактирование типа события
  test("9: редактирование названия типа события", async ({ page }) => {
    const id = uid();
    const title = `До ред ${id}`;
    const newTitle = `После ред ${id}`;

    await createEventType(id, { title });

    await page.goto("/admin");
    await expect(page.getByText(title)).toBeVisible();

    // Кликаем "Редактировать" в строке этого типа
    await rowWithTitle(page, title).getByLabel("Редактировать").click();
    await page.fill("#et-title", "");
    await page.fill("#et-title", newTitle);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Тип события обновлён.")).toBeVisible();
    await expect(page.getByText(newTitle)).toBeVisible();

    await deleteEventType(id);
  });

  // Сценарий 10: удаление типа события
  test("10: удаление типа события", async ({ page }) => {
    const id = uid();
    const title = `Удаляемый ${id}`;

    await createEventType(id, { title });

    await page.goto("/admin");
    await expect(page.getByText(title)).toBeVisible();

    // Кликаем "Удалить" в строке этого типа
    await rowWithTitle(page, title).getByLabel("Удалить").click();
    await page.getByRole("button", { name: "Удалить" }).click();

    await expect(page.getByText("Тип события удалён.")).toBeVisible();
    await expect(page.getByText(title)).not.toBeVisible();
  });

  // Сценарий 11: валидация формы — пустой id
  test("11: форма создания требует id", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Создать тип" }).click();

    await page.fill("#et-title", "Без id");
    await page.getByRole("button", { name: "Создать" }).click();

    await expect(
      page.getByText("Укажите id типа события."),
    ).toBeVisible();
  });

  // Сценарий 12: валидация — пустое название
  test("12: форма создания требует название", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Создать тип" }).click();

    await page.fill("#et-id", uid());
    await page.fill("#et-title", "");
    await page.getByRole("button", { name: "Создать" }).click();

    await expect(page.getByText("Укажите название.")).toBeVisible();
  });
});
