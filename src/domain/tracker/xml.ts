import { truncateExternalText } from "../security/validation";
import { parseLibraryImport, LibraryImportError } from "./import";
import type { TrackedAnime, TrackingStatus } from "./types";

const MAX_XML_CHARACTERS = 5 * 1024 * 1024;
const MAL_URL_BASE = "https://myanimelist.net/anime/";

function rejectUnsafeXml(xml: string) {
  if (xml.length > MAX_XML_CHARACTERS) {
    throw new LibraryImportError("The selected XML file is larger than 5 MB.");
  }
  if (/<!doctype/i.test(xml) || /<!entity/i.test(xml)) {
    throw new LibraryImportError(
      "MyAnimeList XML imports cannot include DTD or entity declarations."
    );
  }
}

function xmlBlocks(source: string, name: string) {
  return [
    ...source.matchAll(
      new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi")
    )
  ].map((match) => match[1]);
}

function firstXmlBlock(source: string, name: string) {
  return xmlBlocks(source, name)[0];
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
      const normalized = String(entity).toLowerCase();
      if (normalized === "amp") return "&";
      if (normalized === "lt") return "<";
      if (normalized === "gt") return ">";
      if (normalized === "quot") return '"';
      if (normalized === "apos") return "'";
      const codePoint = normalized.startsWith("#x")
        ? Number.parseInt(normalized.slice(2), 16)
        : Number.parseInt(normalized.slice(1), 10);
      if (!Number.isFinite(codePoint)) return "";
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return "";
      }
    });
}

function xmlText(source: string, name: string) {
  const value = firstXmlBlock(source, name);
  return value === undefined ? undefined : decodeXmlEntities(value).trim();
}

function xmlNumber(source: string, name: string) {
  const value = xmlText(source, name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function xmlInteger(source: string, name: string) {
  const value = xmlNumber(source, name);
  return value === undefined ? undefined : Math.trunc(value);
}

function mapMalStatus(value: string | undefined): TrackingStatus {
  const normalized = value?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  if (normalized === "watching") return "watching";
  if (normalized === "completed") return "completed";
  if (normalized === "on_hold") return "on_hold";
  if (normalized === "dropped") return "dropped";
  if (normalized === "plan_to_watch" || normalized === "plantowatch") {
    return "plan_to_watch";
  }
  return "plan_to_watch";
}

function parseMalDate(value: string | undefined) {
  if (!value || value === "0000-00-00") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function parseMalUnixTimestamp(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000).toISOString();
}

function parseMalNotes(animeBlock: string) {
  const comments = xmlText(animeBlock, "my_comments") ?? "";
  const tags = xmlText(animeBlock, "my_tags") ?? "";
  const notes = [comments, tags ? `Tags: ${tags}` : ""]
    .filter(Boolean)
    .join("\n\n");
  return truncateExternalText(notes, 2000);
}

export function parseMyAnimeListXml(xml: string): TrackedAnime[] {
  rejectUnsafeXml(xml);
  if (!/<myanimelist\b/i.test(xml)) {
    throw new LibraryImportError(
      "This file must be a MyAnimeList XML export."
    );
  }

  const animeBlocks = xmlBlocks(xml, "anime");
  if (!animeBlocks.length) {
    throw new LibraryImportError("This MyAnimeList XML file contains no anime.");
  }

  const now = new Date().toISOString();
  return parseLibraryImport({
    app: "MyAnimeList",
    items: animeBlocks.map((animeBlock) => {
      const id = xmlInteger(animeBlock, "series_animedb_id");
      const title = xmlText(animeBlock, "series_title") ?? "";
      const seriesEpisodes = xmlInteger(animeBlock, "series_episodes");
      const episodes =
        seriesEpisodes && seriesEpisodes > 0 ? seriesEpisodes : undefined;
      const updatedAt =
        parseMalUnixTimestamp(xmlText(animeBlock, "my_last_updated")) ??
        parseMalDate(xmlText(animeBlock, "my_finish_date")) ??
        parseMalDate(xmlText(animeBlock, "my_start_date")) ??
        now;
      const addedAt =
        parseMalDate(xmlText(animeBlock, "my_start_date")) ?? updatedAt;
      const userScore = xmlNumber(animeBlock, "my_score");

      return {
        status: mapMalStatus(xmlText(animeBlock, "my_status")),
        progress: xmlInteger(animeBlock, "my_watched_episodes") ?? 0,
        userScore: userScore && userScore > 0 ? userScore : undefined,
        notes: parseMalNotes(animeBlock),
        addedAt,
        updatedAt,
        anime: {
          id,
          title,
          imageUrl: "",
          largeImageUrl: "",
          synopsis:
            "Imported from MyAnimeList. Banime will try to fill current catalog details from Jikan before saving.",
          episodes,
          status: "Imported from MyAnimeList",
          type: xmlText(animeBlock, "series_type") ?? "Anime",
          genres: [],
          studios: [],
          url: id ? `${MAL_URL_BASE}${id}` : ""
        }
      };
    })
  });
}
