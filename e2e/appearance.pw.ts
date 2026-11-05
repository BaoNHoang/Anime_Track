import { expect, test } from "@playwright/test";

test("anime backgrounds persist and seasonal mode follows the holiday calendar", async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 0, 15, 12) });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    user: {
      id: "appearance-test-user", email: "appearance@example.test", username: "Appearance test",
      provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
      favorites: { anime: [], genres: [], studios: [] }
    }
  } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const backgrounds = page.getByRole("group", { name: "Anime-inspired background" });
  await backgrounds.getByRole("button", { name: /Attack on Titan/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "aot");
  await expect(page.locator(".ambient-backdrop--anime")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "aot");
  await backgrounds.getByRole("button", { name: /One Piece/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "one-piece");
  await backgrounds.getByRole("button", { name: /Mushoku Tensei/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "mushoku-tensei");
  await expect(page.locator(".ambient-backdrop--anime")).toHaveCSS("background-image", /mushoku-tensei-fields\.webp/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "mushoku-tensei");
  await backgrounds.getByRole("button", { name: /Seasonal/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "seasonal");
  await expect(page.locator(".ambient-backdrop--anime")).toHaveCount(0);

  await page.clock.setSystemTime(new Date(2026, 10, 30, 23, 59, 30));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-holiday-season", "thanksgiving");
  await expect(page.locator(".ambient-backdrop--holiday")).toHaveCSS("background-image", /holiday-thanksgiving\.webp/);
  await page.clock.fastForward(31_000);
  await expect(page.locator("html")).toHaveAttribute("data-holiday-season", "christmas");
  await expect(page.locator(".ambient-backdrop--holiday")).toHaveCSS("background-image", /holiday-christmas\.webp/);

  await backgrounds.getByRole("button", { name: /Attack on Titan/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-holiday-season", "christmas");
  await expect(page.locator(".ambient-backdrop--holiday")).toHaveCount(0);
  await expect(page.locator(".ambient-backdrop--anime")).toHaveCSS("background-image", /aot-walls\.webp/);
  await expect(backgrounds.getByRole("button", { name: /Seasonal/ }).locator(".anime-theme-option__scene"))
    .toHaveCSS("background-image", /holiday-christmas\.webp/);
});
