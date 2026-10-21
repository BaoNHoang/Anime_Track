import { expect, test } from "@playwright/test";

test("home keeps one classics path and opens that Discover feed", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Current season" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest headlines" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Top anime of the 20/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Explore classics/ }).click();
  await expect(page).toHaveURL(/\/discover\?feed=classics$/);
  await expect(page.getByRole("heading", { name: "Classics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Classics" })).toHaveClass(/is-active/);
});
