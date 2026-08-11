import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { sanitizeProfileMedia } from "../../api/_lib/profileMedia";

function dataUrl(buffer: Buffer, type = "png") {
  return `data:image/${type};base64,${buffer.toString("base64")}`;
}

describe("profile media sanitization", () => {
  it("decodes, resizes, strips metadata, and re-encodes an avatar", async () => {
    const source = await sharp({
      create: {
        width: 900,
        height: 700,
        channels: 3,
        background: "#ef5f6b"
      }
    })
      .png()
      .withMetadata({ exif: { IFD0: { Artist: "private metadata" } } })
      .toBuffer();

    const result = await sanitizeProfileMedia(dataUrl(source), "avatar");
    const metadata = await sharp(result).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(metadata.exif).toBeUndefined();
    expect(result.length).toBeLessThanOrEqual(400 * 1024);
  });

  it("normalizes banners to the fixed safe dimensions", async () => {
    const source = await sharp({
      create: {
        width: 2000,
        height: 800,
        channels: 3,
        background: "#1aa8c7"
      }
    }).jpeg().toBuffer();

    const result = await sanitizeProfileMedia(dataUrl(source, "jpeg"), "banner");
    const metadata = await sharp(result).metadata();

    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(500);
    expect(metadata.format).toBe("webp");
  });

  it("rejects unsupported, malformed, and oversized payloads", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    await expect(
      sanitizeProfileMedia(dataUrl(svg, "svg+xml"), "avatar")
    ).rejects.toThrow("invalid");
    await expect(
      sanitizeProfileMedia("data:image/png;base64,not-valid***", "avatar")
    ).rejects.toThrow("invalid");
    await expect(
      sanitizeProfileMedia(`data:image/png;base64,${"A".repeat(2_100_001)}`, "avatar")
    ).rejects.toThrow("too large");
  });
});
