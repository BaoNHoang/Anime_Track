import { expect, test } from "@playwright/test";

test("news stories open the matching anime panel and can add it to the library", async ({ page }) => {
  const titles = Array.from({ length: 6 }, (_, index) => ({
    mal_id: 991100 + index,
    title: `News anime ${index + 1}`,
    images: { jpg: { image_url: "", large_image_url: "" } },
    synopsis: "Catalog synopsis for this anime.",
    status: "Currently Airing", type: "TV", episodes: 12, genres: [], studios: []
  }));
  const detailsRequested: number[] = [];
  const savedIds: number[] = [];
  await page.addInitScript(() => localStorage.setItem("banime:library:v1", "[]"));
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: {
    id: "news-tracker-user", email: "news@example.test", username: "News test",
    provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
    favorites: { anime: [], characters: [], studios: [], directors: [] }
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { items: Array<{ anime: { id: number } }> };
      savedIds.push(...body.items.map((item) => item.anime.id));
    }
    await route.fulfill({ json: { saved: 1 } });
  });
  await page.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const id = Number(path.match(/\/anime\/(\d+)/)?.[1]);
    const anime = titles.find((title) => title.mal_id === id);
    if (path.endsWith("/full") && anime) {
      detailsRequested.push(id);
      await route.fulfill({ json: { data: anime } });
    } else if (path.endsWith("/news") && anime) {
      const index = titles.indexOf(anime);
      await route.fulfill({ json: { data: [{
        mal_id: index + 1, title: `Announcement ${index + 1}`,
        url: `https://myanimelist.net/news/${index + 1}`,
        date: `2026-11-${String(19 - index).padStart(2, "0")}T12:00:00Z`,
        images: { jpg: {} }, comments: 2, excerpt: "Read the latest announcement."
      }] } });
    } else {
      await route.fulfill({ json: { data: titles, pagination: { current_page: 1, has_next_page: false } } });
    }
  });

  await page.goto("/news", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(6);
  expect(detailsRequested).toEqual([]);
  const dialog = page.getByRole("dialog");
  for (const index of [0, 1, 5]) {
    const story = index === 0 ? page.locator(".news-lead") : page.locator(".news-card").nth(index - 1);
    const link = story.getByRole("link").first();
    await expect(link).toHaveAttribute("href", `https://myanimelist.net/news/${index + 1}`);
    await expect(link).toHaveAttribute("target", "_blank");
    await story.getByRole("button", { name: `View anime: News anime ${index + 1}` }).click();
    await expect(dialog.getByRole("heading", { name: `News anime ${index + 1}`, exact: true })).toBeVisible();
    await expect(dialog).toContainText("Catalog synopsis for this anime.");
    await expect.poll(() => detailsRequested.includes(titles[index].mal_id)).toBe(true);
    if (index === 5) {
      await dialog.getByRole("button", { name: "Add to library", exact: true }).click();
      await expect(dialog.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("plan_to_watch");
      await expect.poll(async () => {
        const localIds = await page.evaluate(() => {
          const items = JSON.parse(localStorage.getItem("banime:library:v1") ?? "[]") as Array<{ anime: { id: number } }>;
          return items.map((item) => item.anime.id);
        });
        return [...savedIds, ...localIds];
      }).toContain(titles[index].mal_id);
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/news$/);
  }
});
