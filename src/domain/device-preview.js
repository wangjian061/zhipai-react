// iPhone 16 Pro: Apple lists 1206×2622 screen pixels and a 71.5×149.6 mm body.
// The preview uses the 3× logical screen (402×874); the body rounds to 430×900.
export const IPHONE_PREVIEW = Object.freeze({
  model: "iPhone 16 Pro",
  screenWidth: 402,
  screenHeight: 874,
  bodyWidth: 430,
  bodyHeight: 900,
  bodyWidthMm: 71.5,
  bodyHeightMm: 149.6,
  insetX: 14,
  insetY: 13,
  statusHeight: 62,
  homeHeight: 34,
  homeIndicatorBottom: 8,
  homeIndicatorHeight: 5,
  navigationGap: 16,
});
export function fitPhonePreview(viewportWidth, viewportHeight, gutter = 16) {
  const { bodyWidth, bodyHeight } = IPHONE_PREVIEW;
  const width = Number.isFinite(viewportWidth)
    ? Math.max(1, viewportWidth)
    : bodyWidth + gutter * 2;
  const height = Number.isFinite(viewportHeight)
    ? Math.max(1, viewportHeight)
    : bodyHeight + gutter * 2;
  // For extremely small windows reduce the gutter instead of producing a negative scale.
  const margin = Math.max(0, Math.min(gutter, width / 4, height / 4));
  const scale = Math.min(
    1,
    (width - margin * 2) / bodyWidth,
    (height - margin * 2) / bodyHeight,
  );
  return { scale, width: bodyWidth * scale, height: bodyHeight * scale };
}
