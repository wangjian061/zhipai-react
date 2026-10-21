// Prototype policy adapter. Replace configuration and observations with backend responses later.
export const CAMERA_DETECTION_SCENARIOS = Object.freeze([
  Object.freeze({ id: "pass", label: "检测通过" }),
  Object.freeze({ id: "no_person", label: "无人像" }),
  Object.freeze({ id: "multiple", label: "多人照片" }),
  Object.freeze({ id: "animal", label: "动物照片" }),
  Object.freeze({ id: "error", label: "检测异常" }),
]);

export const CAMERA_DETECTION_CONFIG = Object.freeze({
  version: "prototype-1",
  checks: Object.freeze([
    Object.freeze({ id: "person", label: "照片中有人像", enabled: true }),
    Object.freeze({
      id: "single_person",
      label: "仅包含一个人",
      enabled: true,
    }),
    Object.freeze({ id: "no_animal", label: "照片中不含动物", enabled: true }),
  ]),
});

export function cameraDetectionItems(config) {
  if (!config?.version || !Array.isArray(config.checks)) return null;
  const items = config.checks.filter((item) => item?.enabled === true);
  if (
    !items.length ||
    new Set(items.map((item) => item.id)).size !== items.length ||
    items.some(
      (item) => !["person", "single_person", "no_animal"].includes(item.id),
    )
  )
    return null;
  return items.map(({ id, label }) => ({ id, label: label || id }));
}

export function cameraDetectionSignature(config) {
  const items = cameraDetectionItems(config);
  return items
    ? config.version +
        ":" +
        items
          .map((item) => item.id)
          .sort()
          .join(",")
    : null;
}

export function evaluateCameraDetection(config, scenario = "pass") {
  const items = cameraDetectionItems(config);
  if (
    !items ||
    !CAMERA_DETECTION_SCENARIOS.some((item) => item.id === scenario)
  )
    return {
      status: "error",
      checks: [],
      reasons: ["照片检测暂不可用，请稍后重新检测。"],
    };
  if (scenario === "error")
    return {
      status: "error",
      checks: items.map((item) => ({ ...item, status: "unknown" })),
      reasons: ["检测服务暂时不可用，请检查网络后重试。"],
    };
  const checks = items.map((item) => ({
    ...item,
    status:
      (item.id === "person" && ["animal", "no_person"].includes(scenario)) ||
      (item.id === "single_person" &&
        ["animal", "no_person", "multiple"].includes(scenario)) ||
      (item.id === "no_animal" && scenario === "animal")
        ? "failed"
        : "passed",
  }));
  const failed = checks.some((item) => item.status === "failed");
  return { status: failed ? "failed" : "passed", checks, reasons: [] };
}

export function cameraReturnPath(
  value,
  fallback = "/?page=home",
  origin = location.origin,
) {
  for (const candidate of [value, fallback]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, origin);
      if (url.origin === origin && url.searchParams.get("page") !== "camera")
        return url.pathname + url.search + url.hash;
    } catch (_) {
      /* Invalid entry targets fall back to the home page. */
    }
  }
  return "/?page=home";
}
