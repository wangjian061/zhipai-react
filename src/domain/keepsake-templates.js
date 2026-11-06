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
    theme: "campus",
    ground: "#E9F1E9",
    ink: "#255445",
  },
  {
    id: "postcard-birthday",
    kind: "postcard",
    name: "生日祝福",
    theme: "birthday",
    ground: "#FAE8DF",
    ink: "#984839",
  },
  {
    id: "postcard-graduate",
    kind: "postcard",
    name: "毕业留念",
    theme: "graduate",
    ground: "#E6ECF9",
    ink: "#244678",
  },
  {
    id: "postcard-city",
    kind: "postcard",
    name: "旅行邮记",
    theme: "travel",
    ground: "#F7EFDD",
    ink: "#805A32",
  },
  {
    id: "postcard-everyday",
    kind: "postcard",
    name: "日常问候",
    theme: "daily",
    ground: "#F0EBF4",
    ink: "#64506F",
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
export const sampleArt = (template) =>
  `/assets/keepsakes/${template.id}-sample.webp`;
// Product-only artwork. Keep sampleArt aligned to the editable template coordinates.
const STAMP_PRODUCT_IMAGES = Object.fromEntries(
  STAMP_VIEWS.map(([view]) => [
    view,
    `/assets/keepsakes/stamp-product-${view}-20261106.webp`,
  ]),
);
export function stampViewImage(view) {
  return STAMP_PRODUCT_IMAGES[view] || STAMP_PRODUCT_IMAGES.inner;
}
const stampFrame = "/assets/keepsakes/stamp-frame.jpg";
// Visible stamp pane in the original inner-page artwork coordinates.
export const STAMP_PANE = { x: 258, y: 129, width: 648, height: 560 };
export function templateGeometry(template) {
  if (template.kind === "postcard")
    return {
      width: 1800,
      height: 1200,
      slots: [{ x: 60, y: 60, w: 1116, h: 960 }],
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
// Paper ornament and the editable photograph are separate layers in the final print.
const POSTCARD_ART = {
  campus: {
    series: "CAMPUS LETTER",
    motif:
      '<path d="M12 35V15l24-9 24 9v20M8 35h56M22 34V21h5v13m7 0V17h5v17m7 0V21h5v13"/>',
  },
  birthday: {
    series: "HAPPY BIRTHDAY",
    motif:
      '<path d="M12 33h48v-14H12zm0-14q6 9 12 0 6 9 12 0 6 9 12 0 6 9 12 0M26 18v-7m12 7V9m11 9v-7"/><path d="M26 7q-4-3 1-6m10 5q-3-3 2-6m9 7q-3-3 2-6"/>',
  },
  graduate: {
    series: "GRADUATION",
    motif: '<path d="m5 14 31-12 31 12-31 13zm12 6v9q16 10 38 0v-9m8-4v14"/>',
  },
  travel: {
    series: "TRAVEL NOTES",
    motif:
      '<path d="m7 31 18-20 13 13L52 7l15 24zM9 37h53"/><circle cx="16" cy="8" r="4"/>',
  },
  daily: {
    series: "EVERYDAY MAIL",
    motif:
      '<path d="M8 33C28 15 41 14 63 4M23 22Q9 19 10 9q15-2 21 9m6-4q0-14 17-14-1 9-12 12m-2 3q10 6 23-2-16-7-23 2"/>',
  },
};
function postcardPaper(t) {
  const { series, motif } = POSTCARD_ART[t.theme];
  return `<g transform="scale(6)" font-family="sans-serif" fill="${t.ink}">
    <rect width="300" height="200" fill="${t.ground}"/>
    <rect x="7" y="7" width="192" height="166" fill="#fff"/>
    <path d="M208 10v160" stroke="${t.ink}" opacity=".21" stroke-dasharray="1 2"/>
    <text x="219" y="28" font-size="6" letter-spacing="1">POST CARD</text>
    <g font-family="serif" font-size="24" font-weight="600">
      <text x="218" y="63">${t.name.slice(0, 2)}</text><text x="218" y="91">${t.name.slice(2)}</text>
    </g>
    <g transform="translate(217 104)" fill="none" stroke="${t.ink}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${motif}</g>
    <path d="M219 151h65m-65 8h45M10 178h280" stroke="${t.ink}" stroke-width=".6" opacity=".6"/>
    <text x="10" y="191" font-size="7" letter-spacing="1.2">${series}</text>
    <text x="290" y="191" font-size="6" text-anchor="end">知拍 · 明信片</text>
  </g>`;
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

export function keepsakeSVG(
  template,
  photo = null,
  transform = {},
  instance = "preview",
  frame = stampFrame,
  viewport,
) {
  const { width, height, slots } = templateGeometry(template);
  const prefix = `${template.id}-${instance}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const real = photo?.data && photo.width > 0 && photo.height > 0;
  const source = real
    ? `<defs><image id="${prefix}-source" href="${xml(photo.data)}" width="${photo.width}" height="${photo.height}"/></defs>`
    : "";
  const paper =
    template.kind === "stamp"
      ? `<image href="${xml(frame)}" width="${width}" height="${height}"/>`
      : postcardPaper(template);
  const frames = slots
    .map((s, i) => {
      let content;
      if (real) {
        const settings = transform[s.group] || transform;
        const oriented = orientedPhoto(photo, template.kind === "postcard" ? settings.rotation : 0);
        const crop = photoCropBounds(oriented.width, oriented.height, s.w, s.h, settings);
        const factor = s.w / crop.w;
        content = `<use href="#${prefix}-source" transform="translate(${s.x - crop.x * factor} ${s.y - crop.y * factor}) scale(${factor}) ${oriented.matrix}"/>`;
      } else {
        const size = Math.min(s.w, s.h) * 0.12;
        content = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#E5E9E7"/><g transform="translate(${s.x + s.w / 2} ${s.y + s.h / 2})"><circle r="${size}" fill="#F6F8F7"/><path d="M-${size / 2} 0h${size} M0 -${size / 2}v${size}" fill="none" stroke="#798C9B" stroke-width="${size * 0.09}"/></g>`;
      }
      return `<defs><clipPath id="${prefix}-${i}"><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/></clipPath></defs><g clip-path="url(#${prefix}-${i})">${content}</g>`;
    })
    .join("");
  const view = viewport || { x: 0, y: 0, width, height };
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${view.width}" height="${view.height}" viewBox="${view.x} ${view.y} ${view.width} ${view.height}">${source}${paper}${frames}</svg>`;
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
export async function renderKeepsake(template, photo, transform) {
  if (!photo?.data || !(photo.width > 0 && photo.height > 0)) {
    throw Error("请先选取可用的照片。");
  }
  let frame;
  if (template.kind === "stamp") {
    const response = await fetch(stampFrame);
    if (!response.ok) throw Error("邮折版面读取失败，请重试。");
    frame = (await photoData({ blob: await response.blob() })).data;
  }
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
