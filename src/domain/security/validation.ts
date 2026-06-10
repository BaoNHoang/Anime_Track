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
