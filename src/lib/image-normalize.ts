/**
 * Client-side image normalization for anything the user picks from their
 * device, as opposed to shoots with our own camera component.
 *
 * Two problems this solves, both of which used to end as a failed report:
 *
 *  1. **HEIC.** iPhones hand back HEIC from the photo library and from the
 *     native camera input. The analysis model cannot read HEIC at all, and the
 *     resulting HTTP 400 is not retryable — so the pipeline would burn every
 *     attempt on an error no retry could fix. Safari decodes HEIC natively, so
 *     drawing it to a canvas and re-encoding is all it takes.
 *  2. **Oversized originals.** A 4K library photo is megabytes of upload and
 *     storage for detail the model discards on the way in.
 *
 * Doing this in the browser means storage only ever holds formats we can read.
 */

/** Matches the analysis model's maximum useful image edge. */
const MAX_EDGE = 2560;
const JPEG_QUALITY = 0.92;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // createImageBitmap handles HEIC wherever the platform decoder does, and
  // avoids the object-URL dance entirely.
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode this image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Re-encode `file` as a JPEG no larger than 2560px on its long edge.
 *
 * Returns the original file untouched if it is already a reasonably sized
 * JPEG, and — deliberately — also if anything goes wrong. A normalization
 * failure must not block the upload: the server sniffs the real format anyway,
 * and a photo that reaches us in an odd format is a better outcome than a user
 * stuck on the capture screen unable to continue.
 */
export async function normalizeToJpeg(file: File): Promise<File> {
  const alreadyFine = file.type === "image/jpeg" && file.size < 2 * 1024 * 1024;
  if (alreadyFine) return file;

  try {
    const source = await decode(file);
    const { width, height } = source;
    if (!width || !height) return file;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, w, h);
    if ("close" in source && typeof source.close === "function") source.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
