// Backend values remain unchanged; only presentation and permitted actions are grouped.
// CHSI upload codes have not been supplied: uploaded/upload_failed are frontend keys.
const BACKEND_STATUS_KEYS = Object.freeze({
  22: "processing",
  STANDARD_SNAP: "processing",
  23: "processing_failed",
  STANDARD_FAIL: "processing_failed",
  24: "draft",
  STANDARD_SUCCESS: "draft",
  25: "reviewing",
  FIRST_AUDIT: "reviewing",
  26: "reviewing",
  PS: "reviewing",
  30: "complete",
  AUDIT_SUCCESS: "complete",
  40: "rejected",
  AUDIT_FALL: "rejected",
});

export const COLLECTION_STATUSES = Object.freeze({
  pending: {
    label: "待拍摄",
    hint: "身份已核对，请完成本次照片采集",
    tone: "blue",
    action: "capture",
    primary: "开始拍摄",
    icon: "camera",
  },
  processing: {
    label: "证件照制作中",
    hint: "正在制作标准证件照，请稍候",
    tone: "blue",
    action: "records",
    primary: "返回采集记录",
    icon: "document",
  },
  processing_failed: {
    label: "证件照制作失败",
    hint: "证件照制作失败，请重新制作",
    tone: "red",
    action: "capture",
    primary: "重新制作",
    icon: "camera",
  },
  draft: {
    label: "待提交审核",
    hint: "证件照制作成功，请提交审核",
    tone: "orange",
    action: "submit",
    primary: "提交审核",
    icon: "check",
  },
  reviewing: {
    label: "审核中",
    hint: "审核预计需要约两个工作日",
    tone: "orange",
    action: "records",
    primary: "返回采集记录",
    icon: "document",
  },
  rejected: {
    label: "审核未通过",
    hint: "请根据未通过原因重新拍摄并上传",
    tone: "red",
    action: "capture",
    primary: "重新拍摄",
    icon: "camera",
  },
  complete: {
    label: "采集完成",
    hint: "照片审核通过，本次采集已完成",
    tone: "green",
    action: "download",
    primary: "保存照片",
    icon: "download",
  },
  uploaded: {
    label: "上网完成",
    hint: "照片已成功提交至学信网",
    tone: "green",
    action: "download",
    primary: "保存照片",
    icon: "download",
  },
  upload_failed: {
    label: "上网失败",
    hint: "照片提交学信网失败，请查看失败原因",
    tone: "red",
    action: "support",
    primary: "联系客服",
    icon: "nav-service",
  },
  unknown: {
    label: "状态待更新",
    hint: "请返回采集记录查看最新进度",
    tone: "blue",
    action: "records",
    primary: "返回采集记录",
    icon: "document",
  },
});

export function collectionStatusKey(value) {
  if (typeof value !== "string" && typeof value !== "number") return "unknown";
  const key = String(value).trim();
  if (Object.hasOwn(COLLECTION_STATUSES, key)) return key;
  return BACKEND_STATUS_KEYS[key.toUpperCase()] || "unknown";
}

export function collectionStatusInfo(value) {
  return COLLECTION_STATUSES[collectionStatusKey(value)];
}

export function canEditCollectionPhoto(value) {
  return ["pending", "draft", "processing_failed", "rejected"].includes(
    collectionStatusKey(value),
  );
}

export function isCollectionFinished(value) {
  return ["complete", "uploaded", "upload_failed"].includes(
    collectionStatusKey(value),
  );
}
