// One-time, local-development data requested for the collection status review.
// This module is dynamically imported only by the development records page.
export const COLLECTION_EXAMPLE_BATCH = "collection-status-20261015";
const examples = [
  ["pending", "林知夏", "enrollment", ""],
  [22, "陈书宁", "enrollment", ""],
  [
    23,
    "许清禾",
    "enrollment",
    "面部光线不均，照片清晰度不足。请在光线均匀的位置正面拍摄，保持面部无遮挡。",
  ],
  [24, "周亦安", "enrollment", ""],
  [25, "沈思齐", "graduate", ""],
  [26, "陆星遥", "graduate", ""],
  [
    40,
    "江予宁",
    "graduate",
    "头发遮挡眉毛，头部有明显倾斜。请整理头发、正视镜头，并按项目要求重新拍摄上传。",
  ],
  [30, "程景行", "graduate", ""],
  ["uploaded", "苏若初", "graduate", ""],
  [
    "upload_failed",
    "顾言川",
    "graduate",
    "提交的学籍信息与学信网信息不一致。请核对姓名、学号及所属院校，并联系客服处理。",
  ],
];

export function missingCollectionExamples(items, owner) {
  if (!owner) return [];
  const batch = items.filter(
    (r) => r.exampleBatch === COLLECTION_EXAMPLE_BATCH,
  );
  // The approved batch belongs to the first importing account, never later accounts.
  if (batch.some((r) => r.owner !== owner)) return [];
  const existing = new Set(batch.map((r) => r.exampleKey));
  return examples.filter(([status]) => !existing.has(String(status)));
}

export function buildCollectionExamples(items, owner, photo, now = Date.now()) {
  return missingCollectionExamples(items, owner).map(
    ([status, name, projectId, reason]) => {
      const index = examples.findIndex(([value]) => value === status);
      const exampleKey = String(status);
      return {
        id: `${COLLECTION_EXAMPLE_BATCH}-${exampleKey}`,
        owner,
        fixture: false,
        example: true,
        exampleBatch: COLLECTION_EXAMPLE_BATCH,
        exampleKey,
        projectId,
        status,
        name,
        method: "student",
        number: `20261015${String(index + 1).padStart(4, "0")}`,
        lastFour: String(3101 + index),
        identifierKey: `${COLLECTION_EXAMPLE_BATCH}-${exampleKey}`,
        customer: `2026101500${String(index + 1).padStart(2, "0")}`,
        supplement: {
          referrer: "示例学院教务处",
          age: projectId === "graduate" ? "22" : "18",
        },
        photo: status === "pending" ? null : { ...photo },
        reason,
        createdAt: now - index * 60000,
        updatedAt: now - index * 60000,
        // No reviewDueAt: initial examples keep their assigned state until acted on.
      };
    },
  );
}

let importing = null;
export async function importCollectionExamples({
  store,
  owner,
  isCurrent,
  loadPhoto,
}) {
  if (importing) return importing;
  if (
    !store.ready ||
    store.busy ||
    !isCurrent() ||
    !missingCollectionExamples(store.items, owner).length
  )
    return 0;
  importing = (async () => {
    const photo = await loadPhoto();
    if (!isCurrent() || store.busy || !store.ready) return 0;
    // Read the latest list after loading the asset to preserve intervening edits.
    const records = buildCollectionExamples(store.items, owner, photo);
    if (!records.length) return 0;
    await store.commit([...records, ...store.items]);
    return records.length;
  })();
  try {
    return await importing;
  } finally {
    importing = null;
  }
}
