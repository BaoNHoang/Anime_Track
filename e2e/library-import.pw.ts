import { expect, test } from "@playwright/test";

const imported = {
  anime: {
    id: 987654,
    title: "Import Preview Example",
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "",
    status: "Finished Airing",
    type: "TV",
    genres: [],
    studios: [],
    url: ""
  },
  status: "completed",
  progress: 1,
  notes: "",
  addedAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z"
};

test("previews, applies, and undoes a library import", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    user: {
      id: "import-test-user", email: "import@example.test", username: "Import test",
      provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
      favorites: { anime: [], genres: [], studios: [] }
    }
  } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));
  await page.route("**/api/library", (route) => route.fulfill({ json: { saved: 1 } }));
  await page.route("**/api/library/*", (route) => route.fulfill({ json: {} }));

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Choose import file" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "example.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "Banime", items: [imported] }))
  });

  const preview = page.getByRole("region", { name: "Review library import" });
  await expect(preview).toContainText("1 new");
  await expect(preview).toContainText("Nothing changes until you confirm");
  await preview.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Imported 1 new")).toBeVisible();
  await page.getByRole("button", { name: "Undo last import" }).click();
  await expect(page.getByText("Import undone.")).toBeVisible();
});
