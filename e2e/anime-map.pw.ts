import { expect, test, type Page } from "@playwright/test";

function anime(id: number, title: string, studios: string[]) {
  return {
    mal_id: id,
    url: `https://myanimelist.net/anime/${id}`,
    title,
    title_english: title,
    images: { jpg: { image_url: "", large_image_url: "" } },
    genres: [{ name: "Comedy" }],
    studios: studios.map((name) => ({ name }))
  };
}

const center = anime(1, "The Disastrous Life of Saiki K.", ["J.C.Staff"]);
const titles = [
  center,
  anime(2, "Comedy Story One", ["Studio B"]),
  anime(3, "Comedy Story Two", ["Studio C"]),
  anime(4, "Comedy Story Three", ["Studio B"]),
  anime(5, "Comedy Story Four", ["Studio C"]),
  anime(6, "Comedy Story Five", ["J.C.Staff"]),
  anime(7, "Comedy Story Six", ["Studio B"])
];

async function mockCatalog(page: Page) {
  await page.route("https://api.tenrai.org/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown;
    if (url.pathname === "/v1/anime/1/full") {
      body = { data: center };
    } else if (url.pathname === "/v1/genres/anime") {
      body = { data: [{ mal_id: 4, name: "Comedy" }] };
    } else if (url.pathname === "/v1/producers") {
      body = { data: [{ mal_id: 9, name: url.searchParams.get("q") }] };
    } else {
      body = {
        data: titles,
        pagination: { current_page: 1, has_next_page: false, last_visible_page: 1 }
      };
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify(body)
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockCatalog(page);
});

test("keeps the selected poster and connected titles inside the map", async ({ page }) => {
  await page.goto("/discover?view=map&anime=1", { waitUntil: "domcontentloaded" });
  const canvas = page.locator(".anime-map__canvas");
  const selected = page.getByRole("button", { name: "Open details for The Disastrous Life of Saiki K." });
  await expect(selected).toBeVisible();

  const frame = await canvas.boundingBox();
  const poster = await selected.boundingBox();
  expect(frame).not.toBeNull();
  expect(poster).not.toBeNull();
  expect(poster!.y).toBeGreaterThanOrEqual(frame!.y + 20);
  expect(poster!.y + poster!.height).toBeLessThan(frame!.y + frame!.height);

  for (const neighbor of await page.locator(".anime-map__neighbor").all()) {
    const box = await neighbor.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(frame!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
  }
});

test("restores anime and connection from a link and browser Back", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/discover?view=map&anime=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Open details for The Disastrous Life of Saiki K." })).toBeVisible();
  await page.getByRole("button", { name: "genre Comedy" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("facet")).toBe("genre:Comedy");
  await expect(page.getByRole("button", { name: "studio Studio B" })).toBeVisible();
  await page.getByRole("button", { name: "studio Studio B" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("facet")).toBe("studio:Studio B");
  await expect.poll(() => new URL(page.url()).searchParams.get("bridge")).toBe("genre:Comedy");
  await page.getByRole("button", { name: "Share map" }).click();
  await expect(page.getByText("Map link copied.", { exact: true })).toBeVisible();
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(shared.searchParams.get("anime")).toBe("1");
  expect(shared.searchParams.get("facet")).toBe("studio:Studio B");
  expect(shared.searchParams.get("bridge")).toBe("genre:Comedy");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Open details for The Disastrous Life of Saiki K." })).toBeVisible();
  await expect(page.getByRole("button", { name: "studio Studio B" })).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("facet")).toBe("genre:Comedy");
  await expect(page.getByRole("button", { name: "genre Comedy" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Explore connections for Comedy Story One" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("anime")).toBe("2");
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("anime")).toBe("1");
  await expect(page.getByRole("button", { name: "genre Comedy" })).toHaveAttribute("aria-pressed", "true");
});

test("keeps filter links and a recent exploration trail", async ({ page }) => {
  await page.goto("/discover?view=map&anime=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Explore connections for Comedy Story One" })).toBeVisible();
  await page.getByRole("button", { name: "Explore connections for Comedy Story One" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("anime")).toBe("2");
  await page.getByRole("button", { name: "The Disastrous Life of Saiki K.", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("anime")).toBe("1");
  await page.getByRole("button", { name: "Not in my library" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("mapFilter")).toBe("untracked");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Not in my library" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear trail" }).click();
  await expect(page.getByRole("button", { name: "Clear trail" })).toHaveCount(0);
});
