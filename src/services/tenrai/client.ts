const API_BASE_URL = "https://api.tenrai.org/v1";
const MIN_REQUEST_INTERVAL_MS = 500;
const CACHE_STORAGE_PREFIX = "banime:tenrai-cache:v1:";
const MAX_MEMORY_CACHE_ENTRIES = 120;
const MAX_PERSISTENT_CACHE_ENTRIES = 120;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
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

function trimMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }
  while (responseCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

function trimPersistentCache(storage: Storage) {
  const cachedEntries: Array<{ key: string; expiresAt: number }> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(CACHE_STORAGE_PREFIX)) continue;
    try {
      const value = JSON.parse(storage.getItem(key) ?? "") as CachedResponse;
      if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
        storage.removeItem(key);
        continue;
      }
      cachedEntries.push({ key, expiresAt: value.expiresAt });
    } catch {
      storage.removeItem(key);
    }
  }

  cachedEntries
    .sort((left, right) => left.expiresAt - right.expiresAt)
    .slice(
      0,
      Math.max(0, cachedEntries.length - MAX_PERSISTENT_CACHE_ENTRIES)
    )
    .forEach(({ key }) => storage.removeItem(key));
}

export class TenraiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TenraiApiError";
  }
}

export function configureTenraiRequestGate(
  gate: (() => Promise<void>) | undefined
) {
  externalRequestGate = gate;
}

async function readBoundedJson<T>(response: Response): Promise<T> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new TenraiApiError("Tenrai returned too much data.", 502);
  }

  if (!response.body) {
    throw new TenraiApiError("Tenrai returned an empty response.", 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let json = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new TenraiApiError("Tenrai returned too much data.", 502);
    }
    json += decoder.decode(value, { stream: true });
  }
  json += decoder.decode();

  try {
    return JSON.parse(json) as T;
  } catch {
    throw new TenraiApiError("Tenrai returned invalid data.", 502);
  }
}

function waitForAbortableDelay(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  signal?.throwIfAborted();

  return new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException("The request was aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForRateLimit(signal?: AbortSignal) {
  signal?.throwIfAborted();
  await externalRequestGate?.();
  signal?.throwIfAborted();
  const waitTime = Math.max(
    0,
    MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestStartedAt)
  );

  await waitForAbortableDelay(waitTime, signal);

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
  responseCache.delete(path);
  trimMemoryCache();
  responseCache.set(path, cachedValue);

  try {
    const storage = getBrowserStorage(storageTarget);
    storage?.setItem(getStorageKey(path), JSON.stringify(cachedValue));
    if (storage) trimPersistentCache(storage);
  } catch {
    // Memory caching still works when browser storage is unavailable or full.
  }
}

export async function tenraiGet<T>(
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

  const waitForRequestSlot = () => waitForRateLimit(options.signal);
  requestQueue = requestQueue.then(waitForRequestSlot, waitForRequestSlot);
  await requestQueue;
  options.signal?.throwIfAborted();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new TenraiApiError(
      response.status === 429
        ? "Tenrai is receiving too many requests. Try again in a moment."
        : "Tenrai could not load this anime data.",
      response.status
    );
  }

  const data = await readBoundedJson<T>(response);
  writeCachedResponse(
    path,
    data,
    options.cacheMs ?? 5 * 60 * 1000,
    cacheStorage
  );

  return data;
}
