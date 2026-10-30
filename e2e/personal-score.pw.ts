import { expect, test } from "@playwright/test";

test("switches to half-point scores out of 100 without changing existing ratings", async ({ page }) => {
  const account = {
    id: "score-test-user", email: "score@example.test", username: "Score test",
    provider: "email", avatarId: "", bannerId: "", scoreStep: 1 as 1 | 0.5,
    scoreScale: 10 as 10 | 100,
    favorites: { anime: [], characters: [], studios: [], directors: [] }
  };
  const item = {
    anime: {
      id: 991001, title: "Score Example", imageUrl: "", largeImageUrl: "",
      synopsis: "", status: "Finished Airing", type: "TV", genres: [], studios: [], url: ""
    },
    status: "watching", progress: 0, notes: "", userScore: 8.5,
    addedAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z"
  };
  const preferences: Array<{ scoreStep: number; scoreScale: number }> = [];

  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: account } }));
  await page.route("**/api/auth/preferences", async (route) => {
    const body = route.request().postDataJSON() as { scoreStep: 1 | 0.5; scoreScale: 10 | 100 };
    preferences.push(body);
    account.scoreStep = body.scoreStep;
    account.scoreScale = body.scoreScale;
    await route.fulfill({ json: { user: account, message: "Scoring preference updated." } });
  });
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [item], total: 1 } }));
  await page.route("**/api/library", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { items: Array<{ userScore?: number }> };
      item.userScore = body.items[0].userScore ?? item.userScore;
    }
    await route.fulfill({ json: { saved: 1 } });
  });

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const scale = page.getByRole("group", { name: "Personal score scale" });
  await scale.getByRole("button", { name: /Out of 100/ }).click();
  const increments = page.getByRole("group", { name: "Personal score increment" });
  await increments.getByRole("button", { name: /Half steps/ }).click();
  expect(preferences).toEqual([
    { scoreStep: 1, scoreScale: 100 },
    { scoreStep: 0.5, scoreScale: 100 }
  ]);

  await page.goto("/library", { waitUntil: "domcontentloaded" });
  const card = page.getByRole("button", { name: "Open and edit Score Example" });
  await expect(card).toContainText("85/100");
  await card.click();
  const score = page.getByRole("dialog").getByLabel("Your score");
  await expect(score).toHaveValue("85");
  await expect(score).toHaveAttribute("step", "0.5");
  await expect(score).toHaveAttribute("max", "100");
  await score.fill("85.5");
  await score.blur();
  await expect(score).toHaveValue("85.5");
  await expect(card).toContainText("85.5/100");
  await expect.poll(() => item.userScore).toBe(8.55);

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await scale.getByRole("button", { name: /^Out of 10\b/ }).click();
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  await expect(card).toContainText("8.55/10");
  await card.click();
  const unchangedScore = page.getByRole("dialog").getByLabel("Your score");
  await expect(unchangedScore).toHaveValue("8.55");
  await unchangedScore.focus();
  await unchangedScore.blur();
  await expect(card).toContainText("8.55/10");
});
