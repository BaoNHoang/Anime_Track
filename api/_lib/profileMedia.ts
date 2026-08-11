import sharp from "sharp";
import { ApiError } from "./http.js";

export type ProfileMediaKind = "avatar" | "banner";

const MEDIA_SPECS = {
  avatar: { width: 512, height: 512, maxBytes: 400 * 1024 },
  banner: { width: 1600, height: 500, maxBytes: 1024 * 1024 }
} as const;
const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_SOURCE_BYTES = 1_500_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

function hasAllowedMagic(buffer: Buffer) {
  const jpeg = buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

export function profileMediaKind(value: unknown): ProfileMediaKind {
  if (value !== "avatar" && value !== "banner") {
    throw new ApiError(400, "Profile media type is invalid.");
  }
  return value;
}

export async function sanitizeProfileMedia(
  value: unknown,
  kind: ProfileMediaKind
) {
  if (typeof value !== "string" || value.length > 2_100_000) {
    throw new ApiError(413, "Profile image is too large.");
  }
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) throw new ApiError(400, "Profile image is invalid.");

  const buffer = Buffer.from(match[2], "base64");
  if (
    buffer.length < 16 ||
    buffer.length > MAX_SOURCE_BYTES ||
    buffer.toString("base64") !== match[2] ||
    !hasAllowedMagic(buffer)
  ) {
    throw new ApiError(400, "Profile image is invalid.");
  }

  try {
    const image = sharp(buffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: 20_000_000
    });
    const metadata = await image.metadata();
    if (
      !metadata.format ||
      !ALLOWED_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new ApiError(400, "Profile image is invalid.");
    }

    const spec = MEDIA_SPECS[kind];
    const output = await image
      .rotate()
      .resize(spec.width, spec.height, {
        fit: "cover",
        position: "attention"
      })
      .flatten({ background: "#11131c" })
      .webp({ quality: kind === "avatar" ? 86 : 84, effort: 5 })
      .toBuffer();
    if (output.length > spec.maxBytes) {
      throw new ApiError(413, "Processed profile image is too large.");
    }
    return output;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Profile image could not be decoded safely.");
  }
}
