function isUnsafeCodePoint(codePoint: number) {
  return (
    codePoint <= 8 ||
    codePoint === 11 ||
    codePoint === 12 ||
    (codePoint >= 14 && codePoint <= 31) ||
    codePoint === 127 ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

export function hasUnsafeControlCharacters(value: string) {
  for (const character of value) {
    if (isUnsafeCodePoint(character.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

export function isBoundedText(value: string, maxLength: number) {
  return (
    value.length <= maxLength && !hasUnsafeControlCharacters(value)
  );
}

export function safeExternalUrl(value: unknown) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function safeAllowedUrl(value: unknown, allowedHosts: ReadonlySet<string>) {
  const safe = safeExternalUrl(value);
  if (!safe) return undefined;
  return allowedHosts.has(new URL(safe).hostname.toLowerCase())
    ? safe
    : undefined;
}

const MAL_HOSTS = new Set(["myanimelist.net", "www.myanimelist.net"]);
const ANIME_IMAGE_HOSTS = new Set([
  "cdn.myanimelist.net",
  "img.youtube.com",
  "i.ytimg.com"
]);
const TRAILER_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be"
]);

function safeMyAnimeListPath(value: unknown, pathPattern: RegExp) {
  const safe = safeAllowedUrl(value, MAL_HOSTS);
  if (!safe) return undefined;
  return pathPattern.test(new URL(safe).pathname) ? safe : undefined;
}

export const safeMyAnimeListAnimeUrl = (value: unknown) =>
  safeMyAnimeListPath(value, /^\/anime\/\d+(?:\/|$)/);

export const safeMyAnimeListNewsUrl = (value: unknown) =>
  safeMyAnimeListPath(value, /^\/news\/\d+(?:\/|$)/);

export const safeAnimeImageUrl = (value: unknown) =>
  safeAllowedUrl(value, ANIME_IMAGE_HOSTS);

export const safeTrailerUrl = (value: unknown) =>
  safeAllowedUrl(value, TRAILER_HOSTS);

export function truncateExternalText(value: string, maxLength: number) {
  const withoutUnsafeControls = [...value]
    .filter(
      (character) => !isUnsafeCodePoint(character.codePointAt(0) ?? 0)
    )
    .join("");
  if (withoutUnsafeControls.length <= maxLength) {
    return withoutUnsafeControls;
  }
  return `${withoutUnsafeControls.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function escapePostgresLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
