// F2/R7: Cloudinary storage behind CLOUDINARY_URL. The SDK parses the env var
// at import; unset or failed uploads ⇒ callers fall back to local ./uploads.
import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfigured(): boolean {
  return !!process.env.CLOUDINARY_URL && !!cloudinary.config().cloud_name;
}

export interface CdnUpload {
  /** delivery URL (f_auto,q_auto) shown in the app */
  url: string;
  /** the untransformed stored original — the traceability anchor for every derived URL */
  originalUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  /** EXIF DateTimeOriginal, when the file carries a believable one */
  capturedAt: Date | null;
}

/**
 * EXIF "YYYY:MM:DD HH:MM:SS" → Date. Camera clocks carry no zone, so it is read as UTC
 * (ponytail: off by the photographer's UTC offset — fine for day-level timelines).
 * Rejects zeroed/pre-1990/future values that unset camera clocks produce.
 */
export function parseExifDate(v: unknown): Date | null {
  const m = typeof v === "string" ? v.match(/^(\d{4}):(\d\d):(\d\d)[ T](\d\d):(\d\d):(\d\d)/) : null;
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  return d.getUTCFullYear() >= 1990 && +d <= Date.now() + 24 * 3600 * 1000 ? d : null;
}

/** Upload a buffer (image or video). Null when unconfigured/failing — callers store locally instead. */
export async function uploadToCloudinary(file: Buffer, ext: string): Promise<CdnUpload | null> {
  if (!cloudinaryConfigured()) return null;
  try {
    const res = await new Promise<{
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
      image_metadata?: Record<string, unknown>;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto", folder: "impactlens", format: ext || undefined, image_metadata: true }, (err, result) =>
          err || !result ? reject(err ?? new Error("empty Cloudinary upload")) : resolve(result)
        )
        .end(file);
    });
    const exif = res.image_metadata;
    return {
      url: res.secure_url.replace("/upload/", "/upload/f_auto,q_auto/"),
      originalUrl: res.secure_url,
      publicId: res.public_id,
      width: res.width ?? null,
      height: res.height ?? null,
      capturedAt: parseExifDate(exif?.DateTimeOriginal) ?? parseExifDate(exif?.CreateDate),
    };
  } catch {
    return null; // best-effort: caller stores locally instead
  }
}

/** Remove a stored asset (best-effort). resource_type must match the original upload. */
export async function destroyCloudinary(publicId: string, type: "image" | "video"): Promise<void> {
  if (!cloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: type }).catch(() => undefined);
}
