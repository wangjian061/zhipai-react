// One-time, local-development data requested for the collection status review.
// This module is dynamically imported only by the development records page.
export const COLLECTION_EXAMPLE_BATCH = "collection-status-20261015";
const GRADUATE_REVIEW_BATCH = "graduate-record-review";
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

export function missingCollectionExamples(items, owner, graduateOnly = false) {
  if (!owner) return [];
  // The automatic batch belongs to its first importing account.
  if (!graduateOnly && items.some(
    (r) => r.exampleBatch === COLLECTION_EXAMPLE_BATCH && r.owner !== owner,
  )) return [];
  const existing = new Set(
    items.filter((r) => r.owner === owner &&
      (r.exampleBatch === COLLECTION_EXAMPLE_BATCH || r.exampleBatch === GRADUATE_REVIEW_BATCH))
      .map((r) => r.exampleKey),
  );
  return examples.filter(([status, , projectId]) =>
    (!graduateOnly || projectId === "graduate") && !existing.has(String(status)),
  );
}

export function buildCollectionExamples(items, owner, photo, now = Date.now(), graduateOnly = false) {
  const exampleBatch = graduateOnly ? GRADUATE_REVIEW_BATCH : COLLECTION_EXAMPLE_BATCH;
  return missingCollectionExamples(items, owner, graduateOnly).map(
    ([status, name, projectId, reason]) => {
      const index = examples.findIndex(([value]) => value === status);
      const exampleKey = String(status);
      const id = graduateOnly
        ? `${exampleBatch}-${crypto.randomUUID()}`
        : `${exampleBatch}-${exampleKey}`;
      return {
        id,
        owner,
        fixture: false,
        example: true,
        exampleBatch,
        exampleKey,
        projectId,
        status,
        name,
        method: "student",
        number: `20261015${String(index + 1).padStart(4, "0")}`,
        lastFour: String(3101 + index),
        identifierKey: id,
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
export async function importCollectionExamples(options) {
  const { store, owner, isCurrent, loadPhoto, graduateOnly = false } = options;
  if (importing) {
    if (importing.store === store && importing.owner === owner && importing.graduateOnly === graduateOnly)
      return importing.result;
    await importing.result.catch(() => {});
    return importCollectionExamples(options);
  }
  if (
    !store.ready ||
    store.busy ||
    !isCurrent() ||
    !missingCollectionExamples(store.items, owner, graduateOnly).length
  )
    return 0;
  const result = (async () => {
    const photo = await loadPhoto();
    if (!isCurrent() || store.busy || !store.ready) return 0;
    // Read the latest list after loading the asset to preserve intervening edits.
    const records = buildCollectionExamples(store.items, owner, photo, Date.now(), graduateOnly);
    if (!records.length) return 0;
    await store.commit([...records, ...store.items]);
    return records.length;
  })();
  importing = { store, owner, graduateOnly, result };
  try {
    return await result;
  } finally {
    importing = null;
  }
}
