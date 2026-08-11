import { ApiError } from "./http.js";

type JsonRecord = Record<string, unknown>;
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_AVATAR_IDS = new Set([
  "male-01",
  "male-02",
  "male-03",
  "male-04",
  "male-05",
  "female-01",
  "female-02",
  "female-03",
  "female-04",
  "female-05"
]);
const PROFILE_BANNER_IDS = new Set([
  "banner-01",
  "banner-02",
  "banner-03",
  "banner-04",
  "banner-05"
]);

export function accountRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Invalid request.");
  }
  return value as JsonRecord;
}

function text(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new ApiError(400, `${field} is invalid.`);
  }
  return value;
}

export function accountEmail(value: unknown) {
  const result = text(value, "Email", 3, 320).trim().toLowerCase();
  if (!EMAIL_PATTERN.test(result)) {
    throw new ApiError(400, "Email is invalid.");
  }
  return result;
}

export function accountUsername(value: unknown) {
  const result = text(value, "Username", 3, 24).trim();
  if (!USERNAME_PATTERN.test(result)) {
    throw new ApiError(
      400,
      "Username must be 3-24 letters, numbers, or underscores."
    );
  }
  return result;
}

export function accountAvatarId(value: unknown) {
  if (typeof value !== "string" || !PROFILE_AVATAR_IDS.has(value)) {
    throw new ApiError(400, "Profile picture is invalid.");
  }
  return value;
}

export function accountBannerId(value: unknown) {
  if (typeof value !== "string" || !PROFILE_BANNER_IDS.has(value)) {
    throw new ApiError(400, "Profile banner is invalid.");
  }
  return value;
}

export function accountScoreStep(value: unknown): 0.5 | 1 {
  if (value !== 0.5 && value !== 1) {
    throw new ApiError(400, "Score increment must be 0.5 or 1.");
  }
  return value;
}

export function accountDeletionConfirmation(value: unknown) {
  if (value !== "DELETE") {
    throw new ApiError(400, "Enter DELETE to confirm account deletion.");
  }
  return value;
}

export function accountPassword(value: unknown, field = "Password") {
  const result = text(value, field, 12, 128);
  if (
    !/[a-z]/.test(result) ||
    !/[A-Z]/.test(result) ||
    !/[0-9]/.test(result)
  ) {
    throw new ApiError(
      400,
      `${field} must contain uppercase, lowercase, and a number.`
    );
  }
  return result;
}

export function loginIdentifier(value: unknown) {
  return text(value, "Email or username", 3, 320).trim().toLowerCase();
}

export function loginPassword(value: unknown) {
  return text(value, "Password", 1, 128);
}

export function verificationCode(value: unknown, field: string) {
  const result = text(value, field, 6, 12).trim();
  if (!/^[0-9]+$/.test(result)) {
    throw new ApiError(400, `${field} is invalid.`);
  }
  return result;
}
