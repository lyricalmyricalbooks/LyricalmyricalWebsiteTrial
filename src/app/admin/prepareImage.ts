// Shrinks oversized photos before upload (keeps the whole image — no cropping).
export const MAX_IMAGE_EDGE = 1600;
// Studio banners and backgrounds span the full screen, so they keep a little more detail.
export const MAX_STUDIO_IMAGE_EDGE = 2000;

export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return { width: Math.round(width * scale), height: Math.round(height * scale), scaled: scale < 1 };
}

export async function prepareProductImage(file: File, maxEdge = MAX_IMAGE_EDGE): Promise<File> {
  // GIFs (animation) and SVGs (vector) are uploaded untouched.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height, scaled } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    if (!scaled && file.size < 600_000) { bitmap.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const type = file.type === "image/png" ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.86));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/png" ? ".png" : ".webp");
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}
