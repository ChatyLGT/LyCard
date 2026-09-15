import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function safeExt(name: string) {
  const ext = path.extname(name).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
}

/**
 * Vercel Blob in production (BLOB_READ_WRITE_TOKEN set); local disk under
 * public/uploads otherwise, so the app runs without cloud credentials in dev.
 */
export async function saveUpload(file: File, keyPrefix: string): Promise<string> {
  const filename = `${keyPrefix}-${crypto.randomUUID()}${safeExt(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
