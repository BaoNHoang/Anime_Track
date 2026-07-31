import type { Anime } from "../anime/types.js";
import {
  isBoundedText,
  safeExternalUrl
} from "../security/validation.js";
import { mergeTrackedAnime } from "./merge.js";
import {
  TRACKING_STATUSES,
  type TrackedAnime,
  type TrackingStatus
} from "./types.js";

type JsonRecord = Record<string, unknown>;
const MAX_LIBRARY_ITEMS = 5000;
const MAX_TITLE_LENGTH = 500;
const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_SYNOPSIS_LENGTH = 20_000;
const MAX_NOTES_LENGTH = 2000;
const MAX_LIST_ITEMS = 50;

export class LibraryImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LibraryImportError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  value: unknown,
  field: string,
  maxLength = MAX_SHORT_TEXT_LENGTH
) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !isBoundedText(value, maxLength)) {
    throw new LibraryImportError(`${field} must be text.`);
  }
  return value;
}

function optionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new LibraryImportError(`${field} must be a number.`);
  }
  return value;
}

function optionalBoundedNumber(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  integer = false
) {
  const parsed = optionalNumber(value, field);
  if (parsed === undefined) return undefined;
  if (
    parsed < minimum ||
    parsed > maximum ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw new LibraryImportError(`${field} is outside the allowed range.`);
  }
  return parsed;
}

function stringArray(value: unknown, field: string) {
  if (
    !Array.isArray(value) ||
    value.length > MAX_LIST_ITEMS ||
    value.some(
      (entry) =>
        typeof entry !== "string" ||
        !isBoundedText(entry, MAX_SHORT_TEXT_LENGTH)
    )
  ) {
    throw new LibraryImportError(
      `${field} must be a bounded list of text values.`
    );
  }
  return value;
}

function requiredString(
  value: unknown,
  field: string,
  allowEmpty = false,
  maxLength = MAX_SHORT_TEXT_LENGTH
) {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.trim().length === 0) ||
    !isBoundedText(value, maxLength)
  ) {
    throw new LibraryImportError(`${field} is required.`);
  }
  return value;
}

function externalUrl(
  value: unknown,
  field: string,
  allowEmpty = false
) {
  if (allowEmpty && value === "") return "";
  const url = safeExternalUrl(value);
  if (!url) {
    throw new LibraryImportError(`${field} must be a valid HTTPS URL.`);
  }
  return url;
}

function parseAnime(value: unknown, index: number): Anime {
  if (!isRecord(value)) {
    throw new LibraryImportError(`Item ${index + 1} has no anime record.`);
  }
  if (
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    Number(value.id) > 10_000_000
  ) {
    throw new LibraryImportError(
      `Item ${index + 1} has an invalid anime ID.`
    );
  }

  const broadcast = value.broadcast;
  if (
    broadcast !== undefined &&
    broadcast !== null &&
    !isRecord(broadcast)
  ) {
    throw new LibraryImportError(
      `Item ${index + 1} has invalid broadcast data.`
    );
  }

  return {
    id: Number(value.id),
    title: requiredString(
      value.title,
      `Item ${index + 1} anime title`,
      false,
      MAX_TITLE_LENGTH
    ),
    titleEnglish: optionalString(
      value.titleEnglish,
      `Item ${index + 1} English title`,
      MAX_TITLE_LENGTH
    ),
    imageUrl: externalUrl(
      value.imageUrl,
      `Item ${index + 1} image URL`,
      true
    ),
    largeImageUrl: externalUrl(
      value.largeImageUrl,
      `Item ${index + 1} large image URL`,
      true
    ),
    synopsis: requiredString(
      value.synopsis,
      `Item ${index + 1} synopsis`,
      true,
      MAX_SYNOPSIS_LENGTH
    ),
    score: optionalBoundedNumber(
      value.score,
      `Item ${index + 1} score`,
      0,
      10
    ),
    rank: optionalBoundedNumber(
      value.rank,
      `Item ${index + 1} rank`,
      1,
      10_000_000,
      true
    ),
    popularity: optionalBoundedNumber(
      value.popularity,
      `Item ${index + 1} popularity`,
      1,
      10_000_000,
      true
    ),
    episodes: optionalBoundedNumber(
      value.episodes,
      `Item ${index + 1} episode count`,
      0,
      100_000,
      true
    ),
    status: requiredString(
      value.status,
      `Item ${index + 1} anime status`
    ),
    type: requiredString(value.type, `Item ${index + 1} anime type`),
    rating: optionalString(value.rating, `Item ${index + 1} rating`),
    duration: optionalString(
      value.duration,
      `Item ${index + 1} duration`
    ),
    year: optionalBoundedNumber(
      value.year,
      `Item ${index + 1} year`,
      1900,
      2100,
      true
    ),
    season: optionalString(value.season, `Item ${index + 1} season`),
    broadcast: isRecord(broadcast)
      ? {
          day: optionalString(
            broadcast.day,
            `Item ${index + 1} broadcast day`
          ),
          time: optionalString(
            broadcast.time,
            `Item ${index + 1} broadcast time`
          ),
          timezone: optionalString(
            broadcast.timezone,
            `Item ${index + 1} broadcast timezone`
          ),
          label: optionalString(
            broadcast.label,
            `Item ${index + 1} broadcast label`
          )
        }
      : undefined,
    genres: stringArray(value.genres, `Item ${index + 1} genres`),
    studios: stringArray(value.studios, `Item ${index + 1} studios`),
    trailerUrl:
      value.trailerUrl === undefined || value.trailerUrl === null
        ? undefined
        : externalUrl(
            value.trailerUrl,
            `Item ${index + 1} trailer URL`
          ),
    url: externalUrl(value.url, `Item ${index + 1} anime URL`, true)
  };
}

