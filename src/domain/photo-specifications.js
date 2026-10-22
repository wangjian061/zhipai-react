// Replaceable local configuration for the prototype, shaped like a backend catalog.
// Allowed colors belong to spec IDs, never to a hardcoded name or width/height rule.
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

export function specificationBackgrounds(
  specId,
  specifications = PHOTO_SPECIFICATIONS,
  palette = PHOTO_BACKGROUNDS,
) {
  if (!Array.isArray(specifications) || !Array.isArray(palette)) return [];
  const spec = specifications.find((item) => item?.id === specId);
  if (!spec || spec.enabled === false || !Array.isArray(spec.backgrounds))
    return [];
  const seen = new Set();
  return spec.backgrounds.flatMap((id) => {
    if (typeof id !== "string" || !id.trim()) return [];
    const color = palette.find((item) => item?.id === id);
    if (
      !color ||
      color.enabled === false ||
      typeof color.name !== "string" ||
      !color.name.trim() ||
      typeof color.value !== "string" ||
      !/^(?:#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8}|transparent)$/i.test(
        color.value,
      ) ||
      seen.has(color.value)
    )
      return [];
    seen.add(color.value);
    return [color];
  });
}

// No arbitrary fallback: keep valid → choose sole option → require a choice.
export function specificationBackgroundState(
  specId,
  background,
  specifications = PHOTO_SPECIFICATIONS,
  palette = PHOTO_BACKGROUNDS,
) {
  const colors = specificationBackgrounds(specId, specifications, palette);
  const selected =
    colors.find(
      (color) => color.id === background || color.value === background,
    ) || (colors.length === 1 ? colors[0] : null);
  return {
    colors,
    background: selected?.value || null,
    backgroundId: selected?.id || null,
    message: !colors.length
      ? "当前规格的背景颜色暂不可用，请选择其他规格或稍后再试。"
      : colors.length === 1
        ? `该规格仅支持${colors[0].name}背景，已自动选定。`
        : !selected
          ? "请为当前规格选择背景颜色。"
          : "",
  };
}

// Strict validation, including direct routes/calls. Reconciliation is explicit above.
export function specificationSelection(
  specId,
  background,
  specifications = PHOTO_SPECIFICATIONS,
  palette = PHOTO_BACKGROUNDS,
) {
  const color = specificationBackgrounds(specId, specifications, palette).find(
    (item) => item.id === background || item.value === background,
  );
  return color ? { specId, background: color.value } : null;
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
