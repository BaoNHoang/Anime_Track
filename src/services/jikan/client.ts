const API_BASE_URL = "https://api.jikan.moe/v4";
const MIN_REQUEST_INTERVAL_MS = 350;
const CACHE_STORAGE_PREFIX = "banime:jikan-cache:v1:";
type CacheStorageTarget = "session" | "local";

let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;
let externalRequestGate: (() => Promise<void>) | undefined;
const responseCache = new Map<
  string,
  { expiresAt: number; value: unknown }
>();

interface CachedResponse {
  expiresAt: number;
  value: unknown;
}

export class JikanApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "JikanApiError";
  }
}

export function configureJikanRequestGate(
  gate: (() => Promise<void>) | undefined
) {
  externalRequestGate = gate;
}

async function waitForRateLimit() {
  await externalRequestGate?.();
  const waitTime = Math.max(
    0,
    MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestStartedAt)
  );

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestStartedAt = Date.now();
}

function getStorageKey(path: string) {
  return `${CACHE_STORAGE_PREFIX}${encodeURIComponent(path)}`;
}

function getBrowserStorage(storageTarget: CacheStorageTarget) {
  if (typeof window === "undefined") return undefined;
  return storageTarget === "local"
    ? window.localStorage
    : window.sessionStorage;
}

function readCachedResponse<T>(
  path: string,
  storageTarget: CacheStorageTarget
): T | undefined {
  const memoryValue = responseCache.get(path);
  if (memoryValue?.expiresAt && memoryValue.expiresAt > Date.now()) {
    return memoryValue.value as T;
  }

  try {
    const storage = getBrowserStorage(storageTarget);
    const storedValue = storage?.getItem(getStorageKey(path));
    if (!storedValue) return undefined;

    const parsedValue = JSON.parse(storedValue) as CachedResponse;
    if (parsedValue.expiresAt <= Date.now()) {
      storage?.removeItem(getStorageKey(path));
      return undefined;
    }

    responseCache.set(path, parsedValue);
    return parsedValue.value as T;
  } catch {
    return undefined;
  }
}

function writeCachedResponse(
  path: string,
  value: unknown,
  cacheMs: number,
  storageTarget: CacheStorageTarget
) {
  const cachedValue: CachedResponse = {
    expiresAt: Date.now() + cacheMs,
    value
  };
  responseCache.set(path, cachedValue);

  try {
    getBrowserStorage(storageTarget)?.setItem(
      getStorageKey(path),
      JSON.stringify(cachedValue)
    );
  } catch {
    // Memory caching still works when browser storage is unavailable or full.
  }
}

export async function jikanGet<T>(
  path: string,
  options: {
    signal?: AbortSignal;
    cacheMs?: number;
    cacheStorage?: CacheStorageTarget;
  } = {}
): Promise<T> {
  const cacheStorage = options.cacheStorage ?? "session";
  const cached = readCachedResponse<T>(path, cacheStorage);
  if (cached !== undefined) return cached;

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
  writeCachedResponse(
    path,
    data,
    options.cacheMs ?? 5 * 60 * 1000,
    cacheStorage
  );

  return data;
}
