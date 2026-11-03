const collectionViews = {
  home: "专项列表",
  projects: "项目列表",
  project: "项目详情",
  records: "采集记录",
  detail: "采集任务详情",
  complete: "采集任务详情",
  notifications: "通知中心",
  services: "服务中心",
};
const accountViews = {
  welcome: "手机号登录",
  phone: "手机号登录",
  code: "输入验证码",
  password: "密码登录",
  forgot: "找回密码",
  bind: "绑定手机号",
  reset: "重置密码",
  set: "设置密码",
  change: "修改密码",
  security: "账号安全",
  privacy: "隐私协议",
  settings: "隐私协议",
};
const tools = {
  repair: "照片精修",
  outfit: "照片换装",
  crop: "照片裁剪",
  background: "更换背景",
  format: "格式转换",
  resize: "修改体积",
};
const panels = {
  identity: "上传身份证",
  verify: "核对身份",
  alternate: "其他认证方式",
  employee: "工号认证",
  qr: "上传采集码",
  qrCheck: "确认身份信息",
  payment: "付款",
  confirm: "提交确认",
  reviewReason: "查看失败原因",
  taskSupport: "本次任务客服",
  email: "邮件联系",
  requirements: "采集要求",
  projectRecords: "当前采集任务",
  existing: "已有采集记录",
  policy: "阅读协议",
  oauth: "第三方授权",
  logout: "退出登录确认",
  delete: "注销账号验证",
  unbind: "解除绑定",
  making: "制作中",
  detectionScenario: "选择检测场景",
  detection: "照片检测",
  photoCheck: "照片检测",
  taskFailure: "制作失败",
  makingFailure: "制作失败",
  discard: "返回确认",
  discardResult: "返回确认",
  compare: "版本对照",
  help: "采集码帮助",
  failure: "失败原因",
  outcome: "选择演示结果",
  paymentOutcome: "付款结果演示",
  resultChoice: "选择演示结果",
  makingResult: "选择制作结果",
  portraitCheck: "证件照检查",
  checkScenario: "选择检查结果",
  checkFailure: "照片检查未通过",
  serviceHelp: "采集帮助",
  preview: "放大查看",
  resolution: "查询支付结果",
  spec: "选择照片规格",
  support: "联系客服",
  feedback: "意见反馈",
  language: "切换语言",
};
const statuses = {
  pending: "待拍摄",
  processing: "证件照制作中",
  processing_failed: "证件照制作失败",
  draft: "待提交审核",
  reviewing: "审核中",
  rejected: "审核未通过",
  complete: "采集完成",
  uploaded: "上网完成",
  upload_failed: "上网失败",
  unknown: "状态待更新",
};
const knownPages = new Set([
  "home",
  "search",
  "collection",
  "account",
  "camera",
  "album",
  "orders",
  "print",
  "tool",
  "scan",
  "specifications",
  "my",
  "support",
]);
const visibleParams = [
  "page",
  "view",
  "tool",
  "account",
  "camera",
  "print",
  "album",
  "type",
  "status",
  "category",
];
export function safeAddress(search) {
  const original = new URLSearchParams(search),
    q = new URLSearchParams();
  for (const key of visibleParams) {
    const value = original.get(key);
    if (value && /^[a-z0-9_-]{1,40}$/i.test(value)) q.set(key, value);
  }
  if (!q.has("page")) q.set("page", "home");
  return "/?" + q;
}
export function resolveWorkbenchContext(
  search = "",
  scopes = {},
  ui = {},
  demo = null,
) {
  const q = new URLSearchParams(search);
  const requested = q.get("page") || q.get("state") || "home";
  const page = knownPages.has(requested) ? requested : "home";
  let guide = page,
    title = "首页",
    group = "个人业务",
    panel = "",
    state = "",
    source = "home-1.4.6.md",
    scope = null;
  if (page === "collection") {
    scope = scopes.collectionFlow;
    group = "专项采集";
    const view = scope?.view || q.get("view") || "home";
    guide = "collection." + view;
    title = collectionViews[view] || "专项采集";
    source = "collection-week2-development-handoff-1.4.6.md";
    if (view === "projects" && (q.get("category") || "all") === "all") {
      guide = "collection.search";
      title = "项目搜索";
      source = "collection-project-search-1.4.6.md";
    }
    if (["detail", "complete"].includes(view)) {
      guide = "collection.detail";
      state = statuses[scope?.statusKey] || "";
      source = "collection-task-detail-1.4.6.md";
    }
    if (view === "notifications") source = "collection-notifications-1.4.6.md";
    if (view === "services") {
      source = "collection-services-1.4.6.md";
      const help = {
        entry: "查找采集项目",
        identity: "身份认证",
        review: "审核未通过",
        save: "保存照片",
      }[scope?.helpOpen];
      if (help) state = "采集帮助 · " + help;
    }
    panel = scope?.panel || "";
    if (view === "services" && scope?.helpOpen && !panel) panel = "serviceHelp";
  } else if (page === "account") {
    scope = scopes.accountFlow;
    const view = scope?.view || q.get("account") || "welcome";
    title = accountViews[view] || "账号";
    guide =
      "account." +
      ({ welcome: "login", phone: "login", settings: "privacy" }[view] || view);
    source = "account-login-1.4.6.md";
    panel = scope?.panel || "";
    state =
      view === "code"
        ? "验证码验证"
        : scope?.displayRecentPhone
          ? "上次登录号码"
          : "";
  } else if (page === "tool") {
    scope = scopes.toolStudio;
    const action = scope?.action || q.get("tool") || "crop";
    title = tools[action] || "常用工具";
    source = "common-tools-1.4.6.md";
    const step = scope?.step ?? 0;
    guide =
      "tool." +
      action +
      "." +
      (scope?.view === "saved" || step === 2
        ? "result"
        : step === 0
          ? "select"
          : "settings");
    state = ["选择照片", "处理设置", "处理结果"][step] || "";
    panel = scope?.panel || "";
    if (
      ["checking", "awaiting", "failed", "error"].includes(
        scope?.portraitCheck?.status,
      )
    ) {
      state = "证件照检查";
      panel = panel || "portraitCheck";
    }
  } else if (page === "camera") {
    scope = scopes.cameraStudio;
    const step = scope?.step || q.get("camera") || "capture";
    guide = "camera." + (step === "processing" ? "confirm" : step);
    source = "camera-confirmation-1.4.6.md";
    title =
      {
        capture: "拍摄或选择照片",
        confirm: "证件照制作",
        processing: "证件照制作",
        editor: "选择照片版本",
        saved: "制作完成",
      }[step] || "证件照制作";
    panel = scope?.panel || "";
    if (panel === "making") state = "制作中";
    if (scope?.collectionCapture) group = "专项采集";
    if (scope?.collectionCapture && ["capture", "confirm"].includes(step))
      guide = "collection.camera." + step;
  } else if (page === "print") {
    scope = scopes.printStudio;
    const view = scope?.view || q.get("print") || "select";
    title = "冲印照片";
    guide = "print." + (view === "preview" ? "select" : view);
    if (view === "confirm" && scope?.flowCompleted) guide = "print.complete";
    title =
      {
        select: "冲印照片 · 选择照片",
        crop: "冲印照片 · 裁剪照片",
        layouts: "选择排版",
        confirm: "确认订单",
        addresses: "收货地址",
        address: "编辑收货地址",
      }[view] || "冲印照片";
    state =
      {
        select: "选择照片",
        layouts: "选择排版",
        confirm: "确认订单",
        done: "冲印订单已提交",
        preview: "选择照片",
      }[view] || "";
    if (guide === "print.complete") {
      title = "冲印订单已确认";
      state = "";
    }
    source = "common-tools-1.4.6.md";
    panel = scope?.panel || scope?.dialog || scope?.modal || "";
  } else if (page === "album") {
    scope = scopes.albumCenter;
    guide =
      scope?.view === "detail" || q.has("photo")
        ? "album.detail"
        : "album.library";
    title = guide === "album.detail" ? "照片详情" : "知拍相册";
    source = "";
    panel = scope?.previewHistoryId ? "preview" : scope?.modal || "";
    state = scope?.previewHistoryId
      ? "放大查看"
      : scope?.managing
        ? "管理照片"
        : "";
  } else if (page === "orders") {
    scope = scopes.ordersFlow;
    guide = scope?.selected || q.has("id") ? "orders.detail" : "orders.list";
    title = guide === "orders.detail" ? "订单详情" : "我的订单";
    source = "orders-1.4.6.md";
    panel = scope?.sheet || "";
  } else if (page === "specifications") {
    scope = scopes.specificationPicker;
    title = "证照规格";
    source = "photo-specifications-1.4.6.md";
    panel = scope?.opened ? "选择背景颜色" : "";
  } else if (page === "scan") {
    scope = scopes.collectionScanner;
    group = "专项采集";
    title = "扫码采集";
    source = "scan-collection-1.4.6.md";
    panel = scope?.guideOpen
      ? "采集码帮助" + (scope.guidePage ? " · " + scope.guidePage : "")
      : scope?.failure
        ? "扫码失败"
        : scope?.panel || "";
  } else if (page === "my") {
    scope = scopes.myCenter;
    guide = q.get("my") === "share" ? "my.share" : "my";
    title = guide === "my.share" ? "分享知拍" : "我的";
    source = "";
    panel = scope?.panel || "";
  } else if (page === "search") {
    scope = scopes.searchPage;
    title = "搜索";
    source = "home-1.4.6.md";
  } else if (page === "support") {
    scope = scopes.supportCenter;
    title = "客服中心";
    source = "";
    panel = scope?.panel || "";
  }
  if (ui.photoChoice) {
    panel = "选择照片";
  }
  if (panel && panel !== "serviceHelp")
    state =
      panels[panel] || (/[\u4e00-\u9fff]/.test(panel) ? panel : "当前弹窗");
  let context = {
    page,
    guide,
    title,
    group,
    state,
    panel,
    source,
    address: safeAddress(search),
  };
  if (demo)
    context = {
      ...context,
      ...demo,
      address: safeAddress(search),
      isDemo: true,
    };
  context.section = sectionFor(context);
  context.key = [
    context.page,
    context.guide,
    context.title,
    context.state,
    context.panel,
    context.isDemo ? "demo" : "live",
  ].join(":");
  context.busy = !!(
    ui.photoChoice ||
    scope?.busy ||
    scope?.paying ||
    scope?.saving ||
    scope?.captureBusy ||
    scope?.paymentBusy ||
    scope?.savingResult ||
    scope?.processing ||
    scope?.checkoutPayment ||
    scope?.uploading ||
    scope?.resolving ||
    ["making", "payment"].includes(panel) ||
    (page === "camera" && (scope?.cameraReady || scope?.cameraStarting)) ||
    (page === "scan" &&
      (scope?.ready || scope?.starting || scope?.frameReading))
  );
  return context;
}

