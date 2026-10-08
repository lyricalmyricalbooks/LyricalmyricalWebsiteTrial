// One upload path for every Studio image (section/block images, Theme settings images,
// rich-text pictures). Files go under `assets/`, which storage.rules lets the admin write,
// and are shrunk first so storefront pages stay light.
import { adminApi } from "../api";
import { MAX_STUDIO_IMAGE_EDGE, prepareProductImage } from "../prepareImage";

export const STUDIO_UPLOAD_ROOT = "assets/studio";

/** `assets/studio/2026/10/1728400000000-summer-banner.webp` — dated folders, safe file names. */
export function studioUploadPath(fileName: string, now = new Date()): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image";
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${STUDIO_UPLOAD_ROOT}/${now.getUTCFullYear()}/${month}/${now.getTime()}-${base}${ext ? "." + ext : ""}`;
}

export async function uploadStudioImage(file: File): Promise<string> {
  const ready = await prepareProductImage(file, MAX_STUDIO_IMAGE_EDGE);
  return adminApi.uploadFile(ready, studioUploadPath(ready.name));
}

/** Plain-English reason shown under the Upload button when an upload fails. */
export function uploadErrorMessage(error: unknown): string {
  const code = String((error as any)?.code || "");
  if (code === "storage/unauthorized") return "Upload refused — sign in again as the shop admin and retry.";
  if (code === "storage/quota-exceeded") return "Upload refused — the storage allowance is full.";
  if (code === "storage/retry-limit-exceeded" || code === "storage/canceled") return "Upload interrupted — check your connection and retry.";
  return "Upload failed — check your connection and try again.";
}
