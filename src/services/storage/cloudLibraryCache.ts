import { parseLibraryImport } from "../../domain/tracker/import";
import type { TrackedAnime } from "../../domain/tracker/types";

const DATABASE_NAME = "banime-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "cloud-libraries";
const pendingWrites = new Map<string, Promise<void>>();

interface CachedLibrary {
  ownerId: string;
  savedAt: string;
  items: TrackedAnime[];
}

function openDatabase(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "ownerId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
    request.onblocked = () => resolve(undefined);
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, finish: (value: T) => void) => void,
  fallback: T
): Promise<T> {
  const database = await openDatabase();
  if (!database) return fallback;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(value);
    };

    try {
      const transaction = database.transaction(STORE_NAME, mode);
      transaction.onerror = () => finish(fallback);
      transaction.onabort = () => finish(fallback);
      operation(transaction.objectStore(STORE_NAME), finish);
    } catch {
      finish(fallback);
    }
  });
}

function enqueueWrite(ownerId: string, operation: () => Promise<void>) {
  const previous = pendingWrites.get(ownerId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  pendingWrites.set(ownerId, next);
  void next.finally(() => {
    if (pendingWrites.get(ownerId) === next) pendingWrites.delete(ownerId);
  });
  return next;
}

export const cloudLibraryCache = {
  async get(ownerId: string): Promise<TrackedAnime[] | undefined> {
    return runTransaction<TrackedAnime[] | undefined>(
      "readonly",
      (store, finish) => {
        const request = store.get(ownerId);
        request.onsuccess = () => {
          const cached = request.result as CachedLibrary | undefined;
          if (!cached || !Array.isArray(cached.items)) {
            finish(undefined);
            return;
          }
          try {
            finish(parseLibraryImport(cached.items));
          } catch {
            finish(undefined);
          }
        };
        request.onerror = () => finish(undefined);
      },
      undefined
    );
  },

  async save(ownerId: string, items: TrackedAnime[]): Promise<void> {
    await enqueueWrite(ownerId, () =>
      runTransaction<void>(
        "readwrite",
        (store, finish) => {
          const request = store.put({
            ownerId,
            savedAt: new Date().toISOString(),
            items
          } satisfies CachedLibrary);
          request.onsuccess = () => finish(undefined);
          request.onerror = () => finish(undefined);
        },
        undefined
      )
    );
  },

  async clear(ownerId: string): Promise<void> {
    await enqueueWrite(ownerId, () =>
      runTransaction<void>(
        "readwrite",
        (store, finish) => {
          const request = store.delete(ownerId);
          request.onsuccess = () => finish(undefined);
          request.onerror = () => finish(undefined);
        },
        undefined
      )
    );
  }
};