// Drawers are sections of their owner page, not replacement page documents.
export function sectionFor(context) {
  const { page, guide, panel, state } = context;
  if (!panel) return "";
  if (page === "tool") {
    if (panel === "选择照片" || panel === "album") return "照片来源";
    if (
      [
        "portraitCheck",
        "check",
        "failure",
        "checkFailure",
        "checkScenario",
      ].includes(panel)
    )
      return "照片检查";
    if (panel === "payment" || panel === "paymentOutcome") return "付款与处理";
    return guide.endsWith(".select") ? "照片检查" : "处理设置";
  }
  if (page === "collection") {
    if (["identity", "alternate", "employee", "qr"].includes(panel))
      return "身份认证";
    if (["verify", "qrCheck"].includes(panel)) return "核对身份信息";
    if (panel === "payment") return "采集付款";
    if (panel === "confirm") return "提交审核";
    if (panel === "reviewReason") return "失败原因";
    if (panel === "requirements") return "采集要求";
    if (panel === "projectRecords" || panel === "existing")
      return "当前采集任务";
    if (panel === "taskSupport") return "联系客服";
    if (panel === "email") return "邮件联系";
    if (panel === "serviceHelp") return "帮助内容";
  }
  if (page === "account")
    return (
      {
        policy: "协议与授权",
        oauth: "协议与授权",
        logout: "退出登录",
        delete: "注销账号",
        unbind: "第三方账号",
      }[panel] || ""
    );
  if (page === "camera") {
    if (["making", "makingResult"].includes(panel))
      return guide.endsWith("editor") ? "单版重试" : "制作状态与失败";
    if (panel === "选择照片")
      return guide.endsWith("capture") ? "拍摄与选图" : "开始制作";
    return (
      {
        spec: "照片规格",
        payment: "付款与恢复",
        making: "制作状态与失败",
        detectionScenario: "照片检测",
        detection: "照片检测",
        photoCheck: "照片检测",
        taskFailure: "制作状态与失败",
        makingFailure: "制作状态与失败",
        discard: "返回与丢弃",
        discardResult: "返回与丢弃",
        compare: "版本对照",
        选择照片: "拍摄与选图",
      }[panel] || ""
    );
  }
  if (page === "print")
    return panel === "album" || panel === "选择照片"
      ? "照片来源"
      : "付款与恢复";
  if (page === "album") return panel === "preview" ? "照片预览" : "更多与删除";
  if (page === "orders") return "订单操作";
  if (page === "specifications") return "选择背景";
  if (page === "scan")
    return state?.startsWith("采集码帮助") ? "获取采集码帮助" : "识别失败";
  if (page === "my")
    return (
      {
        feedback: "意见反馈",
        language: "语言与隐私",
        support: "客服中心",
        share: "分享",
      }[panel] || "账号与资产"
    );
  return "";
}
