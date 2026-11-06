// Preserve the calendar day at the camera, including when the photo travels across time zones.
export function captureDayAt(timestamp) {
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

function validCalendarDay(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000")
  )
    return null;
  const utc = new Date(value + "T00:00:00Z");
  return Number.isFinite(utc.getTime()) &&
    utc.toISOString().slice(0, 10) === value
    ? value
    : null;
}

export function formatCaptureDate(value) {
  return validCalendarDay(value)?.replaceAll("-", "/") || "";
}

// Both dates have the same visible format; retain the source for accessible labels.
export function albumDate(photo) {
  const taken = validCalendarDay(photo?.captureDate);
  if (taken) return { day: taken, label: formatCaptureDate(taken), kind: "拍摄日期" };
  const added = captureDayAt(photo?.addedAt);
  return added ? { day: added, label: formatCaptureDate(added), kind: "添加日期" } : null;
}

export async function originalDateInFile(blob) {
  if (!blob?.size) return null;
  try {
    const { default: reader } = await import("exifreader");
    const tags = reader.load(await blob.arrayBuffer(), {
      expanded: true,
      includeTags: { exif: ["DateTimeOriginal"], xmp: ["DateTimeOriginal"] },
    });
    const original = tags.exif?.DateTimeOriginal?.description;
    const day = /^(\d{4}):(\d{2}):(\d{2})(?:\s|$)/.exec(original || "");
    const exifDay = day && validCalendarDay(day.slice(1).join("-"));
    if (exifDay) return exifDay;
    const xmp = tags.xmp?.DateTimeOriginal?.description;
    const xmpDay = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(xmp || "");
    return xmpDay ? validCalendarDay(xmpDay[1]) : null;
  } catch {
    // Metadata is optional. An unreadable tag must not prevent importing the image.
    return null;
  }
}

export async function photoCaptureDate(photo) {
  if (!photo) return null;
  if (photo.captureDate !== undefined)
    return validCalendarDay(photo.captureDate);
  // Earlier live-camera drafts recorded createdAt on the original capture itself.
  if (
    photo.origin === "camera" &&
    photo.id?.startsWith("capture-") &&
    Number.isFinite(photo.createdAt)
  )
    return captureDayAt(photo.createdAt);
  return originalDateInFile(photo.rawBlob || photo.blob);
}

// Resolve the original before its derivatives, independently of album display order.
export async function restoreAlbumCaptureDates(photos, getSession) {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  async function resolve(photo, visiting) {
    if (!photo || visiting.has(photo.id)) return null;
    if (photo.captureDate !== undefined)
      return validCalendarDay(photo.captureDate);
    visiting.add(photo.id);
    let day = await photoCaptureDate(photo);
    if (!day) day = await resolve(byId.get(photo.sourceId), visiting);
    if (!day && photo.origin === "made" && photo.id.startsWith("made-")) {
      try {
        const session = await getSession(photo.id.slice(5));
        day = await photoCaptureDate(session?.photo);
      } catch {
        // A legacy camera draft may no longer be accessible.
      }
    }
    photo.captureDate = day;
    return day;
  }
  for (const photo of photos) await resolve(photo, new Set());
}
