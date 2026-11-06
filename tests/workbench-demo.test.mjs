// Source/SSR/in-memory contracts only. Never opens or automates a browser.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const cacheDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "zhipai-workbench-ssr-"),
);
const server = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
const accountModule = await server.ssrLoadModule("/src/domain/account.js");
const state = await server.ssrLoadModule("/src/runtime/state.js");
const { createDemoSession, scenariosFor, GLOBAL_SCENARIOS } =
  await server.ssrLoadModule("/src/workbench/demo-sessions.js");
const { PAGE_IDS, loadPage, loadSource, resolveDocumentLink } =
  await server.ssrLoadModule("/src/workbench/documentation.js");
const { default: Markdown } = await server.ssrLoadModule(
  "/src/workbench/GuideMarkdown.jsx",
);
const { default: Host } = await server.ssrLoadModule(
  "/src/workbench/ScenarioHost.jsx",
);
const { WorkspaceContext } = await server.ssrLoadModule(
  "/src/workbench/WorkspaceContext.jsx",
);
const { default: Workbench } = await server.ssrLoadModule(
  "/src/components/PrototypeWorkbench.jsx",
);
const { default: AccountLoginFlow } = await server.ssrLoadModule(
  "/src/components/AccountLoginFlow.jsx",
);
const renderScene = (session) =>
  renderToStaticMarkup(
    React.createElement(
      WorkspaceContext.Provider,
      { value: { session } },
      React.createElement(Host),
    ),
  );

test("service scenarios use shared help/contact sheets and never expose real mail navigation", () => {
  const service = createDemoSession("service.default");
  assert.match(renderScene(service), /服务中心/);
  service.scope.openHelp("review");
  assert.equal(service.context().panel, "serviceHelp");
  assert.match(renderScene(service), /我知道了/);
  service.scope.closePanel();
  assert.equal(service.context().panel, "");
  const invalid = createDemoSession("service.no-email");
  invalid.scope.openEmailContact();
  assert.ok(!renderScene(invalid).includes("mailto:"));
  assert.match(renderScene(invalid), /重新读取/);
  const failed = createDemoSession("service.load-error");
  assert.match(renderScene(failed), /暂时无法读取帮助/);
  failed.scope.retryServiceContent();
  assert.equal(failed.scope.serviceContent.questions.length, 9);
  const mail = createDemoSession("service.mail-error");
  assert.match(renderScene(mail), /未能打开邮箱/);
  assert.equal(mail.scope.confirmEmailContact(), false);
  for (const session of [service, invalid, failed, mail]) session.dispose();
});

