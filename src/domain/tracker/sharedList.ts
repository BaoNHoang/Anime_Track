import type { Anime } from "../anime/types";
import { isBoundedText, safeAnimeImageUrl } from "../security/validation";

const MAX_LINK_LENGTH = 16000;
export const MAX_SHARED_TITLES = 100;

export interface SharedList {
  version: 1;
  name: string;
  titles: Array<{ id: number; title: string; imageUrl: string }>;
}

function validList(value: unknown): value is SharedList {
  if (!value || typeof value !== "object") return false;
  const list = value as SharedList;
  const ids = new Set<number>();
  return list.version === 1 && typeof list.name === "string" && Boolean(list.name.trim()) &&
    isBoundedText(list.name, 80) && Array.isArray(list.titles) &&
    list.titles.length > 0 && list.titles.length <= MAX_SHARED_TITLES &&
    list.titles.every((title) => {
      if (!title || typeof title !== "object" || !Number.isInteger(title.id) ||
          title.id < 1 || title.id > 10_000_000 || ids.has(title.id) ||
          typeof title.title !== "string" || !title.title.trim() || !isBoundedText(title.title, 500) ||
          typeof title.imageUrl !== "string" ||
          (title.imageUrl !== "" && !safeAnimeImageUrl(title.imageUrl))) return false;
      ids.add(title.id);
      return true;
    });
}

export function serializeSharedList(name: string, anime: Anime[]) {
  const list: SharedList = {
    version: 1,
    name: name.trim(),
    titles: anime.map((title) => ({
      id: title.id,
      title: title.titleEnglish || title.title,
      imageUrl: safeAnimeImageUrl(title.imageUrl) ?? ""
    }))
  };
  if (!validList(list)) throw new Error(`Choose a named list with 1–${MAX_SHARED_TITLES} titles to share.`);
  const bytes = new TextEncoder().encode(JSON.stringify(list));
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (encoded.length > MAX_LINK_LENGTH) throw new Error("This list is too large for a share link. Share a smaller list.");
  return encoded;
}

export function parseSharedList(hash: string): SharedList | undefined {
  const encoded = hash.replace(/^#/, "");
  if (!encoded || encoded.length > MAX_LINK_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) return undefined;
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return validList(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function sharedTitleAnime(title: SharedList["titles"][number]): Anime {
  return {
    ...title,
    largeImageUrl: title.imageUrl,
    synopsis: "",
    status: "Shared recommendation",
    type: "Anime",
    genres: [],
    studios: [],
    url: `https://myanimelist.net/anime/${title.id}`
  };
}
