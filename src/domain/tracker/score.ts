export const MIN_USER_SCORE = 1;
export const MAX_USER_SCORE = 10;
export type ScoreStep = 0.5 | 1;

export function normalizeUserScore(
  value: number | undefined,
  step: ScoreStep = 0.5
) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const clamped = Math.min(
    MAX_USER_SCORE,
    Math.max(MIN_USER_SCORE, value)
  );
  return Math.round(clamped / step) * step;
}
