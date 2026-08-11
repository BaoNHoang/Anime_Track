const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export type ProfileMediaKind = "avatar" | "banner";

const MEDIA_SPECS = {
  avatar: { width: 512, height: 512, maxOutputBytes: 400 * 1024 },
  banner: { width: 1600, height: 500, maxOutputBytes: 1024 * 1024 }
} as const;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Image conversion failed.")),
      "image/webp",
      quality
    );
  });
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function sanitizeProfileImage(
  file: File,
  kind: ProfileMediaKind
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new Error("Image files must be 8 MB or smaller.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("The image is damaged or uses an unsupported format.");
  }
  try {
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width * bitmap.height > 20_000_000
    ) {
      throw new Error("The image dimensions are too large.");
    }

    const spec = MEDIA_SPECS[kind];
    const canvas = document.createElement("canvas");
    canvas.width = spec.width;
    canvas.height = spec.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image conversion is unavailable.");

    context.fillStyle = "#11131c";
    context.fillRect(0, 0, spec.width, spec.height);
    const scale = Math.max(spec.width / bitmap.width, spec.height / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (spec.width - width) / 2,
      (spec.height - height) / 2,
      width,
      height
    );

    const output = await canvasBlob(canvas, kind === "avatar" ? 0.86 : 0.84);
    if (output.size > spec.maxOutputBytes) {
      throw new Error("The processed image is still too large. Try a simpler image.");
    }
    return blobDataUrl(output);
  } finally {
    bitmap.close();
  }
}
