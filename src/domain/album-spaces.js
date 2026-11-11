import { albumPhotoId, openAlbumDatabase, uploadedPhoto } from "./album.js";
import { photoCaptureDate } from "./photo-date.js";
import { decodePhotoBlob } from "./photo-readability.js";
import { getStore, registerStore } from "../runtime/state.js";

registerStore("albumSpacesUi", { opened: false });

const legacyDocumentNames = new Map([
  ["identity", "身份证"],
  ["medical", "医保卡"],
  ["licence", "驾驶证"],
  ["passport", "护照"],
  ["other", "其它证件"],
]);
export const SELF_DOCUMENT_ALBUM = "self";
export const DOCUMENT_NAME_LIMIT = 30;

export function archivePath(space, fields = {}) {
  const q = new URLSearchParams({ page: "album" });
  if (space === "family" || space === "documents") q.set("space", space);
  for (const field of ["member", "group", "item", "doctype", "sheet"])
    if (fields[field]) q.set(field, fields[field]);
  return "/?" + q;
}

export function navigateArchive(path, replace = false) {
  const from = location.pathname + location.search;
  if (from === path) return;
  history[replace ? "replaceState" : "pushState"](
    replace ? {} : {
      albumSpaceParent: from,
      albumSpaceTrail: [...(history.state?.albumSpaceTrail || []), from],
    },
    "",
    path,
  );
  window.dispatchEvent(new Event("zhipai-route"));
}
export function backInArchive(parent) {
  const trail = history.state?.albumSpaceTrail || [];
  const ancestor = trail.lastIndexOf(parent);
  if (history.state?.albumSpaceParent === parent && history.length > 1)
    history.back();
  else if (ancestor >= 0 && trail.length - ancestor < history.length)
    history.go(ancestor - trail.length);
  else navigateArchive(parent, true);
}

function requireOwner(owner) {
  if (!owner || getStore("account")?.session?.phone !== owner)
    throw new Error("请登录后查看本人的相册。");
}
function normalizeDocumentGroup(record) {
  if (Array.isArray(record.photos)) {
    const name = typeof record.name === "string" && record.name ? record.name : "证件";
    // Older records did not track whether the name was entered or generated.
    const normalized = record.customName ? name : name.replace(/^照片组( \d+)?$/, "证件$1");
    return normalized === record.name ? record : { ...record, name: normalized };
  }
  const { front, back, ...group } = record;
  const photos = [];
  for (const [side, photo] of [["front", front], ["back", back]]) {
    if (!photo) continue;
    const id = photo.id && !photos.some((item) => item.id === photo.id)
      ? photo.id : group.id + "-" + side;
    photos.push({ ...photo, id });
  }
  return { ...group, holderId: group.holderId || "", name: legacyDocumentNames.get(group.type) || "证件", photos };
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
    documents: record.documents.map(normalizeDocumentGroup),
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

function familyMemberName(name) {
  const label = typeof name === "string" ? name.trim() : "";
  if (!label) throw new Error("请填写称呼。");
  if (label.length > 30) throw new Error("称呼最多填写30个字。");
  return label;
}
export function newMember(name) {
  const label = familyMemberName(name);
  return {
    id: albumPhotoId(),
    name: label,
    photos: [],
  };
}
export function renameFamilyMember(state, memberId, name) {
  const member = state.members.find((item) => item.id === memberId);
  if (!member) throw new Error("这个家人相册已不存在。");
  member.name = familyMemberName(name);
}
export function deleteFamilyMember(state, snapshot) {
  const index = state.members.findIndex((item) => item.id === snapshot.id);
  if (index < 0) throw new Error("这个家人相册已不存在。");
  const member = state.members[index];
  if (
    member.name !== snapshot.name ||
    member.photos.length !== snapshot.photos.length ||
    member.photos.some((photo, i) => photo.id !== snapshot.photos[i].id)
  )
    throw new Error("家人相册已变化，请关闭后重新确认删除。");

  for (const document of state.documents) {
    if (document.holderId === member.id) document.holderNameSnapshot = member.name;
  }
  state.members.splice(index, 1);
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
export function documentAlbums({ members, documents }) {
  // The signed-in owner is a virtual album, outside the editable family list.
  const albums = new Map([["", {
    id: SELF_DOCUMENT_ALBUM, holderId: "", name: "本人", canCreate: true, groups: [],
  }]]);
  for (const member of members) {
    albums.set(member.id, {
      id: member.id, holderId: member.id, name: member.name, canCreate: true, groups: [],
    });
  }
  for (const group of documents) {
    if (!albums.has(group.holderId)) {
      albums.set(group.holderId, {
        id: group.holderId, holderId: group.holderId,
        name: group.holderNameSnapshot || "家人", canCreate: false, groups: [],
      });
    }
    albums.get(group.holderId).groups.push(group);
  }
  return Array.from(albums.values());
}

function documentName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length > DOCUMENT_NAME_LIMIT) throw new Error("证件名称最多填写30个字。");
  return name;
}
function groupPhotos(photos) {
  if (!photos.length || photos.some((photo) => !(photo?.blob instanceof Blob) || !photo.blob.size))
    throw new Error("请添加可用的照片。");
  return photos.map((photo) => ({ ...photo, id: albumPhotoId() }));
}
export function addDocumentGroup(state, holderId, name, photos) {
  if (holderId && !state.members.some((member) => member.id === holderId))
    throw new Error("这个家人相册已不存在。");
  const count = state.documents.filter((group) => group.holderId === holderId).length;
  const chosenName = documentName(name);
  const group = {
    id: albumPhotoId(),
    holderId,
    name: chosenName || "证件 " + (count + 1),
    customName: Boolean(chosenName),
    photos: groupPhotos(photos),
  };
  state.documents.unshift(group);
  return group;
}

// Check the whole group in the write transaction, including concurrent additions.
function currentDocumentGroup(state, snapshot) {
  const group = state.documents.find((item) => item.id === snapshot?.id);
  if (!group || group.holderId !== snapshot.holderId || group.name !== snapshot.name ||
      group.photos.length !== snapshot.photos.length ||
      group.photos.some((photo, index) => photo.id !== snapshot.photos[index].id))
    throw new Error("证件已变化，请关闭后重新打开再操作。");
  return group;
}
function documentPhotoIndex(group, photoId) {
  const index = group.photos.findIndex((photo) => photo.id === photoId);
  if (index < 0) throw new Error("照片已不存在，请重新打开这份证件。");
  return index;
}
export function appendDocumentGroupPhotos(state, snapshot, photos) {
  const group = currentDocumentGroup(state, snapshot);
  group.photos.push(...groupPhotos(photos));
}
export function renameDocumentGroup(state, snapshot, name) {
  const group = currentDocumentGroup(state, snapshot);
  const chosenName = documentName(name);
  if (chosenName) {
    group.name = chosenName;
    group.customName = true;
  }
}
export function replaceDocumentPhoto(state, snapshot, photoId, photo) {
  const group = currentDocumentGroup(state, snapshot);
  const index = documentPhotoIndex(group, photoId);
  const [replacement] = groupPhotos([photo]);
  group.photos[index] = replacement;
}
export function deleteDocumentPhotos(state, snapshot, photoId) {
  const group = currentDocumentGroup(state, snapshot);
  if (photoId) group.photos.splice(documentPhotoIndex(group, photoId), 1);
  if (!photoId || !group.photos.length)
    state.documents = state.documents.filter((item) => item.id !== group.id);
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
