import { expect, test } from "@playwright/test";

test("home fits upcoming broadcasts beside the shelves and opens decade feeds", async ({ page }, testInfo) => {
  let detailModuleRequests = 0;
  const decadeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("AnimeDetailPanel.tsx")) detailModuleRequests += 1;
    const url = new URL(request.url());
    if (url.pathname === "/v1/anime" && url.searchParams.has("start_date")) {
      decadeRequests.push(url.searchParams.toString());
    }
  });
  const airingData = Array.from({ length: 12 }, (_, index) => {
    const nextDay = new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000);
    const broadcastDay = new Intl.DateTimeFormat("en-US", {
      weekday: "long", timeZone: "UTC"
    }).format(nextDay);
    return {
      mal_id: 7788 + index, title: `Next broadcast test ${index + 1}`,
      status: "Currently Airing", type: "TV",
      url: `https://myanimelist.net/anime/${7788 + index}`,
      images: { jpg: { image_url: "", large_image_url: "" } },
      broadcast: { day: broadcastDay, time: "12:00", timezone: "UTC" }
    };
  });
  await page.route("**/v1/seasons/now?*", (route) => route.fulfill({ json: {
    data: airingData, pagination: { current_page: 1, has_next_page: false }
  } }));
  await page.route("**/v1/top/anime?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("filter") !== "airing") return route.continue();
    return route.fulfill({ json: { data: airingData.map((anime, index) =>
      index === 0 ? { ...anime, broadcast: undefined } : anime
    ), pagination: { current_page: 1, has_next_page: false } } });
  });
  await page.route("**/v1/anime?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const year = Number(params.get("start_date")?.slice(0, 4));
    if (![1990, 2000, 2010, 2020].includes(year)) return route.fulfill({ json: {
      data: [], pagination: { current_page: 1, has_next_page: false }
    } });
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
  await expect(page.locator(".home-page").getByRole("link", { name: /^Browse/ })).toHaveCount(0);
  const airing = page.locator(".home-airing-rail");
  await expect(airing.getByRole("heading", { name: "Airing next" })).toBeVisible();
  await expect(airing.getByRole("button", { name: /Next broadcast test/ }))
    .toHaveCount(testInfo.project.name === "desktop-chromium" ? 6 : 10);
  expect(detailModuleRequests).toBe(0);
  await airing.getByRole("button", { name: /Next broadcast test 1/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Next broadcast test 1" })).toBeVisible();
  expect(detailModuleRequests).toBe(1);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(airing).not.toContainText("Broadcast times are estimates");
  if (testInfo.project.name === "desktop-chromium") {
    await expect(airing).toHaveCSS("position", "sticky");
    const railBox = await airing.boundingBox();
    const seasonBox = await page.getByRole("heading", { name: "Current season" }).boundingBox();
    expect(railBox!.x).toBeLessThan(seasonBox!.x);
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect.poll(async () => (await airing.boundingBox())?.y).toBeGreaterThanOrEqual(88);
    await expect.poll(async () => (await airing.boundingBox())?.y).toBeLessThan(120);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect(airing.getByRole("button", { name: /Next broadcast test/ })).toHaveCount(9);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(airing).toHaveCSS("position", "sticky");
    await expect(airing.getByRole("button", { name: /Next broadcast test/ })).toHaveCount(7);
  } else {
    await expect(airing).toHaveCSS("position", "static");
  }
  await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest headlines" })).toHaveCount(0);
  expect(decadeRequests).toHaveLength(0);
  for (const decade of ["2020s", "2010s", "2000s", "1990s"]) {
    const shelf = page.locator(".home-decade").filter({ has: page.getByRole("heading", { name: `Top anime of the ${decade}` }) });
    await shelf.scrollIntoViewIfNeeded();
    await expect(shelf.locator(".home-season-tile")).toHaveCount(10);
    await expect(shelf.locator(".home-season-tile > div > button").first()).toContainText("pick");
  }
  expect(decadeRequests).toHaveLength(8);
  expect(new Set(decadeRequests).size).toBe(8);

  const nineties = page.locator(".home-decade").filter({ has: page.getByRole("heading", { name: "Top anime of the 1990s" }) });
  const before = await nineties.locator(".home-season-tile > div > button").allTextContents();
  await nineties.getByRole("button", { name: "Shuffle" }).click();
  await expect.poll(() => nineties.locator(".home-season-tile > div > button").allTextContents()).not.toEqual(before);
  expect(decadeRequests).toHaveLength(8);
  await page.reload({ waitUntil: "domcontentloaded" });
  for (const shelf of await page.locator(".home-decade").all()) {
    await shelf.scrollIntoViewIfNeeded();
    await expect(shelf.locator(".home-season-tile")).toHaveCount(10);
  }
  expect(decadeRequests).toHaveLength(8);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Discover" }).click();
  await page.getByRole("button", { name: "1990s", exact: true }).click();
  await expect(page).toHaveURL(/\/discover\?feed=1990s$/);
  await expect(page.getByRole("button", { name: "1990s", exact: true })).toHaveClass(/is-active/);
});
