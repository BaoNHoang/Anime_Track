import { safeAnimeImageUrl, truncateExternalText } from "../security/validation";

export const FAVORITE_KINDS = [
  "anime",
  "studios",
  "directors",
  "characters"
] as const;

export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export interface FavoriteEntry {
  id: number;
  name: string;
  imageUrl?: string;
}

export type ProfileFavorites = Record<FavoriteKind, FavoriteEntry[]>;

export const MAX_FAVORITES_PER_KIND = 20;

export function emptyProfileFavorites(): ProfileFavorites {
  return { anime: [], studios: [], directors: [], characters: [] };
}

function normalizeEntries(value: unknown): FavoriteEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const entries: FavoriteEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (
      !Number.isSafeInteger(record.id) ||
      (record.id as number) <= 0 ||
      typeof record.name !== "string" ||
      !record.name.trim()
    ) continue;
    const id = record.id as number;
    if (seen.has(id)) continue;
    seen.add(id);
    const imageUrl = safeAnimeImageUrl(record.imageUrl);
    entries.push({
      id,
      name: truncateExternalText(record.name.trim(), 200),
      ...(imageUrl ? { imageUrl } : {})
    });
    if (entries.length >= MAX_FAVORITES_PER_KIND) break;
  }
  return entries;
}

export function normalizeProfileFavorites(value: unknown): ProfileFavorites {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    anime: normalizeEntries(record.anime),
    studios: normalizeEntries(record.studios),
    directors: normalizeEntries(record.directors),
    characters: normalizeEntries(record.characters)
  };
}
