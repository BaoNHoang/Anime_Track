const API_BASE_URL = "https://api.jikan.moe/v4";
const MIN_REQUEST_INTERVAL_MS = 350;

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;
const responseCache = new Map<
  string,
  { expiresAt: number; value: unknown }
>();

export class JikanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "JikanApiError";
  }
}

async function waitForRateLimit() {
  const waitTime = Math.max(
    0,
    MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestStartedAt)
  );

  if (waitTime > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, waitTime));
  }

  lastRequestStartedAt = Date.now();
}

export async function jikanGet<T>(
  path: string,
  options: { signal?: AbortSignal; cacheMs?: number } = {}
): Promise<T> {
  const cacheKey = path;
  const cached = responseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  requestQueue = requestQueue.then(waitForRateLimit, waitForRateLimit);
  await requestQueue;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal: options.signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new JikanApiError(
      response.status === 429
        ? "Jikan is receiving too many requests. Try again in a moment."
        : "Jikan could not load this anime data.",
      response.status
    );
  }

  const data = (await response.json()) as T;
  responseCache.set(cacheKey, {
    expiresAt: Date.now() + (options.cacheMs ?? 5 * 60 * 1000),
    value: data
  });

  return data;
}
