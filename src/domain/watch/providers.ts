import type { Anime } from "../anime/types";
import { safeExternalUrl } from "../security/validation";

export interface WatchProvider {
  id: string;
  label: string;
  searchUrlTemplate: string;
  note: string;
}

export const WATCH_PROVIDERS = [
  {
    id: "anikoto",
    label: "Anikoto",
    searchUrlTemplate: "https://anikototv.to/filter?keyword={query}",
    note: "Searches Anikoto by title. Exact /watch/.../ep links need Anikoto's internal slug or ID."
  },
  {
    id: "justwatch",
    label: "JustWatch",
    searchUrlTemplate: "https://www.justwatch.com/us/search?q={query}",
    note: "Searches legal streaming availability across services."
  },
  {
    id: "crunchyroll",
    label: "Crunchyroll",
    searchUrlTemplate: "https://www.crunchyroll.com/search?q={query}",
    note: "Searches Crunchyroll directly."
  }
] as const satisfies readonly WatchProvider[];

export const DEFAULT_WATCH_PROVIDER_ID = WATCH_PROVIDERS[0].id;

export type WatchProviderId = (typeof WATCH_PROVIDERS)[number]["id"];

export function getWatchProvider(providerId: string | undefined) {
  return (
    WATCH_PROVIDERS.find((provider) => provider.id === providerId) ??
    WATCH_PROVIDERS[0]
  );
}

export function getWatchTitle(anime: Anime) {
  return anime.titleEnglish || anime.title;
}

export function buildWatchSearchUrl(
  providerId: string | undefined,
  anime: Anime
) {
  const provider = getWatchProvider(providerId);
  const query = encodeURIComponent(getWatchTitle(anime).trim());
  const url = provider.searchUrlTemplate.replace("{query}", query);
  return safeExternalUrl(url) ?? "";
}
