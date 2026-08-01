export const MIN_USER_SCORE = 1;
export const MAX_USER_SCORE = 10;

export function normalizeUserScore(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(MAX_USER_SCORE, Math.max(MIN_USER_SCORE, value));
}
