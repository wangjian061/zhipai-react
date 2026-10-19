import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import { decodePhotoBlob } from "./album.js";
// Photo production step adapter: prototype only, no model and no portrait checks.
async function makeCameraPhotoStep(
  photo,
  { outcome = "success", failureReason } = {},
) {
  if (outcome === "failure") {
    const error = Error(
      failureReason || "制作服务暂时不可用，请稍后重新制作。",
    );
    error.code = "PROTOTYPE_FAILURE";
    throw error;
  }
  return {
    blob: photo.blob,
    width: photo.width,
    height: photo.height,
  };
}
async function cameraAwait(promise, timeout = 20000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = Error("照片处理超时");
          error.code = "PROCESS_TIMEOUT";
          reject(error);
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function cameraCanvasBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(Error("encode failed"))),
      type,
      0.95,
    ),
  );
}
function cameraPhotoPlacement(
  sourceWidth,
  sourceHeight,
  frameWidth,
  frameHeight,
  settings = {},
) {
  const scale = Math.max(0.5, Math.min(4, Number(settings.scale) || 1));
  const fit =
    Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight) * scale;
  const width = sourceWidth * fit,
    height = sourceHeight * fit;
  return {
    x:
      (frameWidth - width) / 2 +
      ((Number(settings.offsetX) || 0) * frameWidth) / 100,
    y:
      (frameHeight - height) / 2 +
      ((Number(settings.offsetY) || 0) * frameHeight) / 100,
    width,
    height,
  };
}
async function renderCameraPhoto(blob, settings) {
  const image = await decodePhotoBlob(blob),
    canvas = document.createElement("canvas");
  canvas.width = settings.outputWidth;
  canvas.height = settings.outputHeight;
  const c = canvas.getContext("2d");
  if (!c) throw Error("canvas");
  const transparent = settings.background === "transparent";
  if (!transparent) {
    c.fillStyle = settings.background || "#438bc6";
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  const placement = cameraPhotoPlacement(
    image.naturalWidth,
    image.naturalHeight,
    canvas.width,
    canvas.height,
    settings,
  );
  c.drawImage(
    image,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  );
  return cameraCanvasBlob(canvas, transparent ? "image/png" : "image/jpeg");
}
export {
  makeCameraPhotoStep,
  cameraAwait,
  cameraCanvasBlob,
  cameraPhotoPlacement,
  renderCameraPhoto,
};
