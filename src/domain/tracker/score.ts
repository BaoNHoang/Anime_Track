export const MIN_USER_SCORE = 1;
export const MAX_USER_SCORE = 10;
export type ScoreStep = 0.5 | 1;
export type ScoreScale = 10 | 100;

export function displayUserScore(value: number, scale: ScoreScale = 10) {
  return Number((value * (scale / MAX_USER_SCORE)).toFixed(scale === 100 ? 1 : 2));
}

export function normalizeStoredUserScore(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.round(Math.min(MAX_USER_SCORE, Math.max(0.1, value)) * 20) / 20;
}

export function normalizeUserScore(
  value: number | undefined,
  step: ScoreStep = 0.5,
  scale: ScoreScale = 10
) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const clamped = Math.min(
    scale,
    Math.max(MIN_USER_SCORE, value)
  );
  const displayScore = Math.round(clamped / step) * step;
  return normalizeStoredUserScore(displayScore / (scale / MAX_USER_SCORE));
}
