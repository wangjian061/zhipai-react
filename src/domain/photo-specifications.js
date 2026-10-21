// Pixel dimensions are output presets, not a promise of acceptance by an agency.
// Source scope and physical/digital distinctions: docs/product/photo-specifications-1.4.6.md.
export const PHOTO_BACKGROUNDS = [
  { id: "blue", name: "蓝色", value: "#438bc6" },
  { id: "white", name: "白色", value: "#ffffff" },
  { id: "red", name: "红色", value: "#d6383d" },
  { id: "gray", name: "灰色", value: "#d5d9e0" },
  { id: "transparent", name: "透明", value: "transparent" },
];

export const PHOTO_SPECIFICATIONS = [
  {
    id: "one",
    name: "一寸",
    mm: "25 × 35 mm",
    width: 295,
    height: 413,
    icon: "portrait",
    backgrounds: ["blue", "white", "red"],
  },
  {
    id: "two",
    name: "二寸",
    mm: "35 × 49 mm",
    width: 413,
    height: 579,
    icon: "portrait",
    backgrounds: ["blue", "white", "red"],
  },
  {
    id: "small-two",
    name: "小二寸",
    mm: "35 × 45 mm",
    width: 413,
    height: 531,
    icon: "portrait",
    backgrounds: ["blue", "white", "red"],
  },
  {
    id: "large-one",
    name: "大一寸",
    mm: "33 × 48 mm",
    width: 390,
    height: 567,
    icon: "portrait",
    backgrounds: ["blue", "white", "red"],
  },
  {
    id: "job",
    name: "求职招聘",
    mm: "35 × 49 mm",
    width: 413,
    height: 579,
    icon: "job",
    backgrounds: ["blue", "white", "red"],
  },
  {
    id: "cet",
    name: "四六级考试",
    mm: "报名电子照",
    width: 144,
    height: 192,
    icon: "exam",
    backgrounds: ["blue"],
  },
  {
    id: "driver",
    name: "驾驶证",
    mm: "22 × 32 mm",
    width: 260,
    height: 378,
    icon: "driver",
    backgrounds: ["white"],
  },
  {
    id: "identity",
    name: "身份证",
    mm: "26 × 32 mm",
    width: 358,
    height: 441,
    icon: "identity",
    backgrounds: ["white"],
  },
  {
    id: "passport",
    name: "中国护照",
    mm: "全程网办电子照",
    width: 600,
    height: 800,
    icon: "passport",
    backgrounds: ["white"],
  },
];

export function specificationSelection(
  specId,
  background,
  restrictColors = true,
) {
  const spec = PHOTO_SPECIFICATIONS.find((item) => item.id === specId);
  const color = PHOTO_BACKGROUNDS.find(
    (item) => item.id === background || item.value === background,
  );
  if (
    !spec ||
    !color ||
    (restrictColors && !spec.backgrounds.includes(color.id))
  )
    return null;
  return { specId: spec.id, background: color.value };
}

export function specificationDimensions(spec) {
  return /\d\s*×\s*\d.*mm$/.test(spec.mm)
    ? spec.mm
    : `${spec.width} × ${spec.height} px`;
}

export function specificationsReturnPath(value, origin = location.origin) {
  try {
    const url = new URL(value || "/?page=home", origin);
    if (
      url.origin === origin &&
      !["camera", "specifications"].includes(url.searchParams.get("page"))
    )
      return url.pathname + url.search + url.hash;
  } catch (_) {
    /* An invalid caller returns to home. */
  }
  return "/?page=home";
}
