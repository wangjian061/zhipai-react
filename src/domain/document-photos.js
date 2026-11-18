import { decodePhotoBlob } from "./photo-readability.js";

export const DOCUMENT_PHOTO_MAX_COUNT = 5;
export const DOCUMENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function remainingDocumentPhotoSlots(saved = 0, staged = 0) {
  return Math.max(0, DOCUMENT_PHOTO_MAX_COUNT - saved - staged);
}

export function assertDocumentPhotoCount(count, remaining) {
  if (!count) throw new Error("请添加可用的照片。");
  if (count > remaining) {
    if (!remaining) throw new Error("这份证件已达到 5 张照片的上限。");
    throw new Error(`本次最多可选 ${remaining} 张，请重新选择。`);
  }
}

const encode = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressDocumentPhoto(
  photo,
  {
    decode = decodePhotoBlob,
    makeCanvas = () => document.createElement("canvas"),
  } = {},
) {
  if (photo.blob.size <= DOCUMENT_PHOTO_MAX_BYTES) return photo;

  let canvas;
  let encoded = false;
  try {
    const image = await decode(photo.blob);
    canvas = makeCanvas();
    const context = canvas.getContext("2d");
    if (!context) throw new Error();
    const { naturalWidth, naturalHeight } = image;
    const type = photo.blob.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    let scale = Math.min(1, 4096 / Math.max(naturalWidth, naturalHeight));
    for (let pass = 0; pass < 8; pass++, scale *= 0.8) {
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      for (const quality of [0.94, 0.87, 0.8]) {
        const blob = await encode(canvas, type, quality);
        if (blob?.size > 0) encoded = true;
        if (blob?.size > 0 && blob.size <= DOCUMENT_PHOTO_MAX_BYTES) {
          const extension = {
            "image/webp": "webp",
            "image/jpeg": "jpg",
            "image/png": "png",
          }[blob.type];
          if (!extension) throw new Error();
          const stem = (photo.name || "证件照片").replace(/\.[^.]+$/, "");
          return {
            ...photo,
            name: `${stem}.${extension}`,
            blob,
            width,
            height,
            size: blob.size,
            type: blob.type,
          };
        }
        // A browser that falls back to PNG ignores the quality setting.
        if (blob?.type === "image/png") break;
      }
    }
  } catch {
    throw new Error("照片压缩失败，请换一张照片。");
  } finally {
    if (canvas) canvas.width = canvas.height = 0;
  }
  throw new Error(
    encoded
      ? "照片压缩后仍超过 5 MB，请换一张照片。"
      : "照片压缩失败，请换一张照片。",
  );
}
