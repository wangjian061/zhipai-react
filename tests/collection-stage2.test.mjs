// Product-state and SSR checks only; no browser or device automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  createMessageHistory,
  shouldPushCollectionResult,
} from "../src/domain/collection-messages.js";
import { createServiceContent } from "../src/domain/collection-service-content.js";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
};
const project = {
  id: "enrollment",
  name: "示例新生采集",
  requiresUpload: false,
};
const record = (status, extra = {}) => ({
  id: "one",
  owner: "13800008000",
  projectId: project.id,
  status,
  updatedAt: 1,
  ...extra,
});
test("only five confirmed results produce history and upload-dependent completion is quiet", () => {
  for (const status of [
    "pending",
    "processing",
    "draft",
    "reviewing",
    "unknown",
  ]) {
    const history = createMessageHistory(memory());
    history.sync("a", [record(status)], [project]);
    assert.equal(history.items.length, 0);
    assert.equal(shouldPushCollectionResult(status, false), false);
  }
  for (const status of [
    "processing_failed",
    "rejected",
    "complete",
    "uploaded",
    "upload_failed",
  ]) {
    const history = createMessageHistory(memory());
    history.sync("a", [record(status)], [project]);
    assert.equal(history.items.length, 1);
    assert.equal(
      history.reminders.length,
      0,
      "history sync must not replay pushes",
    );
  }
  assert.equal(shouldPushCollectionResult("complete", true), false);
  assert.equal(shouldPushCollectionResult("complete", false), true);
  assert.equal(shouldPushCollectionResult("uploaded", true), true);
});
test("dedupe, new attempts, superseded queued reminders and persistent read history", () => {
  const storage = memory(),
    history = createMessageHistory(storage);
  const sync = (r) => history.sync("a", [r], [project]);
  sync(record("reviewing"));
  sync(record("rejected", { updatedAt: 2 }));
  const old = history.items[0];
  assert.equal(history.hasUnreadFor("a"), true);
  assert.equal(history.hasUnreadFor("b"), false);
  assert.equal(history.hasUnreadFor(""), false);
  assert.equal(history.reminders.length, 1);
  sync(record("rejected", { updatedAt: 3 }));
  assert.equal(history.items.length, 1, "refreshing does not make new result");
  sync(record("reviewing", { submittedAt: 4 }));
  assert.equal(history.reminders.length, 0);
  sync(record("rejected", { submittedAt: 4, updatedAt: 5 }));
  sync(record("complete", { submittedAt: 6, updatedAt: 7 }));
  assert.equal(history.items.length, 3);
  assert.equal(old.status, "rejected");
  history.markRead(old.id);
  const reloaded = createMessageHistory(storage);
  reloaded.sync(
    "a",
    [record("complete", { submittedAt: 6, updatedAt: 7 })],
    [project],
  );
  assert.equal(reloaded.items.length, 3);
  assert.equal(reloaded.items.find((n) => n.id === old.id).read, true);
  assert.equal(reloaded.reminders.length, 0);
  assert.equal(reloaded.hasUnreadFor("a"), true);
  for (const item of reloaded.items) reloaded.markRead(item.id);
  assert.equal(reloaded.hasUnreadFor("a"), false);
  reloaded.sync("b", [], [project]);
  assert.equal(reloaded.items.length, 0);
  reloaded.sync("", [], [project]);
  assert.equal(reloaded.items.length, 0);
});
test("read/write failure does not erase history or falsely mark a message read", () => {
  const storage = memory(),
    history = createMessageHistory(storage);
  history.sync("a", [record("rejected")], [project]);
  storage.setItem = () => {
    throw Error("unavailable");
  };
  history.markRead(history.items[0].id);
  assert.equal(history.items[0].read, false);
  assert.match(history.error, /保存失败/);
  const broken = createMessageHistory({
    getItem() {
      throw Error("unavailable");
    },
  });
  broken.sync("a", [], []);
  assert.match(broken.error, /读取通知/);
});
test("temporary write failure retains intervening result history until storage recovers", () => {
  const storage = memory(),
    history = createMessageHistory(storage);
  history.sync("a", [record("reviewing")], [project]);
  const save = storage.setItem;
  storage.setItem = () => {
    throw Error("offline storage");
  };
  history.sync("a", [record("complete", { updatedAt: 2 })], [project]);
  history.sync("a", [record("upload_failed", { updatedAt: 3 })], [project]);
  assert.equal(history.items.length, 2);
  storage.setItem = save;
  history.retry();
  const restored = createMessageHistory(storage);
  restored.sync("a", [record("upload_failed", { updatedAt: 3 })], [project]);
  assert.equal(restored.items.length, 2);
  assert.equal(restored.error, "");
});

