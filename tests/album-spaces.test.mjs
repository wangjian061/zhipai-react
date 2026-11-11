import assert from "node:assert/strict";
import test from "node:test";
import { database } from "./helpers/memory-indexeddb.mjs";
import { registerStore, getStore } from "../src/runtime/state.js";
import { albumDate, captureDayAt } from "../src/domain/photo-date.js";
import { readAlbumState, writeAlbumState } from "../src/domain/album.js";
import {
  readArchive,
  updateArchive,
  addDocumentGroup,
  appendDocumentGroupPhotos,
  renameDocumentGroup,
  replaceDocumentPhoto,
  deleteDocumentPhotos,
  documentAlbums,
  appendFamilyPhotos,
  newMember,
  renameFamilyMember,
  deleteFamilyMember,
  archivePath,
  importArchiveImage,
  copyFinishedForMember,
} from "../src/domain/album-spaces.js";

test("one account can keep namesakes, family photos and named documents without changing the finished library", async () => {
  globalThis.indexedDB = database();
  registerStore("account", { session: { phone: "a" } });
  await writeAlbumState({ finished: [{ id: "old-photo" }] });
  const first = newMember("小雨"),
    second = newMember("小雨");
  assert.notEqual(first.id, second.id);
  const image = {
    id: "portrait",
    blob: new Blob(["image"], { type: "image/png" }),
    addedAt: 12345,
  };
  await updateArchive("a", (state) => state.members.push(first, second));
  await updateArchive("a", (state) =>
    appendFamilyPhotos(state, first.id, [image]),
  );
  await updateArchive("a", (state) =>
    addDocumentGroup(state, first.id, " 身份证 ", [image, image]),
  );
  await updateArchive("a", (state) =>
    addDocumentGroup(state, "", "", [image]),
  );
  await assert.rejects(
    updateArchive("a", (state) =>
      addDocumentGroup(state, "unknown", "身份证", [image]),
    ),
    /相册已不存在/,
  );
  const saved = await readArchive("a");
  assert.deepEqual(
    saved.members.map((m) => m.photos.length),
    [1, 0],
  );
  assert.equal(saved.documents.length, 2);
  const id = saved.documents.find((d) => d.name === "身份证");
  assert.equal(id.holderId, first.id);
  assert.equal(new Set(id.photos.map((photo) => photo.id)).size, 2);
  assert.ok(id.photos.every((photo) => photo.blob.size && !("archiveName" in photo)));
  assert.equal(saved.documents[0].name, "证件 1");
  assert.equal((await readAlbumState()).finished[0].id, "old-photo");
  getStore("account").session = { phone: "b" };
  assert.deepEqual(await readArchive("b"), { members: [], documents: [] });
  await assert.rejects(readArchive("a"), /登录/);
  await assert.rejects(
    updateArchive("a", (state) => state.members.pop()),
    /登录/,
  );
  getStore("account").session = { phone: "a" };
  assert.equal((await readArchive("a")).members.length, 2);
});
test("dates distinguish the original day from addition and never invent unknown dates", () => {
  const ts = new Date(2026, 10, 5, 9).getTime();
  assert.equal(
    albumDate({ captureDate: "2025-04-03", addedAt: ts }).label,
    "2025/04/03",
  );
  assert.equal(
    albumDate({ addedAt: ts }).label,
    captureDayAt(ts).replaceAll("-", "/"),
  );
  assert.equal(albumDate({ addedAt: ts }).kind, "添加日期");
  assert.equal(albumDate({ captureDate: "2025-04-03", addedAt: ts }).kind, "拍摄日期");
  assert.equal(albumDate({ createdAt: ts }), null);
  assert.equal(albumDate({}), null);
  assert.equal(
    archivePath("documents", { doctype: "identity", item: "xyz" }),
    "/?page=album&space=documents&item=xyz&doctype=identity",
  );
});
test("invalid family images and empty names are rejected before saving", async () => {
  assert.throws(() => newMember(" "), /称呼/);
  assert.throws(() => newMember("雨".repeat(31)), /30/);
  assert.equal(newMember(" 妈妈 ").name,"妈妈");
  await assert.rejects(
    importArchiveImage(new File(["no"], "x.txt", { type: "text/plain" })),
    /JPG/,
  );
});