test("full page documents are independently loaded and complete sources remain actual repository content", async () => {
  for (const action of ["crop", "background", "format", "resize"]) {
    assert.ok(PAGE_IDS.includes(`tool.${action}.settings`));
    assert.ok(PAGE_IDS.includes(`tool.${action}.result`));
    assert.ok(!PAGE_IDS.includes(`tool.${action}.select`), "selection is part of the workspace");
  }
  const home = await loadPage("home");
  assert.equal(home.title, "首页");
  assert.deepEqual(
    home.contents.slice(0, 7).map((item) => item.label),
    ["品牌头部与通知", "专项采集卡片", "常用工具", "明信片制作", "邮票制作", "底部导航"],
  );
  assert.match(home.body, /照片换装/);
  assert.match(home.body, /照片精修/);
  assert.match(home.body, /明信片制作/);
  assert.match(home.body, /邮票制作/);
  await assert.rejects(loadPage("unmapped-page"));
  const source = "docs/product/common-tools-1.4.6.md";
  assert.equal(await loadSource(source), fs.readFileSync(source, "utf8"));
  const index = "docs/product/prototype-page-guide.md";
  assert.equal(await loadSource(index), fs.readFileSync(index, "utf8"));
  assert.equal(
    resolveDocumentLink("pages/home.md", index).document,
    "docs/product/pages/home.md",
  );
  await assert.rejects(loadSource("private-file"));
});
test("Markdown preserves tables, lists and code while never injecting repository HTML", () => {
  const text =
    "# 标题\n\n1. 第一步\n2. 第二步\n\n| 项目 | 结果 |\n| --- | --- |\n| 姓名 | 示例 |\n\n<script>alert(1)</script>\n\n[错误链接](javascript:bad)";
  const html = renderToStaticMarkup(React.createElement(Markdown, { text }));
  assert.match(html, /<ol>/);
  assert.match(html, /<table>/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
});
test("notification history and read changes are isolated, and old messages open the latest task state", () => {
  const a = createDemoSession("notice.complete"),
    b = createDemoSession("notice.complete");
  const s = a.scope;
  const old = s.messages.find((m) => m.id === "history");
  assert.equal(old.status, "rejected");
  s.openNotification(old);
  assert.equal(s.current.status, "complete");
  assert.equal(s.context, undefined);
  assert.equal(a.context().guide, "collection.detail");
  assert.equal(a.context().state, "采集完成");
  s.back();
  const result = s.messages.find((m) => m.id === "result");
  assert.equal(result.read, false);
  s.openNotification(result);
  assert.equal(result.read, true);
  assert.equal(b.scope.messages.find((m) => m.id === "result").read, false);
  a.dispose();
  b.dispose();
});
test("announcement can return, root back exits demo, and read failure retries without a false empty state", () => {
  const exits = [],
    a = createDemoSession("notice.project", (message) => exits.push(message));
  a.scope.openNotification(a.scope.messages[0]);
  assert.equal(a.context().guide, "notification.detail");
  assert.match(renderScene(a), /通知详情/);
  a.scope.back();
  a.scope.back();
  assert.equal(exits.length, 1);
  const failed = createDemoSession("notice.load-error");
  const html = renderScene(failed);
  assert.match(html, /暂时无法读取通知/);
  assert.ok(!html.includes("暂无通知"));
  failed.scope.retryNotifications();
  assert.ok(failed.scope.notificationsShown.length);
  a.dispose();
  failed.dispose();
});
test("task cause and email demo are inspectable without writing data or launching an email client", () => {
  const a = createDemoSession("notice.failed"),
    s = a.scope;
  s.openNotification(s.messages[0]);
  s.openReviewReason();
  const html = renderScene(a);
  assert.match(html, /示例审核意见/);
  assert.match(html, /未通过原因/);
  assert.match(html, /class="collection-scroll" inert=""/);
  assert.match(html, /aria-modal="false"/);
  assert.match(html, /aria-labelledby="workbench-task-drawer-title"/);
  s.closePanel();
  s.openTaskSupport();
  s.openEmailContact();
  assert.equal(s.emailLink, "#");
  assert.equal(s.confirmEmailContact(), false);
  assert.match(s.error, /不会打开真实邮件/);
  a.dispose();
});
test("notification demo restores the same list offset and source-message focus after returning", async () => {
  const a = createDemoSession("notice.default"),
    s = a.scope;
  let focused = false;
  const message = s.messages[2];
  const list = {
    scrollTop: 180,
    querySelectorAll() {
      return [
        {
          dataset: { messageId: message.type + ":" + message.id },
          focus(options) {
            focused = options.preventScroll;
          },
        },
      ];
    },
  };
  s.$refs.collectionMessageList = list;
  s.openNotification(message);
  assert.equal(s.sectionScroll.notifications, 180);
  list.scrollTop = 0;
  s.back();
  await state.nextTick();
  assert.equal(s.view, "notifications");
  assert.equal(list.scrollTop, 180);
  assert.equal(focused, true);
  a.dispose();
});
test("real and demonstration account forms retain unique label and feedback references", () => {
  const real = createDemoSession("login.new"),
    demo = createDemoSession("login.new");
  real.scope.error = demo.scope.error = "示例错误";
  const html = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(AccountLoginFlow, { scope: real.scope }),
      React.createElement(AccountLoginFlow, {
        scope: demo.scope,
        idPrefix: "workbench-account",
      }),
    ),
  );
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(html, /for="account-phone-input"/);
  assert.match(html, /for="workbench-account-phone-input"/);
  assert.match(html, /aria-describedby="workbench-account-entry-error"/);
  real.dispose();
  demo.dispose();
});
test("force update is only a session simulation; no skip control or actual installed-version mutation", () => {
  const exits = [],
    a = createDemoSession("app.update", (message) => exits.push(message));
  assert.equal(a.context().guide, "update.demo");
  assert.equal(a.context().source, "collection-notifications-1.4.6.md");
  assert.match(renderScene(a), /发现新版本/);
  assert.ok(!/稍后再说|跳过更新/.test(renderScene(a)));
  a.apply("error");
  assert.equal(a.context().state, "更新入口打开失败");
  assert.match(renderScene(a), /暂时无法打开更新入口/);
  a.apply("old");
  assert.match(renderScene(a), /尚未检测到已安装的新版本/);
  a.apply("success");
  assert.match(exits[0], /实际安装版本没有改变/);
  a.dispose();
});
test("account demos use the existing flow with memory-only stores and no real session changes", async () => {
  assert.ok(accountModule.accountRoute);
  const real = state.getStore("account"),
    before = JSON.stringify({
      session: real.session,
      accounts: real.accounts,
      lastPhone: real.lastPhone,
    });
  const exits = [],
    fresh = createDemoSession("login.new", (message) => exits.push(message));
  const s = fresh.scope;
  s.updatePhone("13800008000");
  s.agreed = true;
  s.sendCode();
  s.code = "123456";
  s.verifyCode();
  await new Promise((r) => setImmediate(r));
  assert.equal(s.account.loggedIn, true);
  assert.equal(exits.length, 1);
  assert.equal(
    JSON.stringify({
      session: real.session,
      accounts: real.accounts,
      lastPhone: real.lastPhone,
    }),
    before,
  );
  assert.equal(state.getControllerScopes().accountFlow, undefined);
  fresh.dispose();
  for (const id of [
    "login.recent",
    "login.code-error",
    "login.code-expired",
    "login.password-error",
  ]) {
    const a = createDemoSession(id);
    try {
      const html = renderScene(a);
      assert.match(html, /account-entry-flow/);
      if (id === "login.code-error") assert.match(html, /验证码不正确/);
      if (id === "login.code-expired") assert.match(html, /验证码已过期/);
      if (id === "login.password-error")
        assert.match(html, /手机号或密码不正确/);
    } finally {
      a.dispose();
    }
  }
});
test("workbench source render shows docs and phone together without exposing private query values", () => {
  const previous = globalThis.location;
  globalThis.location = { search: "?page=home&session=secret-do-not-display" };
  try {
    const html = renderToStaticMarkup(
      React.createElement(
        Workbench,
        {},
        React.createElement("div", {}, "手机占位"),
      ),
    );
    assert.match(html, /全局演示/);
    assert.ok(!html.includes("本页演示"));
    assert.ok(!html.includes("操作流程</button>"));
    assert.match(html, /手机占位/);
    assert.match(html, /PRODUCT.md/);
    assert.ok(!html.includes("secret-do-not-display"));
    assert.deepEqual(scenariosFor({ page: "home" }), []);
    assert.deepEqual(GLOBAL_SCENARIOS, ["app.update"]);
  } finally {
    if (previous === undefined) delete globalThis.location;
    else globalThis.location = previous;
  }
});
