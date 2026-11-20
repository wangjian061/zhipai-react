export function fitDocumentPhoto(width, height, naturalWidth, naturalHeight) {
  const scale = Math.min(width / naturalWidth, height / naturalHeight);
  return { width, height, photoWidth: naturalWidth * scale, photoHeight: naturalHeight * scale };
}

export function documentViewport(view, frame, zoom, origin, target = origin) {
  const nextZoom = Math.max(1, Math.min(3, zoom));
  const ratio = nextZoom / view.zoom;
  const boundX = Math.max(0, (frame.photoWidth * nextZoom - frame.width) / 2);
  const boundY = Math.max(0, (frame.photoHeight * nextZoom - frame.height) / 2);
  return {
    zoom: nextZoom,
    x: Math.max(-boundX, Math.min(boundX, target.x + (view.x - origin.x) * ratio)),
    y: Math.max(-boundY, Math.min(boundY, target.y + (view.y - origin.y) * ratio)),
  };
}

export function documentGestureAction(dx, dy) {
  if (Math.abs(dx) >= 42 && Math.abs(dx) >= Math.abs(dy) * 1.25)
    return dx < 0 ? "next" : "previous";
  if (dy >= 72 && dy >= Math.abs(dx) * 1.25) return "close";
  return null;
}