test("existing family names and legacy relationship fallback retain photo and document associations", async () => {
  globalThis.indexedDB = database();
  registerStore("account", {session:{phone:"legacy-family"}});
  const owner="legacy-family";
  const image={id:"kept-photo",blob:new Blob(["photo"],{type:"image/png"})};
  await updateArchive(owner,state=>{
    state.members.push({id:"named",name:"李佳芮",relation:"爸爸",photos:[image]});
    state.members.push({id:"legacy",relation:"妈妈",photos:[]});
    state.documents.push({ id:"legacy-card", type:"medical", holderId:"named", front:image });
  });
  const archive=await readArchive(owner);
  assert.equal(archive.members[0].name,"李佳芮");
  assert.equal(archive.members[1].name,"妈妈");
  assert.equal(archive.members[0].photos[0].id,"kept-photo");
  assert.equal(archive.documents[0].holderId,"named");
  assert.equal(archive.documents[0].name, "医保卡");
  assert.equal(archive.documents[0].photos[0].id, image.id);
  assert.equal(await archive.documents[0].photos[0].blob.text(), "photo");
  await updateArchive(owner,state=>state.members.push(newMember("小雨")));
  const saved=await readArchive(owner);
  assert.equal(saved.documents[0].holderId,"named");
  assert.equal(saved.members[1].id,"legacy");
  assert.equal(saved.members[2].relation,undefined);
});

test("family management keeps source photos and holder identity, and rejects stale deletion confirmation", async () => {
  globalThis.indexedDB = database();
  const owner = "family-manager";
  registerStore("account", { session: { phone: owner } });
  const first = newMember("妈妈");
  const other = newMember("小雨");
  const original = { id: "original", blob: new Blob(["photo"], { type: "image/png" }) };
  const copy = { ...original, id: "first-copy", sourceId: original.id };
  const otherCopy = { ...copy, id: "other-copy" };
  await writeAlbumState({ finished: [original] });
  await updateArchive(owner, (state) => {
    state.members.push(first, other);
    appendFamilyPhotos(state, first.id, [copy]);
    appendFamilyPhotos(state, other.id, [otherCopy]);
    state.documents.push({ id: "legacy-id", type: "identity", holderId: first.id, front: original, back: original });
  });
  await assert.rejects(
    updateArchive(owner, (state) => renameFamilyMember(state, first.id, " ")),
    /称呼/,
  );
  const renamed = await updateArchive(owner, (state) =>
    renameFamilyMember(state, first.id, " 妈咪 "),
  );
  const snapshot = renamed.members[0];
  assert.equal(snapshot.id, first.id);
  assert.equal(snapshot.name, "妈咪");
  assert.equal(renamed.documents[0].holderId, first.id);
  await updateArchive(owner, (state) =>
    appendFamilyPhotos(state, first.id, [{ ...copy, id: "new-copy" }]),
  );
  await assert.rejects(
    updateArchive(owner, (state) => deleteFamilyMember(state, snapshot)),
    /家人相册已变化/,
  );
  const latest = await readArchive(owner);
  assert.equal(latest.members[0].photos.length, 2);
  assert.equal(latest.documents[0].holderNameSnapshot, undefined);
  await updateArchive(owner, (state) => deleteFamilyMember(state, latest.members[0]));
  const saved = await readArchive(owner);
  assert.deepEqual(saved.members.map((m) => m.id), [other.id]);
  assert.equal(saved.members[0].photos[0].id, otherCopy.id);
  assert.equal(saved.documents[0].holderId, first.id);
  assert.equal(saved.documents[0].holderNameSnapshot, "妈咪");
  assert.equal(saved.documents[0].name, "身份证");
  assert.equal(new Set(saved.documents[0].photos.map((photo) => photo.id)).size, 2);
  assert.deepEqual(await Promise.all(saved.documents[0].photos.map((photo) => photo.blob.text())), ["photo", "photo"]);
  const preserved = documentAlbums(saved).find((entry) => entry.id === first.id);
  assert.equal(preserved.name, "妈咪");
  assert.equal(preserved.canCreate, false);
  assert.equal((await readAlbumState()).finished[0].id, original.id);
});

test("the shared library can supply two independent member copies without losing the original capture day", async t => {
  const original = { id:"original", name:"旧照片", captureDate:"2022-10-02", blob:new Blob(["photo"],{type:"image/jpeg"}) };
  const previous = globalThis.Image;
  t.after(() => {globalThis.Image = previous;});
  globalThis.Image = class { naturalWidth=40; naturalHeight=60; async decode(){} };
  registerStore("photoLibrary", {finished:[original]});
  const people = [newMember("甲"), newMember("乙")];
  for (const member of people) {
    appendFamilyPhotos({members:people},member.id,[await copyFinishedForMember(original)]);
  }
  assert.notEqual(people[0].photos[0].id, people[1].photos[0].id);
  for (const member of people) {
    const p=member.photos[0];
    assert.equal(p.sourceId,original.id);
    assert.equal(p.captureDate,original.captureDate);
    assert.equal(p.blob,original.blob);
    assert.ok(p.addedAt);
  }
  assert.equal(getStore("photoLibrary").finished.length,1);
  getStore("photoLibrary").finished=[];
  await assert.rejects(copyFinishedForMember(original),/重新选择/);
  await assert.rejects(copyFinishedForMember(null),/暂不可用/);
});

