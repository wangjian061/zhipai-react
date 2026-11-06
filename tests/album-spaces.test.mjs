import assert from "node:assert/strict";
import test from "node:test";
import { database } from "./helpers/memory-indexeddb.mjs";
import { registerStore, getStore } from "../src/runtime/state.js";
import { albumDate, captureDayAt } from "../src/domain/photo-date.js";
import { readAlbumState, writeAlbumState } from "../src/domain/album.js";
import {
  readArchive,
  updateArchive,
  addDocument,
  deleteDocumentSide,
  appendFamilyPhotos,
  newMember,
  archivePath,
  importArchiveImage,
  copyFinishedForMember,
} from "../src/domain/album-spaces.js";

test("one account can keep namesakes, family photos and two-sided documents without changing the finished library", async () => {
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
    addDocument(state, "identity", first.id, image, image),
  );
  await updateArchive("a", (state) =>
    addDocument(state, "medical", "", image, null),
  );
  await assert.rejects(
    updateArchive("a", (state) =>
      addDocument(state, "identity", "unknown", image, null),
    ),
    /持有人/,
  );
  const saved = await readArchive("a");
  assert.deepEqual(
    saved.members.map((m) => m.photos.length),
    [1, 0],
  );
  assert.equal(saved.documents.length, 2);
  const id = saved.documents.find((d) => d.type === "identity");
  assert.equal(id.holderId, first.id);
  assert.ok(id.front.blob.size && id.back.blob.size);
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
    addDocument(state,"medical","named",image);
  });
  const archive=await readArchive(owner);
  assert.equal(archive.members[0].name,"李佳芮");
  assert.equal(archive.members[1].name,"妈妈");
  assert.equal(archive.members[0].photos[0].id,"kept-photo");
  assert.equal(archive.documents[0].holderId,"named");
  await updateArchive(owner,state=>state.members.push(newMember("小雨")));
  const saved=await readArchive(owner);
  assert.equal(saved.documents[0].holderId,"named");
  assert.equal(saved.members[1].id,"legacy");
  assert.equal(saved.members[2].relation,undefined);
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

test("document deletion is transactional, preserves the other image, and guards stale confirmations", async () => {
  globalThis.indexedDB = database();
  registerStore("account", {session:{phone:"document-owner"}});
  const owner="document-owner";
  const image=id=>({id,blob:new Blob([id],{type:"image/png"})});
  await updateArchive(owner,state=>addDocument(state,"identity","",image("front"),image("back")));
  let snapshot=(await readArchive(owner)).documents[0];
  await updateArchive(owner,state=>deleteDocumentSide(state,snapshot,"front"));
  let row=(await readArchive(owner)).documents[0];
  assert.equal(row.front,null);
  assert.equal(row.back.id,"back");
  assert.equal(row.id,snapshot.id);
  await assert.rejects(updateArchive(owner,state=>deleteDocumentSide(state,snapshot)),/已变化/);
  snapshot=row;
  // A record changed elsewhere must invalidate the old deletion snapshot.
  await updateArchive(owner,state=>{state.documents.find(d=>d.id===snapshot.id).front=image("replacement");});
  await assert.rejects(updateArchive(owner,state=>deleteDocumentSide(state,snapshot,"back")),/已变化/);
  row=(await readArchive(owner)).documents[0];
  assert.equal(row.front.id,"replacement");
  assert.equal(row.back.id,"back");
  snapshot=row;
  await updateArchive(owner,state=>deleteDocumentSide(state,snapshot,"back"));
  snapshot=(await readArchive(owner)).documents[0];
  await updateArchive(owner,state=>deleteDocumentSide(state,snapshot,"front"));
  assert.equal((await readArchive(owner)).documents.length,0);
  await updateArchive(owner,state=>addDocument(state,"medical","",image("medical")));
  snapshot=(await readArchive(owner)).documents[0];
  await assert.rejects(updateArchive(owner,state=>deleteDocumentSide(state,snapshot,"back")),/已不存在/);
  await updateArchive(owner,state=>deleteDocumentSide(state,snapshot));
  assert.equal((await readArchive(owner)).documents.length,0);
});
