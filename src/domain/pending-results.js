import { getStore } from "../runtime/state.js";
import {
  readCameraSession,
  readElectronicOrders,
  updateElectronicReceipt,
} from "./camera.js";
import { uploadedPhoto } from "./album.js";

// Recovery belongs to photo workflows, never to the transaction projection.
export function pendingPurchasedResults(owner, type = null) {
  if (!owner) return [];
  const tools = (getStore("toolOrders")?.items || [])
    .filter(
      (r) =>
        r.owner === owner &&
        !r.fixture &&
        r.status === "paid" &&
        !r.savedId &&
        ["repair", "outfit"].includes(r.action) &&
        (!type || r.action === type),
    )
    .map((r) => ({
      id: r.id,
      type: r.action,
      title: r.action === "repair" ? "照片精修" : "照片换装",
      ready: !!r.output,
      createdAt: r.createdAt,
    }));
  const electronic = type
    ? []
    : (getStore("orderCenter")?.electronic || [])
        .filter(
          (r) =>
            r.owner === owner &&
            !r.fixture &&
            r.status === "paid" &&
            !r.savedId,
        )
        .map((r) => ({
          id: r.id,
          type: "electronic",
          title: r.versionName || "电子证件照",
          ready: true,
          createdAt: r.createdAt,
        }));
  return [...tools, ...electronic].sort((a, b) => b.createdAt - a.createdAt);
}
const saving = new Set();
export async function savePurchasedElectronic(id) {
  const owner = getStore("account")?.session?.phone;
  if (!owner || saving.has(id)) return;
  saving.add(id);
  try {
    const receipt = (await readElectronicOrders()).find(
      (r) =>
        r.id === id && r.owner === owner && r.status === "paid" && !r.fixture,
    );
    if (!receipt || !receipt.photo?.blob)
      throw Error("照片暂时无法读取，请稍后重试。");
    if (receipt.savedId) return receipt.savedId;
    const library = getStore("photoLibrary");
    if (!library.ready || library.busy)
      throw Error("相册暂时不可用，请稍后重试。");
    const session = receipt.sessionId
      ? await readCameraSession(receipt.sessionId)
      : null;
    const image = await uploadedPhoto(receipt.photo.blob);
    if (owner !== getStore("account")?.session?.phone)
      throw Error("登录状态已变化，请重新查看相册。");
    const photoId = receipt.sessionId
      ? "made-" + receipt.sessionId
      : "recovered-" + id;
    const record = {
      ...image,
      id: photoId,
      name: `${receipt.versionName || "电子证件照"}-${id.slice(-8)}.${image.type === "image/png" ? "png" : "jpg"}`,
      spec: receipt.specification || "",
      origin: "made",
      orderId: id,
      versionId: receipt.versionId,
      versionName: receipt.versionName,
      rawBlob: session?.photo?.blob || receipt.photo.blob,
    };
    const next = library.snapshot();
    if (!next.finished.some((r) => r.id === photoId))
      next.finished.unshift(record);
    await library.commit(next);
    await updateElectronicReceipt(id, owner, "paid", { savedId: photoId });
    await getStore("orderCenter").refresh();
    return photoId;
  } finally {
    saving.delete(id);
  }
}
