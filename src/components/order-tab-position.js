// A scrollable type strip ends at its real options; it has no centering spacers.
export function clampOrderTabScroll(left, viewport, content) {
  return Math.min(Math.max(0, left), Math.max(0, content - viewport));
}

export function orderTabScrollTarget(start, width, viewport, content) {
  return clampOrderTabScroll(
    start + width / 2 - viewport / 2,
    viewport,
    content,
  );
}
