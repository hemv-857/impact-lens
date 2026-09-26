// F2/R7: Cloudinary storage behind CLOUDINARY_URL. The SDK parses the env var
// at import; unset or failed uploads ⇒ callers fall back to local public/uploads.
import { v2 as cloudinary } from "cloudinary";

export function cloudinaryConfigured(): boolean {
  return !!process.env.CLOUDINARY_URL && !!cloudinary.config().cloud_name;
}

/** Upload a buffer (image or video) and return its f_auto,q_auto CDN URL + public_id. Null when unconfigured/failing. */
export async function uploadToCloudinary(
  file: Buffer,
  ext: string
): Promise<{ url: string; publicId: string } | null> {
  if (!cloudinaryConfigured()) return null;
  try {
    const res = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto", folder: "impactlens", format: ext || undefined }, (err, result) =>
          err || !result ? reject(err ?? new Error("empty Cloudinary upload")) : resolve(result)
        )
        .end(file);
    });
    return { url: res.secure_url.replace("/upload/", "/upload/f_auto,q_auto/"), publicId: res.public_id };
  } catch {
    return null; // best-effort: caller stores locally instead
  }
}

/** Remove a stored asset (best-effort). resource_type must match the original upload. */
export async function destroyCloudinary(publicId: string, type: "image" | "video"): Promise<void> {
  if (!cloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: type }).catch(() => undefined);
}
