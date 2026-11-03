import { createServiceContent } from "../domain/collection-service-content.js";
import {
  createDetachedController,
  observable,
  nextTick,
  registerStore,
} from "../runtime/state.js";
registerStore("prototypeWorkspace", { active: false });
import { collectionStatusInfo } from "../domain/collection-status.js";

export const DEMO_SCENARIOS = {
  "notice.default": "默认列表",
  "notice.failed": "审核未通过",
  "notice.making-failed": "制作失败",
  "notice.uploaded": "上网完成",
  "notice.empty": "暂无通知",
  "notice.body-error": "公告无法读取",
  "service.default": "九项采集帮助",
  "service.no-email": "邮箱未配置",
  "service.load-error": "帮助读取失败",
  "service.mail-error": "邮箱打开失败",
  "notice.complete": "采集完成",
  "notice.upload-failed": "上网失败",
  "notice.project": "项目通知",
  "notice.system": "系统通知",
  "notice.load-error": "读取失败",
  "app.update": "强制更新",
  "login.new": "首次登录",
  "login.recent": "上次登录号码",
  "login.code-error": "验证码错误",
  "login.code-expired": "验证码过期",
  "login.password-error": "密码错误",
};
// Local scenes belong to the page that owns them. Updates use the global menu.
export const GLOBAL_SCENARIOS = ["app.update"];
export function scenariosFor(context) {
  if (context.page === "account") {
    if (context.guide === "account.login") return ["login.new", "login.recent"];
    if (context.guide === "account.code")
      return ["login.code-error", "login.code-expired"];
    if (context.guide === "account.password") return ["login.password-error"];
  }
  if (context.page === "collection" && context.guide === "collection.services")
    return [
      "service.default",
      "service.load-error",
      "service.no-email",
      "service.mail-error",
    ];
  if (
    context.page === "collection" &&
    context.guide === "collection.notifications"
  )
    return [
      "notice.default",
      "notice.failed",
      "notice.making-failed",
      "notice.complete",
      "notice.uploaded",
      "notice.empty",
      "notice.body-error",
      "notice.upload-failed",
      "notice.project",
      "notice.system",
      "notice.load-error",
    ];
  return [];
}
function notificationSession(id, onExit) {
  const result =
    id === "notice.making-failed"
      ? "processing_failed"
      : id === "notice.uploaded"
        ? "uploaded"
        : id === "notice.failed"
          ? "rejected"
          : id === "notice.upload-failed"
            ? "upload_failed"
            : "complete";
  const project = {
    id: "workbench-sample",
    name: "示例学院毕业生图像采集",
    organization: "示例学院",
    status: "ongoing",
    requirements: [],
  };
  const record = {
    id: "workbench-record",
    name: "示例用户",
    method: "qr",
    number: "202600001",
    lastFour: "0000",
    customer: "演示-0001",
    projectId: project.id,
    fixture: true,
    status: result,
    reason:
      result === "rejected"
        ? "示例审核意见：面部存在遮挡，请按本项目要求调整后重新拍摄。"
        : result === "upload_failed"
          ? "示例上网结果：资料核验未通过，请联系知拍客服协调处理。"
          : "",
  };
  const resultInfo = collectionStatusInfo(result);
  const messages = [
    {
      id: "result",
      type: "collection",
      title: resultInfo.label,
      text: resultInfo.hint,
      projectName: project.name,
      time: "刚刚",
      status: result,
      record,
      read: false,
    },
    {
      id: "project",
      type: "project",
      title: "采集安排调整",
      text: "请阅读本项目最新采集安排。",
      body: "这是项目公告演示。请核对项目采集安排，并在项目开放期间完成拍摄和提交。\n\n已经提交审核的用户，可在采集记录查看当前办理进度。",
      projectId: project.id,
      projectName: project.name,
      time: "昨天",
      read: false,
    },
    {
      id: "history",
      type: "collection",
      title: "审核未通过",
      text: "示例历史结果保留，点击进入任务最新状态。",
      projectName: project.name,
      time: "11月1日",
      status: "rejected",
      record,
      read: true,
    },
    {
      id: "system",
      type: "system",
      title: "平台服务说明",
      text: "查看专项采集与服务说明。",
      body: "这是系统公告演示。专项采集进度请在原任务查看。\n\n需要帮助时，由知拍客服统一受理并协调相关机构。",
      time: "10月31日",
      read: true,
    },
  ];
  if (id === "notice.project") messages.unshift(messages.splice(1, 1)[0]);
  if (id === "notice.system") {
    const index = messages.findIndex((m) => m.id === "system");
    messages.unshift(messages.splice(index, 1)[0]);
    messages[0].read = false;
  }
  if (id === "notice.empty") messages.splice(0);
  if (id === "notice.body-error") {
    messages[1].body = "";
    messages[1].read = false;
  }
  const s = observable({
    serviceContent: createServiceContent(),
    get supportEmail() {
      return this.serviceContent.email;
    },
    contactNotice: "",
    view: "notifications",
    notificationFilter: "all",
    sectionScroll: {},
    $refs: {},
    messages,
    sourceMessage: null,
    previousFocus: null,
    panel: null,
    busy: false,
    disabled: false,
    error: "",
    notificationsError:
      id === "notice.load-error"
        ? "暂时无法读取通知，已有消息不会因此被删除。"
        : "",
    current: record,
    project,
    photoSrc: "assets/print-portrait.png",
    canCollect: true,
    projectState: { message: "" },
    recordsStore: { ready: true, error: "", busy: false },
    get notificationsShown() {
      return this.notificationsError
        ? []
        : this.messages.filter(
            (m) =>
              this.notificationFilter === "all" ||
              m.type === this.notificationFilter,
          );
    },
    get isRecordView() {
      return this.view === "detail";
    },
    get statusKey() {
      return this.current.status;
    },
    get status() {
      return collectionStatusInfo(this.current.status);
    },
    get primaryLabel() {
      return this.status.primary;
    },
    get canViewReviewReason() {
      return ["rejected", "upload_failed"].includes(this.statusKey);
    },
    get failureReasonLabel() {
      return this.statusKey === "rejected" ? "查看未通过原因" : "查看失败原因";
    },
    get failureReasonTitle() {
      return this.statusKey === "rejected" ? "未通过原因" : "失败原因";
    },
    get failureReasonHint() {
      return "查看本次演示任务的实际示例原因";
    },
    get panelTitle() {
      return (
        {
          reviewReason: this.failureReasonTitle,
          taskSupport: "客服支持",
          email: "邮件联系",
        }[this.panel] || ""
      );
    },
    get isTaskPanel() {
      return ["reviewReason", "taskSupport", "email"].includes(this.panel);
    },
    get emailLink() {
      return "#";
    },
    statusFor: collectionStatusInfo,
    openNotification(n) {
      if (!n.record && !n.body) {
        this.notificationsError = "通知正文暂时无法读取，请重新读取。";
        return;
      }
      this.sectionScroll.notifications =
        this.$refs.collectionMessageList?.scrollTop || 0;
      this.sourceMessage = n;
      this.view = n.record ? "detail" : "announcement";
      n.read = true;
    },
    retryNotifications() {
      this.notificationsError = "";
    },
    back() {
      if (this.panel) this.closePanel();
      else if (this.view === "notifications")
        onExit("已退出通知演示，原页面保持。");
      else {
        this.view = "notifications";
        const messageId =
          this.sourceMessage &&
          this.sourceMessage.type + ":" + this.sourceMessage.id;
        nextTick(() => {
          const list = this.$refs.collectionMessageList;
          if (!list || this.view !== "notifications") return;
          list.scrollTop = this.sectionScroll.notifications || 0;
          [...list.querySelectorAll("[data-message-id]")]
            .find((node) => node.dataset.messageId === messageId)
            ?.focus({ preventScroll: true });
        });
      }
    },
    closePanel() {
      this.panel = null;
      this.error = "";
      nextTick(() => {
        if (!this.panel && this.previousFocus?.isConnected)
          this.previousFocus.focus({ preventScroll: true });
      });
    },
    openReviewReason() {
      if (!this.panel) this.previousFocus = globalThis.document?.activeElement;
      this.panel = "reviewReason";
    },
    openTaskSupport() {
      if (!this.panel) this.previousFocus = globalThis.document?.activeElement;
      this.panel = "taskSupport";
    },
    openEmailContact() {
      this.panel = "email";
    },
    confirmEmailContact() {
      this.error = this.contactNotice = "这是隔离演示，不会打开真实邮件应用。";
      return false;
    },
    copySupportEmail() {
      this.contactNotice = "演示邮箱已复制（未写入设备剪贴板）";
    },
    copyCustomer() {
      this.error = "示例客服号仅用于演示，未复制真实任务资料。";
    },
    primary() {
      this.view = "notifications";
    },
    openProject() {
      this.error = "这是虚构项目；要办理真实任务，请先在左侧恢复默认。";
    },
  });
  return {
    id,
    kind: "notification",
    scope: s,
    context() {
      return {
        page: "collection",
        group: "专项采集",
        guide:
          s.view === "announcement"
            ? "notification.detail"
            : s.view === "detail"
              ? "collection.detail"
              : "collection.notifications",
        title:
          s.view === "announcement"
            ? "通知详情"
            : s.view === "detail"
              ? "采集任务详情"
              : "通知中心",
        state: s.panel
          ? s.panelTitle
          : s.view === "detail"
            ? s.status.label
            : DEMO_SCENARIOS[id],
        panel: s.panel || "",
        source:
          s.view === "detail"
            ? "collection-task-detail-1.4.6.md"
            : "collection-notifications-1.4.6.md",
      };
    },
    dispose() {
      s.panel = null;
    },
  };
}
function serviceSession(id, onExit) {
  const content = createServiceContent();
  if (id === "service.no-email") content.email = "";
  if (id === "service.load-error")
    content.error = "暂时无法读取帮助内容，请重试。";
  const s = observable({
    view: "services",
    serviceContent: content,
    panel: id === "service.mail-error" ? "email" : null,
    $refs: {},
    sectionScroll: {},
    helpOpen: "",
    busy: false,
    isRecordView: false,
    contactNotice:
      id === "service.mail-error" ? "未能打开邮箱，请复制邮箱后自行联系。" : "",
    get helpArticle() {
      return this.serviceContent.questions.find((q) => q.id === this.helpOpen);
    },
    get supportEmail() {
      return this.serviceContent.error ? "" : this.serviceContent.email;
    },
    get emailLink() {
      return "#";
    },
    closePanel() {
      this.panel = null;
      this.contactNotice = "";
      nextTick(() => {
        if (this.previousFocus?.isConnected)
          this.previousFocus.focus({ preventScroll: true });
      });
    },
    openHelp(value) {
      this.previousFocus = globalThis.document?.activeElement;
      this.helpOpen = value;
      this.panel = "serviceHelp";
    },
    openEmailContact() {
      this.previousFocus = globalThis.document?.activeElement;
      this.panel = "email";
    },
    confirmEmailContact() {
      this.contactNotice = "这是隔离演示，不会打开真实邮件应用。";
      return false;
    },
    copySupportEmail() {
      this.contactNotice = "演示邮箱已复制（未写入设备剪贴板）";
    },
    retryServiceContent() {
      this.serviceContent = createServiceContent();
    },
    openNotifications() {
      onExit("已退出服务演示，请从原页面进入通知中心。");
    },
    exitCollection() {
      onExit("已退出服务演示，原页面保持。");
    },
  });
  return {
    id,
    kind: "service",
    scope: s,
    context() {
      return {
        page: "collection",
        group: "专项采集",
        guide: "collection.services",
        title: "服务中心",
        state:
          s.panel === "serviceHelp"
            ? s.helpArticle?.title
            : s.panel
              ? "邮件联系"
              : DEMO_SCENARIOS[id],
        panel: s.panel || "",
        source: "collection-services-1.4.6.md",
      };
    },
    dispose() {
      s.panel = null;
    },
  };
}
function loginSession(id, onExit) {
  const phone = "13800008000";
  const memoryAccount = {
    accounts: [
      {
        phone,
        providers: [],
        salt: "demo",
        passwordHash: "demo-not-a-real-credential",
      },
    ],
    session: null,
    lastPhone: id === "login.new" ? "" : phone,
    error: "",
    get loggedIn() {
      return !!this.session;
    },
    signIn(value) {
      if (!this.accounts.some((a) => a.phone === value))
        this.accounts.push({
          phone: value,
          providers: [],
          salt: "",
          passwordHash: "",
        });
      this.session = this.accounts.find((a) => a.phone === value);
      this.lastPhone = value;
    },
    save(items, value) {
      this.accounts = items;
      this.session = items.find((a) => a.phone === value) || null;
    },
    update(change) {
      Object.assign(this.session, change);
    },
  };
  let s;
  s = createDetachedController("accountFlow", {
    $store: { account: memoryAccount },
    $refs: {},
    $nextTick: nextTick,
    page: "account",
    view: "welcome",
    phone: id === "login.new" ? "" : phone,
    usingRecentPhone: id !== "login.new",
    loginActive: true,
    route(view) {
      this.view = view;
      this.password = "";
      this.confirmPassword = "";
      this.oldPassword = "";
      this.error = "";
      this.notice = "";
    },
    leave() {
      onExit("登录结果演示已结束，当前业务账号没有改变。");
    },
  });
  if (["login.code-error", "login.code-expired"].includes(id)) {
    s.agreed = true;
    s.sendCode();
    s.code = id === "login.code-error" ? "000000" : "123456";
    if (id === "login.code-expired") {
      s.challenge.expires = Date.now() - 1;
      s.challenge.resendAt = 0;
      clearInterval(s.clock);
      s.seconds = 0;
    }
    s.verifyCode();
  }
  if (id === "login.password-error") {
    s.view = "password";
    s.agreed = true;
    s.error = "手机号或密码不正确";
  }
  return {
    id,
    kind: "login",
    scope: s,
    context() {
      return {
        page: "account",
        group: "个人业务",
        guide:
          "account." + ({ welcome: "login", phone: "login" }[s.view] || s.view),
        title: s.view === "welcome" ? "手机号登录" : s.title || "账号登录",
        state:
          s.panel === "policy"
            ? "阅读协议"
            : s.panel === "oauth"
              ? "第三方授权"
              : s.error
                ? "输入错误与恢复"
                : s.displayRecentPhone
                  ? "上次登录号码"
                  : "",
        panel: s.panel || "",
        source: "account-login-1.4.6.md",
      };
    },
    dispose() {
      clearInterval(s.clock);
      s.epoch++;
      s.busy = false;
    },
  };
}
export function createDemoSession(id, onExit = () => {}) {
  if (!DEMO_SCENARIOS[id]) throw new Error("该演示场景尚未开放。");
  if (id.startsWith("service.")) return serviceSession(id, onExit);
  if (id.startsWith("notice.")) return notificationSession(id, onExit);
  if (id.startsWith("login.")) return loginSession(id, onExit);
  const state = observable({ outcome: "ready", opened: false });
  return {
    id,
    kind: "update",
    state,
    apply(outcome) {
      if (outcome === "success")
        onExit("升级完成演示已结束，实际安装版本没有改变。");
      else state.outcome = outcome;
    },
    context() {
      return {
        guide: "update.demo",
        group: "全局机制",
        title: "强制更新演示",
        state: {
          ready: "发现新版本",
          error: "更新入口打开失败",
          old: "返回仍为旧版",
        }[state.outcome],
        panel: "update",
        source: "collection-notifications-1.4.6.md",
      };
    },
    dispose() {},
  };
}
