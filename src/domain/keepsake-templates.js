import { photoCropBounds, decodePhotoBlob } from "./album.js";

// Demonstration SKUs, independently replaceable by the native/backend catalogue.
export const KEEPSAKE_PRODUCTS = {
  postcard: {
    name: "明信片制作",
    itemName: "明信片",
    price: 1000,
    size: "六寸",
    material: "富士相纸",
    shipping: 1000,
    count: 1,
    unit: "张",
  },
  stamp: {
    name: "邮票制作",
    itemName: "纪念邮折",
    price: 5900,
    shipping: 1000,
    count: 1,
    unit: "册",
  },
};
export const KEEPSAKE_TEMPLATES = [
  {
    id: "postcard-enrollment",
    kind: "postcard",
    name: "校园来信",
    photoWindow: { x: 64, y: 64, w: 1120, h: 1072 },
  },
  {
    id: "postcard-birthday",
    kind: "postcard",
    name: "生日祝福",
    photoWindow: { x: 80, y: 64, w: 1640, h: 912 },
  },
  {
    id: "postcard-graduate",
    kind: "postcard",
    name: "毕业留念",
    photoWindow: { x: 64, y: 64, w: 1672, h: 896 },
  },
  {
    id: "postcard-city",
    kind: "postcard",
    name: "旅行邮记",
    photoWindow: { x: 58, y: 58, w: 1684, h: 904 },
  },
  {
    id: "postcard-everyday",
    kind: "postcard",
    name: "日常问候",
    photoWindow: { x: 660, y: 64, w: 1076, h: 1072 },
  },
  {
    id: "postcard-together",
    kind: "postcard",
    name: "相聚留影",
    photoWindow: { x: 48, y: 50, w: 1704, h: 895 },
  },
  {
    id: "stamp-youth",
    kind: "stamp",
    name: "致青春",
    ground: "#E8EEE7",
    ink: "#386449",
  },
];
const xml = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export const templateFor = (id) => KEEPSAKE_TEMPLATES.find((t) => t.id === id);
export const STAMP_VIEWS = [
  ["inner", "内页"],
  ["open", "展开"],
  ["cover", "封面"],
  ["back", "封底"],
];
const postcardArtRoot = `${import.meta.env?.BASE_URL || "/"}assets/keepsakes/postcards-20261116/`;
// Catalogue samples never become photos in the editor or in a new order.
export const sampleArt = (template) =>
  template.kind === "postcard"
    ? `${postcardArtRoot}${template.id}-sample.webp`
    : `/assets/keepsakes/${template.id}-sample.webp`;
const STAMP_PRODUCT_IMAGES = Object.fromEntries(
  STAMP_VIEWS.map(([view]) => [
    view,
    `/assets/keepsakes/stamp-product-${view}-20261106.webp`,
  ]),
);
export function stampViewImage(view) {
  return STAMP_PRODUCT_IMAGES[view] || STAMP_PRODUCT_IMAGES.inner;
}
export const frameArt = (template) =>
  template.kind === "postcard"
    ? `${postcardArtRoot}${template.id}.png`
    : "/assets/keepsakes/stamp-frame.jpg";
// Visible stamp pane in the original inner-page artwork coordinates.
export const STAMP_PANE = { x: 258, y: 129, width: 648, height: 560 };
export function templateGeometry(template) {
  if (template.kind === "postcard")
    return {
      width: 1800,
      height: 1200,
      slots: [template.photoWindow],
    };
  return {
    width: 960,
    height: 720,
    slots: [
      { x: 432, y: 281, w: 303, h: 262, group: "center" },
      { x: 272, y: 141, w: 141, h: 124, group: "corners" },
      { x: 754, y: 141, w: 141, h: 124, group: "corners" },
      { x: 271, y: 558, w: 142, h: 125, group: "corners" },
      { x: 753, y: 558, w: 142, h: 125, group: "corners" },
    ],
  };
}
// Map the original pixels into the positive-coordinate frame used for cropping and dragging.
export function orientedPhoto(photo, angle = 0) {
  const { width, height } = photo;
  switch (angle) {
    case 90: return { width: height, height: width, matrix: `matrix(0 1 -1 0 ${height} 0)` };
    case 180: return { width, height, matrix: `matrix(-1 0 0 -1 ${width} ${height})` };
    case 270: return { width: height, height: width, matrix: `matrix(0 -1 1 0 0 ${width})` };
    default: return { width, height, matrix: "" };
  }
}