const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "zhipai-stage2-ssr-"));
const server = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
await server.ssrLoadModule("/src/domain/collection.js");
const { createDetachedController, observable } = await server.ssrLoadModule(
  "/src/runtime/state.js",
);
const { default: Services } = await server.ssrLoadModule(
  "/src/components/CollectionServices.jsx",
);
const { default: Support } = await server.ssrLoadModule(
  "/src/components/CollectionSupportDrawer.jsx",
);
const { default: Announcement } = await server.ssrLoadModule(
  "/src/components/CollectionAnnouncement.jsx",
);
const { resolveWorkbenchContext } = await server.ssrLoadModule(
  "/src/workbench/context.js",
);
function controller(records) {
  return createDetachedController("collectionFlow", {
    $store: {
      account: { session: { phone: "13800008000" }, loggedIn: true },
      collectionRecords: {
        ready: true,
        items: records,
        error: "",
        busy: false,
      },
      collectionMessages: observable(createMessageHistory(memory())),
    },
    $refs: {},
    $nextTick: (fn) => fn(),
    page: "collection",
    view: "notifications",
    showNotice(text) {
      this.notice = text;
    },
    route(view, projectId, recordId, context) {
      this.view = view;
      this.projectId = projectId;
      this.recordId = recordId;
      this.messageId = context?.message || "";
    },
  });
}
test("normal notification route resolves latest task and only successful open marks read", () => {
  const s = controller([record("rejected")]);
  s.syncMessages();
  const n = s.notifications.find((item) => item.type === "collection");
  s.recordsStore.items = [record("complete", { updatedAt: 2 })];
  s.syncMessages();
  s.openNotification(n);
  assert.equal(s.view, "complete");
  assert.equal(s.current.status, "complete");
  assert.equal(s.sourceMessage.read, false);
  s.markNotificationViewed();
  assert.equal(s.sourceMessage.read, true);
  const missing = s.notifications.find(
    (item) => !item.read && item.type === "collection",
  );
  s.recordsStore.items = [];
  s.openNotification(missing);
  assert.match(s.notice, /暂时无法查看/);
  assert.equal(
    s.messageStore.items.find((item) => item.id === missing.id).read,
    false,
  );
});
test("normal announcements have full body, preserve message reference and resolve own left document", () => {
  const s = controller([]);
  s.syncMessages();
  const n = s.notifications.find((item) => item.type === "project");
  s.openNotification(n);
  assert.equal(s.view, "announcement");
  s.markNotificationViewed();
  assert.equal(s.sourceMessage.read, true);
  const html = renderToStaticMarkup(
    React.createElement(Announcement, { scope: s }),
  );
  assert.match(html, /通知详情/);
  assert.match(html, /查看项目/);
  assert.equal(
    resolveWorkbenchContext("?page=collection&view=announcement", {
      collectionFlow: s,
    }).guide,
    "notification.detail",
  );
});
test("nine helps and contact work without ready personal records; shared drawer handles missing email", () => {
  const s = controller([]);
  s.view = "services";
  s.recordsStore.ready = false;
  const content = createServiceContent();
  assert.equal(content.questions.length, 9);
  const tutorial = content.questions.find((q) => q.id === "chsi");
  assert.equal(tutorial.url, "https://www.zhipai.com.cn/h5/bystxcj.html");
  assert.equal(tutorial.steps.length, 0);
  assert.equal(tutorial.body, "");
  const previous = globalThis.document;
  globalThis.document = { activeElement: null };
  try {
    s.openHelp("upload");
    assert.equal(s.panel, "serviceHelp");
  } finally {
    globalThis.document = previous;
  }
  let html = renderToStaticMarkup(React.createElement(Support, { scope: s }));
  assert.match(html, /不根据上网失败自行重复采集/);
  s.panel = "email";
  html = renderToStaticMarkup(React.createElement(Support, { scope: s }));
  assert.match(html, /没有采集任务也可以咨询/);
  assert.match(html, /复制邮箱/);
  assert.match(html, /mailto:zpai_service/);
  s.serviceContent.email = "invalid";
  html = renderToStaticMarkup(React.createElement(Support, { scope: s }));
  assert.match(html, /重新读取/);
  assert.ok(!html.includes("mailto:"));
  s.panel = null;
  html = renderToStaticMarkup(React.createElement(Services, { scope: s }));
  assert.equal((html.match(/aria-haspopup="dialog"/g) || []).length, 8);
  assert.match(html, /href="https:\/\/www.zhipai.com.cn\/h5\/bystxcj.html"/);
  assert.ok(html.indexOf("联系知拍客服") < html.indexOf("采集帮助</h2>"));
});
