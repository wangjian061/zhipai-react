import { albumPhotoId, openAlbumDatabase, uploadedPhoto } from "./album.js";
import { photoCaptureDate } from "./photo-date.js";
import { decodePhotoBlob } from "./photo-readability.js";
import { getStore, registerStore } from "../runtime/state.js";

registerStore("albumSpacesUi", { opened: false });

export const DOCUMENT_TYPES = [
  { id: "identity", name: "身份证", icon: "identity", front: "人像面", back: "国徽面" },
  { id: "medical", name: "医保卡", icon: "medical", front: "正面" },
  { id: "licence", name: "驾驶证", icon: "driver", front: "正面" },
  { id: "passport", name: "护照", icon: "passport", front: "资料页" },
  { id: "other", name: "其它证件", icon: "document", front: "证件图片" },
];

export function archivePath(space, fields = {}) {
  const q = new URLSearchParams({ page: "album" });
  if (space === "family" || space === "documents") q.set("space", space);
  for (const field of ["member", "item", "doctype", "sheet"])
    if (fields[field]) q.set(field, fields[field]);
  return "/?" + q;
}

export function navigateArchive(path, replace = false) {
  const from = location.pathname + location.search;
  if (from === path) return;
  history[replace ? "replaceState" : "pushState"](
    replace ? {} : { albumSpaceParent: from },
    "",
    path,
  );
  window.dispatchEvent(new Event("zhipai-route"));
}
export function backInArchive(parent) {
  if (history.state?.albumSpaceParent === parent && history.length > 1)
    history.back();
  else navigateArchive(parent, true);
}

function requireOwner(owner) {
  if (!owner || getStore("account")?.session?.phone !== owner)
    throw new Error("请登录后查看本人的相册。");
}
function archiveData(record) {
  if (record === undefined) return { members: [], documents: [] };
  if (
    !Array.isArray(record?.documents) ||
    !Array.isArray(record?.members) ||
    !record.members.every((member) => Array.isArray(member?.photos))
  )
    throw new Error("相册资料无法读取。");
  return {
    ...record,
    members: record.members.map((member) => ({
      ...member,
      // Keep existing identities and associations; old relationship-only names remain usable.
      name: member.name?.trim() || member.relation?.trim() || "未命名家人",
    })),
  };
}
export async function readArchive(owner) {
  requireOwner(owner);
  const db = await openAlbumDatabase();
  requireOwner(owner);
  return new Promise((resolve, reject) => {
    const req = db
      .transaction("library")
      .objectStore("library")
      .get("archive:" + owner);
    req.onsuccess = () => {
      try {
        requireOwner(owner);
        resolve(archiveData(req.result));
      } catch (error) {
        reject(error);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// Read, validate and write the latest version in one transaction, including across tabs.
export async function updateArchive(owner, mutate) {
  requireOwner(owner);
  const db = await openAlbumDatabase();
  requireOwner(owner);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("library", "readwrite");
    const store = tx.objectStore("library"),
      key = "archive:" + owner;
    const req = store.get(key);
    let state, failure;
    req.onsuccess = () => {
      try {
        requireOwner(owner);
        state = archiveData(req.result);
        mutate(state);
        store.put(state, key);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(state);
    tx.onabort = () =>
      reject(failure || tx.error || new Error("未能保存，请重试。"));
  });
}

export function newMember(name) {
  const label = typeof name === "string" ? name.trim() : "";
  if (!label) throw new Error("请填写称呼。");
  if (label.length > 30) throw new Error("称呼最多填写30个字。");
  return {
    id: albumPhotoId(),
    name: label,
    photos: [],
  };
}
export function appendFamilyPhotos(state, memberId, photos) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) throw new Error("这个家人相册已不存在。");
  member.photos.unshift(...photos);
}
export function deleteFamilyPhoto(state, memberId, photoId) {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) throw new Error("这个家人相册已不存在。");
  // Each member owns a copy. Removing it never removes the source library photo.
  member.photos = member.photos.filter((photo) => photo.id !== photoId);
}
export function addDocument(state, type, holderId, front, back) {
  const spec = DOCUMENT_TYPES.find((t) => t.id === type);
  if (!spec || !front?.blob) throw new Error("请添加证件图片。");
  if (holderId && !state.members.some((m) => m.id === holderId))
    throw new Error("请选择有效的持有人。");
  const item = {
    id: albumPhotoId(),
    type,
    holderId,
    front,
    back: spec.back ? back : null,
  };
  state.documents.unshift(item);
  return item;
}
// Validate the full snapshot inside the write transaction so a stale last-side
// confirmation cannot delete a document whose other side changed in another tab.
function currentDocument(state, snapshot) {
  const row = state.documents.find(item => item.id === snapshot.id);
  if (!row || row.type !== snapshot.type || row.holderId !== snapshot.holderId ||
      ["front", "back"].some(side => (row[side]?.id || null) !== (snapshot[side]?.id || null)))
    throw new Error("证件已变化，请关闭后重新打开，再执行操作。");
  return row;
}
export function deleteDocumentSide(state, snapshot, side = null) {
  const row = currentDocument(state, snapshot);
  if (side !== null) {
    if (!["front", "back"].includes(side) || !row[side])
      throw new Error("这面的图片已不存在，请重新打开证件。");
    row[side] = null;
  }
  if (side === null || (!row.front && !row.back))
    state.documents = state.documents.filter(item => item.id !== row.id);
}

export async function importArchiveImage(file) {
  if (
    !file?.size ||
    file.size > 30 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("请选择 30 MB 以内的 JPG、PNG 或 WebP 图片。");
  const photo = await uploadedPhoto(file);
  return { ...photo, addedAt: photo.createdAt };
}

export async function copyFinishedForMember(photo) {
  if (!photo?.blob?.size) throw new Error("这张照片暂不可用，请重新选择。");
  const image = await decodePhotoBlob(photo.blob);
  const captureDate = await photoCaptureDate(photo);
  const current = getStore("photoLibrary").finished.find(item => item.id === photo.id);
  if (current?.blob !== photo.blob) throw new Error("照片已变化，请重新选择。");
  return {
    id: albumPhotoId(), sourceId: photo.id, name: photo.name, blob: photo.blob,
    width: image.naturalWidth, height: image.naturalHeight, type: photo.blob.type,
    size: photo.blob.size, captureDate, addedAt: Date.now(),
  };
}
