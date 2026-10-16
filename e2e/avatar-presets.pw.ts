import { expect, test } from "@playwright/test";

test("selects an Attack on Titan avatar and keeps it after reload", async ({ page }) => {
  let avatarId = "male-01";
  const user = () => ({
    id: "avatar-test-user", email: "avatar@example.test", username: "Avatar test",
    provider: "email", avatarId, bannerId: "banner-01", scoreStep: 1,
    favorites: { anime: [], studios: [], directors: [], characters: [] }
  });

  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: user() } }));
  await page.route("**/api/auth/avatar", async (route) => {
    const body = route.request().postDataJSON() as { avatarId: string };
    avatarId = body.avatarId;
    await route.fulfill({ json: { user: user() } });
  });
  await page.route("**/api/auth/passkeys", (route) => route.fulfill({ json: { passkeys: [] } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));

  await page.goto("/profile?edit=profile", { waitUntil: "domcontentloaded" });
  const group = page.getByRole("group", { name: "Attack on Titan profile pictures" });
  const eren = group.getByRole("button", { name: "Use Eren Yeager profile picture" });
  const mikasa = group.getByRole("button", { name: "Use Mikasa Ackerman profile picture" });
  await expect(eren).toBeVisible();
  await expect(mikasa).toBeVisible();
  await expect.poll(() => eren.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  await mikasa.click();
  await expect(mikasa).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".account-avatar img")).toHaveAttribute("src", "/avatars/aot/mikasa.webp");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(group.getByRole("button", { name: "Use Mikasa Ackerman profile picture" })).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
});