function parseTrackedAnime(value: unknown, index: number): TrackedAnime {
  if (!isRecord(value)) {
    throw new LibraryImportError(`Item ${index + 1} must be an object.`);
  }
  if (
    typeof value.status !== "string" ||
    !TRACKING_STATUSES.includes(value.status as TrackingStatus)
  ) {
    throw new LibraryImportError(
      `Item ${index + 1} has an invalid tracking status.`
    );
  }
  if (
    typeof value.progress !== "number" ||
    !Number.isFinite(value.progress) ||
    !Number.isInteger(value.progress) ||
    value.progress < 0 ||
    value.progress > 100_000
  ) {
    throw new LibraryImportError(
      `Item ${index + 1} has invalid episode progress.`
    );
  }
  const userScore = optionalNumber(
    value.userScore,
    `Item ${index + 1} user score`
  );
  if (userScore !== undefined && (userScore < 0 || userScore > 10)) {
    throw new LibraryImportError(
      `Item ${index + 1} user score must be between 0 and 10.`
    );
  }
  const addedAt = requiredString(
    value.addedAt,
    `Item ${index + 1} added timestamp`
  );
  const updatedAt = requiredString(
    value.updatedAt,
    `Item ${index + 1} updated timestamp`
  );
  if (Number.isNaN(Date.parse(addedAt)) || Number.isNaN(Date.parse(updatedAt))) {
    throw new LibraryImportError(
      `Item ${index + 1} has an invalid timestamp.`
    );
  }

  const anime = parseAnime(value.anime, index);
  return {
    anime,
    status: value.status as TrackingStatus,
    progress: Math.min(
      value.progress,
      anime.episodes ?? Number.MAX_SAFE_INTEGER
    ),
    userScore,
    notes: requiredString(
      value.notes,
      `Item ${index + 1} notes`,
      true,
      MAX_NOTES_LENGTH
    ),
    addedAt,
    updatedAt
  };
}

export function parseLibraryImport(value: unknown): TrackedAnime[] {
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : undefined;

  if (!source) {
    throw new LibraryImportError(
      "This file must be a Banime export or an array of tracked anime."
    );
  }
  if (!source.length) {
    throw new LibraryImportError("This library file contains no anime.");
  }
  if (source.length > MAX_LIBRARY_ITEMS) {
    throw new LibraryImportError(
      `A library import cannot contain more than ${MAX_LIBRARY_ITEMS} items.`
    );
  }

  return mergeTrackedAnime(
    [],
    source.map((item, index) => parseTrackedAnime(item, index))
  );
}
