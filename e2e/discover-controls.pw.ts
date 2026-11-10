import { expect, test } from "@playwright/test";

test("Discover keeps extra categories and filters available without crowding the page", async ({ page }) => {
  await page.goto("/discover?feed=1990s", { waitUntil: "domcontentloaded" });

  const moreCategories = page.getByRole("combobox", { name: "More browse categories" });
  const moreFilters = page.getByRole("button", { name: "More filters" });
  await expect(moreCategories).toHaveValue("1990s");
  await expect(page.getByRole("button", { name: "Airing now" })).toBeVisible();
  await expect(page.getByLabel("Year", { exact: true })).toHaveCount(0);

  await moreFilters.click();
  await page.getByLabel("Year", { exact: true }).fill("1999");
  await expect(moreFilters).toHaveText("More filters (1)");
  await moreFilters.click();
  await expect(page.getByLabel("Year", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(moreFilters).toHaveText("More filters");

  await moreCategories.selectOption("classics");
  await expect(page).toHaveURL(/\/discover\?feed=classics$/);
  await page.getByRole("button", { name: "Airing now" }).click();
  await expect(page).toHaveURL(/\/discover$/);
});