test("ordinary camera capture keeps the native framing and the shutter date without creating an album record", async t => {
  const {captureCameraPhoto} = await import("../src/domain/camera.js");
  const old=globalThis.document;
  t.after(()=>{globalThis.document=old;});
  const video={videoWidth:640,videoHeight:480};
  const canvas={
    getContext:()=>({drawImage:(source,x,y)=>assert.deepEqual([source,x,y],[video,0,0])}),
    toBlob:cb=>cb(new Blob(["frame"],{type:"image/jpeg"})),
  };
  globalThis.document={createElement:()=>canvas};
  await assert.rejects(captureCameraPhoto({videoWidth:0}),/尚未就绪/);
  const capture=await captureCameraPhoto(video);
  assert.deepEqual([capture.width,capture.height],[640,480]);
  assert.equal(capture.captureDate,captureDayAt(capture.createdAt));
  assert.equal(capture.addedAt,undefined);
});

test("documents have one name and support atomic append, replacement and deletion", async () => {
  globalThis.indexedDB = database();
  const owner = "document-owner";
  registerStore("account", { session: { phone: owner } });
  const image = (content) => ({ blob: new Blob([content], { type: "image/png" }) });
  await updateArchive(owner, (state) => {
    addDocumentGroup(state, "", "旅行资料", [image("封面")]);
    addDocumentGroup(state, "", "身份证", [image("人像面"), image("国徽面")]);
  });
  const archive = await readArchive(owner);
  assert.equal(documentAlbums(archive)[0].groups.length, 2);
  const [original, other] = archive.documents;
  const [front, back] = original.photos;
  await assert.rejects(updateArchive(owner, (state) =>
    appendDocumentGroupPhotos(state, original, [image("新图"), { blob: new Blob() }]),
  ), /可用的照片/);
  assert.equal((await readArchive(owner)).documents[0].photos.length, 2);

  let [current] = (await updateArchive(owner, (state) =>
    appendDocumentGroupPhotos(state, original, [image("补充资料")]),
  )).documents;
  await assert.rejects(updateArchive(owner, (state) => deleteDocumentPhotos(state, original)), /已变化/);
  [current] = (await updateArchive(owner, (state) => {
    renameDocumentGroup(state, current, " 身份资料 ");
  })).documents;
  [current] = (await updateArchive(owner, (state) => {
    replaceDocumentPhoto(state, current, front.id, image("替换文件"));
  })).documents;
  assert.equal(current.name, "身份资料");
  assert.ok(current.photos.every((photo) => !("archiveName" in photo)));
  assert.deepEqual(await Promise.all(current.photos.map((photo) => photo.blob.text())), ["替换文件", "国徽面", "补充资料"]);
  assert.equal(current.photos[1].id, back.id);

  await updateArchive(owner, (state) => deleteDocumentPhotos(state, current, back.id));
  const after = await readArchive(owner);
  assert.deepEqual(await Promise.all(after.documents[0].photos.map((photo) => photo.blob.text())), ["替换文件", "补充资料"]);
  await updateArchive(owner, (state) => deleteDocumentPhotos(state, other, other.photos[0].id));
  assert.deepEqual((await readArchive(owner)).documents.map((group) => group.id), [current.id]);
  await updateArchive(owner, (state) => deleteDocumentPhotos(state, after.documents[0]));
  assert.deepEqual(documentAlbums(await readArchive(owner)), [
    { id: "self", holderId: "", name: "本人", canCreate: true, groups: [] },
  ]);
});

test("legacy default document names are updated without losing names, photos or identities", async () => {
  globalThis.indexedDB = database();
  const owner = "legacy-document-names";
  registerStore("account", { session: { phone: owner } });
  const photo = { id: "original-file", archiveName: "原照片备注", blob: new Blob(["original"]) };
  await updateArchive(owner, (state) => state.documents.push(
    { id: "legacy-default", holderId: "", name: "照片组 1", photos: [photo] },
    { id: "legacy-named", holderId: "", name: "我的旧护照", photos: [photo] },
  ));
  const [automatic, named] = (await readArchive(owner)).documents;
  assert.equal(automatic.name, "证件 1");
  assert.equal(named.name, "我的旧护照");
  assert.equal(automatic.photos[0].id, photo.id);
  assert.equal(await automatic.photos[0].blob.text(), "original");
  await updateArchive(owner, (state) => renameDocumentGroup(state, named, "照片组 9"));
  const saved = (await readArchive(owner)).documents;
  assert.deepEqual(saved.map(({ id, name }) => [id, name]), [
    ["legacy-default", "证件 1"], ["legacy-named", "照片组 9"],
  ]);
  assert.equal(saved[0].photos[0].archiveName, "原照片备注");
});