export function keepsakePhotoPlacement(photo, slot, settings) {
  const oriented = orientedPhoto(photo, settings.rotation);
  const crop = photoCropBounds(oriented.width, oriented.height, slot.w, slot.h, settings);
  const factor = slot.w / crop.w;
  return `translate(${slot.x - crop.x * factor} ${slot.y - crop.y * factor}) scale(${factor}) ${oriented.matrix}`;
}

export function keepsakeSVG(
  template,
  photo = null,
  transform = {},
  instance = "preview",
  frame = frameArt(template),
  viewport,
) {
  const { width, height, slots } = templateGeometry(template);
  const postcard = template.kind === "postcard";
  const prefix = `${template.id}-${instance}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const real = photo?.data && photo.width > 0 && photo.height > 0;
  const source = real
    ? `<defs><image id="${prefix}-source" href="${xml(photo.data)}" width="${photo.width}" height="${photo.height}"/></defs>`
    : "";
  const paper = `<image href="${xml(frame)}" width="${width}" height="${height}"/>`;
  const frames = slots
    .map((s, i) => {
      const bounds = `x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"`;
      let content;
      if (real) {
        const settings = transform[s.group] || transform;
        content = `<use href="#${prefix}-source" transform="${keepsakePhotoPlacement(photo, s, settings)}"/>`;
      } else {
        const size = Math.min(s.w, s.h) * 0.12;
        content = `<rect ${bounds} fill="#E5E9E7"/><g transform="translate(${s.x + s.w / 2} ${s.y + s.h / 2})"><circle r="${size}" fill="#F6F8F7"/><path d="M-${size / 2} 0h${size} M0 -${size / 2}v${size}" fill="none" stroke="#798C9B" stroke-width="${size * 0.09}"/></g>`;
      }
      return `<defs><clipPath id="${prefix}-${i}"><rect ${bounds}/></clipPath></defs><g clip-path="url(#${prefix}-${i})">${content}</g>`;
    })
    .join("");
  const view = viewport || { x: 0, y: 0, width, height };
  const layers = postcard
    ? `<rect width="${width}" height="${height}" fill="#fff"/>${frames}${paper}`
    : paper + frames;
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${view.width}" height="${view.height}" viewBox="${view.x} ${view.y} ${view.width} ${view.height}">${source}${layers}</svg>`;
}
export async function decodeKeepsakePhoto(photo) {
  if (
    !(photo?.blob instanceof Blob) ||
    !photo.blob.size ||
    photo.blob.size > 30 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(photo.blob.type)
  )
    throw Error("请选择30MB以内的JPG、PNG或WebP照片。");
  const image = await decodePhotoBlob(photo.blob);
  if (!image.naturalWidth || !image.naturalHeight)
    throw Error("照片无法读取，请更换照片。");
  return image;
}
export async function photoData(photo) {
  const image = await decodeKeepsakePhoto(photo);
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("照片读取失败，请重试。"));
    reader.readAsDataURL(photo.blob);
  });
  return { data, width: image.naturalWidth, height: image.naturalHeight };
}
export async function loadKeepsakeFrame(template) {
  try {
    const response = await fetch(frameArt(template));
    if (!response.ok) throw Error("frame unavailable");
    return (await photoData({ blob: await response.blob() })).data;
  } catch {
    throw Error(template.kind === "postcard"
      ? "明信片模板读取失败，请重试。"
      : "邮折版面读取失败，请重试。");
  }
}

export async function renderKeepsake(template, photo, transform, previewFrame) {
  if (!photo?.data || !(photo.width > 0 && photo.height > 0))
    throw Error("请先选取可用的照片。");
  // SVGs decoded as images cannot load external template resources.
  const frame = previewFrame || await loadKeepsakeFrame(template);
  const svg = keepsakeSVG(template, photo, transform, "export", frame);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const image = await decodePhotoBlob(blob);
  const { width, height } = templateGeometry(template);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(Error("成品生成失败，请重试。")),
      "image/png",
    ),
  );
}
