import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const AUDIO_EXTS = [".webm", ".ogg", ".mp3", ".m4a", ".wav"];

function safeExt(name: string, kind: "image" | "audio") {
  const ext = path.extname(name).toLowerCase();
  const allowed = kind === "audio" ? AUDIO_EXTS : IMAGE_EXTS;
  return allowed.includes(ext) ? ext : allowed[0];
}

/**
 * Vercel Blob in production (BLOB_READ_WRITE_TOKEN set); local disk under
 * public/uploads otherwise, so the app runs without cloud credentials in dev.
 * `kind` picks the allowed extension list — "image" (default) keeps every
 * existing call working unchanged; "audio" is for Notas de Voz.
 */
export async function saveUpload(file: File, keyPrefix: string, kind: "image" | "audio" = "image"): Promise<string> {
  const filename = `${keyPrefix}-${crypto.randomUUID()}${safeExt(file.name, kind)}`;

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
