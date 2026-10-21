import { expect, test } from "@playwright/test";

test("home opens four shuffled decade shelves and their Discover feeds", async ({ page }) => {
  await page.route("**/v1/anime?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const year = Number(params.get("start_date")?.slice(0, 4));
    if (![1990, 2000, 2010, 2020].includes(year)) return route.continue();
    const pageNumber = Number(params.get("page") ?? "1");
    const data = Array.from({ length: 25 }, (_, index) => {
      const rank = (pageNumber - 1) * 25 + index + 1;
      const id = year * 100 + rank;
      return {
        mal_id: id, title: `${year}s pick ${rank}`,
        url: `https://myanimelist.net/anime/${id}`,
        images: { jpg: { image_url: "", large_image_url: "" } },
        score: 10 - rank / 100
      };
    });
    return route.fulfill({ json: { data, pagination: {
      current_page: pageNumber, has_next_page: pageNumber < 2, last_visible_page: 2
    } } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Current season" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest headlines" })).toHaveCount(0);
  for (const decade of ["2020s", "2010s", "2000s", "1990s"]) {
    const shelf = page.locator(".home-decade").filter({ has: page.getByRole("heading", { name: `Top anime of the ${decade}` }) });
    await shelf.scrollIntoViewIfNeeded();
    await expect(shelf.locator(".home-season-tile")).toHaveCount(10);
    await expect(shelf.locator(".home-season-tile > div > button").first()).toContainText("pick");
  }

  const nineties = page.locator(".home-decade").filter({ has: page.getByRole("heading", { name: "Top anime of the 1990s" }) });
  const before = await nineties.locator(".home-season-tile > div > button").allTextContents();
  await nineties.getByRole("button", { name: "Shuffle" }).click();
  await expect.poll(() => nineties.locator(".home-season-tile > div > button").allTextContents()).not.toEqual(before);
  await nineties.getByRole("link", { name: "Browse" }).click();
  await expect(page).toHaveURL(/\/discover\?feed=1990s$/);
  await expect(page.getByRole("button", { name: "1990s", exact: true })).toHaveClass(/is-active/);
});
