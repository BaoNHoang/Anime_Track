import { chromium, devices } from "@playwright/test";

const target = new URL(process.argv[2] ?? "http://127.0.0.1:4173/");
const runs = Number(process.argv[3] ?? 3);
if (!["http:", "https:"].includes(target.protocol) || !Number.isInteger(runs) || runs < 1 || runs > 10) {
  throw new Error("Usage: npm run perf:home -- [http(s) URL] [1-10 runs]");
}

const browser = await chromium.launch();
const samples = [];

try {
  for (let run = 0; run < runs; run += 1) {
    const context = await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const requests = { total: 0, catalog: 0, failed: 0 };
    page.on("request", (request) => {
      requests.total += 1;
      if (request.url().includes("api.tenrai.org")) requests.catalog += 1;
    });
    page.on("requestfailed", () => { requests.failed += 1; });

    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 75_000
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      window.__homePerf = { lcp: 0, cls: 0, blocking: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__homePerf.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__homePerf.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__homePerf.blocking += Math.max(0, entry.duration - 50);
        }
      }).observe({ type: "longtask", buffered: true });
    });

    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.getByRole("heading", { name: "Airing next" }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(6_000);
    const metrics = await page.evaluate(() => ({
      fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
      lcp: window.__homePerf.lcp || null,
      cls: window.__homePerf.cls,
      longTaskBlocking: window.__homePerf.blocking
    }));
    const homeRequests = { ...requests };
    const navigationStart = Date.now();
    await page.getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Discover" }).first().click();
    await page.getByRole("heading", { name: "Discover anime" }).waitFor({ timeout: 15_000 });
    samples.push({ ...metrics, discoverNavigationMs: Date.now() - navigationStart, requests: homeRequests });
    await context.close();
  }
} finally {
  await browser.close();
}

const median = (field) => {
  const values = samples.map((sample) => sample[field]).filter((value) => value !== null).sort((a, b) => a - b);
  return values.length ? values[Math.floor(values.length / 2)] : null;
};

console.log(JSON.stringify({
  target: target.href,
  profile: "Pixel 7, cold cache, 4x CPU, 150ms RTT, 1.6Mbps down",
  note: "Lab metrics only. Long-task blocking is a TBT-like proxy, not field INP. Navigation includes automation overhead.",
  median: {
    fcpMs: median("fcp"), lcpMs: median("lcp"), cls: median("cls"),
    longTaskBlockingMs: median("longTaskBlocking"), discoverNavigationMs: median("discoverNavigationMs")
  },
  samples
}, null, 2));
