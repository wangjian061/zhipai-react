import {
  collectionHistoryState,
  returnCollectionHistory,
} from "./collection-history.js";
import { createMessageHistory } from "./collection-messages.js";
import {
  createServiceContent,
  validSupportEmail,
} from "./collection-service-content.js";
import { returnToOrderCenter } from "./order-routing.js";
import { paymentResult } from "./order-status.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import { accountHash, accountRoute } from "./account.js";
import {
  collectionScanService,
  resolveCollectionCode,
  validateCollectionCodeFile,
} from "./collection-code.js";
import {shootingGuides, skipShootingGuide, rememberShootingGuide} from "./collection-shooting.js";
import { uploadedPhoto, decodePhotoBlob, downloadAlbumBlob } from "./album.js";
import { readCollectionQRCode } from "./scan.js";
import {
  COLLECTION_CATEGORIES,
  COLLECTION_PROJECT_STATES,
  COLLECTION_PROJECT_MEDIA,
  createCollectionConfig,
} from "./collection-config.js";
import {
  COLLECTION_STATUSES,
  collectionStatusKey,
  collectionStatusInfo,
  canEditCollectionPhoto,
  isCollectionFinished,
} from "./collection-status.js";
// Roster, OCR, submission and review are replaceable prototype adapters. No institution, CHSI or review API is connected.
const COLLECTION_BASE_PROJECTS = [
  {
    id: "enrollment",
    type: "enrollment",
    name: "2026级新生入学照片采集",
    organization: "示例学院",
    date: "2026-08-01 至 2026-11-30",
    image: "assets/collection-enrollment.png",
    methods: ["id", "student"],
    requirements: [
      "穿着深色有领服装，避免浅色外套。",
      "露出眉毛与双耳，不佩戴耳饰、项链等饰物。",
      "正面平视镜头，表情自然，嘴唇闭合。",
      "不戴口罩、墨镜或美瞳，避免镜片反光。",
      "使用均匀光线和纯色背景，保持脸部无遮挡。",
      "核对本人信息后提交，不使用他人照片。",
    ],
  },
  {
    id: "graduate",
    type: "graduate",
    name: "2026届毕业生图像采集",
    organization: "示例学院",
    date: "2026-08-01 至 2026-11-30",
    image: "assets/collection-graduate.png",
    methods: ["qr"],
    requirements: [
      "使用本人学信网图像采集码核验信息。",
      "露出眉毛与双耳，不佩戴饰物。",
      "正面平视镜头，表情自然。",
      "不得遮挡脸部，不使用美颜或变形照片。",
      "穿着深色有领服装，使用均匀光线。",
      "提交前核对姓名、学号和照片。",
    ],
  },
  {
    id: "association",
    type: "association",
    name: "行业协会会员照片采集",
    organization: "示例协会",
    date: "2026-08-01 至 2026-11-30",
    image: "assets/collection-membership.png",
    methods: ["employee"],
    requirements: [
      "按协会通知填写姓名和工号。",
      "穿着整洁，保持正面平视镜头。",
      "面部清晰无遮挡，不使用美颜。",
      "背景纯净，光线均匀。",
      "使用本人近期照片。",
      "核对信息后提交审核。",
    ],
  },
];
// Additional fictional projects reuse the matching category's supported methods and requirements.
const COLLECTION_PROJECTS = [
  ...COLLECTION_BASE_PROJECTS,
  ...[
    {
      id: "enrollment-vocational",
      type: "enrollment",
      name: "2026级新生报到证件照采集",
      organization: "示例职业学院",
      date: "2026-08-15 至 2026-12-15",
    },
    {
      id: "graduate-degree",
      type: "graduate",
      name: "2027届毕业生学历照片采集",
      organization: "示例应用技术学院",
      date: "2026-09-01 至 2027-05-31",
    },
    {
      id: "association-engineering",
      type: "association",
      name: "工程技术协会会员证件照采集",
      organization: "示例工程技术协会",
      date: "2026-10-01 至 2027-03-31",
    },
    {
      id: "enrollment-postgraduate",
      type: "enrollment",
      name: "2026级研究生入学照片采集",
      organization: "示例研究生院",
      date: "2026-11-01 至 2026-12-31",
    },
    {
      id: "graduate-continuing",
      type: "graduate",
      name: "继续教育毕业生图像采集",
      organization: "示例继续教育学院",
      date: "2026-09-01 至 2027-02-28",
    },
    {
      id: "association-talent",
      type: "association",
      name: "行业人才登记照片采集",
      organization: "示例行业服务中心",
      date: "2026-04-01 至 2026-09-30",
    },
  ].map((entry) => {
    const base = COLLECTION_BASE_PROJECTS.find((p) => p.type === entry.type);
    return {
      ...base,
      ...entry,
      example: true,
      methods: [...base.methods],
      requirements: [...base.requirements],
    };
  }),
];
let collectionDB;
function openCollectionDB() {
  if (!collectionDB)
    collectionDB = new Promise((resolve, reject) => {
      const r = indexedDB.open("zhipai-collection-v1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(Error("blocked"));
    }).catch((e) => {
      collectionDB = null;
      throw e;
    });
  return collectionDB;
}
async function readCollectionRecords() {
  const db = await openCollectionDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction("records").objectStore("records").get("items");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function writeCollectionRecords(items) {
  const db = await openCollectionDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").put(storageValue(items), "items");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function collectionFixtures() {
  return ["pending", "draft", "reviewing", "rejected", "complete"].map(
    (status, i) => ({
      id: "example-" + status,
      projectId: [
        "enrollment",
        "graduate",
        "association",
        "enrollment",
        "graduate",
      ][i],
      status,
      fixture: true,
      name: "张同学",
      number: "2026****1234",
      lastFour: "1234",
      customer: "13202310113" + i,
      supplement: {
        referrer: "",
        age: "",
      },
      createdAt: Date.now() - i * 86400000,
      photo: null,
      reason:
        status === "rejected"
          ? "照片中眉毛被头发遮挡，请整理头发后重新拍摄。"
          : "",
    }),
  );
}
// Fixed prototype project prices, in cents; each project owns its configuration.
const COLLECTION_PRICES = {
  enrollment: 1200,
  graduate: 1800,
  association: 900,
  "enrollment-vocational": 600,
  "graduate-degree": 2500,
  "association-engineering": 1500,
  "enrollment-postgraduate": 400,
  "graduate-continuing": 2100,
  "association-talent": 1100,
};
const collectionAdapter = {
  async payment(order, outcome = "success", query = false) {
    // Local prototype adapter. Production must replace pay/query with server receipts.
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (query || outcome === "success") return "paid";
    return outcome === "unknown" ? "verifying" : "pending";
  },
  reviewOutcome: "complete",
  async match(project, fields) {
    await new Promise((r) => setTimeout(r, 300));
    if (!fields.name.trim() || !fields.number.trim())
      throw Error("请填写姓名及认证编号");
    if (/^0+$/.test(fields.number))
      throw Error("未匹配到采集名单，请核对姓名和编号");
    if (fields.method === "id" && !/^[1-9]\d{16}[\dXx]$/.test(fields.number))
      throw Error("请输入正确的18位身份证号");
    const identifierKey = await accountHash(fields.number.trim(), project.id);
    return {
      name: fields.name.trim(),
      number:
        fields.method === "id"
          ? fields.number.slice(0, 3) + "***********" + fields.number.slice(-4)
          : fields.number.trim(),
      lastFour:
        fields.method === "id"
          ? fields.number.slice(-4)
          : fields.lastFour.slice(-4),
      identifierKey,
    };
  },
  async submit(record) {
    await new Promise((r) => setTimeout(r, 350));
    return {
      ...record,
      status: "reviewing",
      submittedAt: Date.now(),
      reviewDueAt: Date.now() + 4000,
    };
  },
  async review(record) {
    await new Promise((r) => setTimeout(r, 100));
    const rejected = this.reviewOutcome === "rejected";
    return {
      ...record,
      status: rejected ? "rejected" : "complete",
      reviewDueAt: null,
      reviewedAt: Date.now(),
      reason: rejected ? "面部有遮挡，请整理头发后重新拍摄。" : "",
    };
  },
};
const APP_HOME_SECTION = "app-home";

function collectionNavigate(
  view = "home",
  project = "",
  record = "",
  replace = false,
  context = {},
) {
  // Aggregate pages remain retired; personal records require an explicit category.
  if (view === "home" || (view === "records" && !COLLECTION_CATEGORIES.some(item => item.id === context.category))) {
    if (COLLECTION_CATEGORIES.some(item => item.id === context.category)) {
      view = "projects";
      project = record = "";
      context = { category: context.category };
    } else {
      history[replace ? "replaceState" : "pushState"]({page:"home"}, "", "/?page=home");
      window.dispatchEvent(new Event("zhipai-route"));
      return;
    }
  }
  const u = new URL(location.href);
  const orderBack = u.searchParams.get("orderBack");
  u.search = "";
  if (orderBack && ["detail", "complete"].includes(view))
    u.searchParams.set("orderBack", orderBack);
  u.searchParams.set("page", "collection");
  if (view !== "home") u.searchParams.set("view", view);
  if (project) u.searchParams.set("project", project);
  if (record) u.searchParams.set("record", record);
  for (const key of ["category", "q", "from", "section", "message", "search"])
    if (context[key]) u.searchParams.set(key, context[key]);
  const state = collectionHistoryState(u.href, location.href, history.state, replace);
  if (context.section === APP_HOME_SECTION) {
    const previous = new URL(location.href);
    const page = previous.searchParams.get("page") || previous.searchParams.get("state") || "home";
    const depth = history.state?.homeNotificationDepth;
    if (page === "home" && view === "notifications" && !replace) {
      state.homeNotificationDepth = 1;
    } else if (page === "collection" && previous.searchParams.get("section") === APP_HOME_SECTION && Number.isSafeInteger(depth) && depth > 0) {
      state.homeNotificationDepth = depth + (replace ? 0 : 1);
    }
  }
  history[replace ? "replaceState" : "pushState"](state, "", u);
  window.dispatchEvent(new Event("zhipai-route"));
}
registerStore("collectionMessages", createMessageHistory());
registerStore("collectionRecords", {
  items: [],
  ready: false,
  busy: false,
  error: "",
  loading: null,
  reviewTimer: null,
  init() {
    this.loading = this.load();
  },
  async load() {
    this.error = "";
    try {
      const items = await readCollectionRecords();
      if (!items) {
        const fixtures = collectionFixtures();
        await writeCollectionRecords(fixtures);
        this.items = fixtures;
      } else
        this.items = items.map((record) =>
          !record.payment && collectionStatusKey(record.status) !== "pending"
            ? {
                ...record,
                payment: {
                  id: "collection-legacy-" + record.id,
                  amount: COLLECTION_PRICES[record.projectId] ?? 1200,
                  status: "paid",
                  legacyPrototype: true,
                },
              }
            : record,
        );
      this.ready = true;
      window.dispatchEvent(new Event("zhipai-collection-records"));
      this.scheduleReview();
    } catch (_) {
      this.error = "采集记录读取失败，请重新读取。";
    }
  },
  async commit(items) {
    if (this.busy || !this.ready) throw Error("storage busy");
    this.busy = true;
    try {
      await writeCollectionRecords(items);
      this.items = items;
      window.dispatchEvent(new Event("zhipai-collection-records"));
    } finally {
      this.busy = false;
      this.scheduleReview();
    }
  },
  scheduleReview() {
    clearTimeout(this.reviewTimer);
    if (
      this.items.some(
        (r) => !r.fixture && r.status === "reviewing" && r.reviewDueAt,
      )
    )
      this.reviewTimer = setTimeout(() => this.refreshReviews(), 500);
  },
  async refreshReviews() {
    if (this.busy) {
      this.scheduleReview();
      return;
    }
    try {
      const due = this.items.filter(
        (r) =>
          !r.fixture &&
          r.status === "reviewing" &&
          r.reviewDueAt &&
          r.reviewDueAt <= Date.now(),
      );
      for (const record of due) {
        const updated = await collectionAdapter.review({
          ...record,
        });
        const latest = this.items.find((r) => r.id === record.id);
        if (
          latest?.status === "reviewing" &&
          latest.submittedAt === record.submittedAt
        )
          await this.commit(
            this.items.map((r) => (r.id === record.id ? updated : r)),
          );
      }
    } catch (_) {
      this.error = "审核进度未能读取，请重试";
    } finally {
      this.scheduleReview();
    }
  },
});
function collectionProjectState(id) {
  return id === "enrollment-postgraduate"
    ? "not_started"
    : id === "association-talent"
      ? "ended"
      : "ongoing";
}
registerController("collectionFlow", () => ({
  view: "home",
  projects: COLLECTION_PROJECTS.map((p) => ({
    ...p,
    requiresUpload: p.type === "graduate",
    price: COLLECTION_PRICES[p.id] ?? 1200,
    status: collectionProjectState(p.id),
    ...COLLECTION_PROJECT_MEDIA[p.id],
  })),
  config: createCollectionConfig(),
  serviceContent: createServiceContent(),
  contactNotice: "",
  messageId: "",
  lastMessageId: "",
  categories: COLLECTION_CATEGORIES,
  notificationFilter: "all",
  notificationFrom: "home",
  projectFrom: "home",
  projectQuery: "",
  noticeSeverity: "info",
  noticeCloseMode: "auto",
  projectId: "enrollment",
  recordId: "",
  keyword: "",
  searchTerm: "",
  dedicatedSearch: false,
  projectSearchReturnId: "",
  projectCategory: "all",
  helpOpen: "",
  sectionScroll: { home: 0, records: 0, services: 0 },
  category: "all",
  recordCategory: "",
  recordQuery: "",
  recordFilters: {},
  get recordFilter() {
    return this.recordFilters[this.recordCategory || "all"] || "all";
  },
  set recordFilter(value) {
    this.recordFilters[this.recordCategory || "all"] = value;
  },
  panel: null,
  shootingMode: "",
  skipShootingPrompt: false,
  method: "id",
  identity: {
    name: "",
    number: "",
    lastFour: "",
  },
  idSides: {
    front: null,
    back: null,
  },
  idURLs: {
    front: "",
    back: "",
  },
  qr: null,
  qrURL: "",
  qrRead: false,
  qrPrototype: false,
  scanReturn: null,
  busy: false,
  error: "",
  notice: "",
  task: 0,
  photoURL: "",
  previewId: "",
  previousFocus: null,
  maskIdentity: true,
  paymentMethod: "wechat",
  paymentOutcome: "success",
  get recordsStore() {
    return this.$store.collectionRecords;
  },
  get account() {
    return this.$store.account;
  },
  get project() {
    return (
      this.projects.find(
        (p) => p.id === (this.current?.projectId || this.projectId),
      ) || this.projects[0]
    );
  },
  get current() {
    if (!this.recordId) return null;
    return this.records.find((r) => r.id === this.recordId) || null;
  },
  get statusKey() {
    return collectionStatusKey(this.current?.status);
  },
  get status() {
    return collectionStatusInfo(this.current?.status);
  },
  statusKeyFor(value) {
    return collectionStatusKey(value);
  },
  statusFor(value) {
    return collectionStatusInfo(value);
  },
  get categoryInfo() {
    return (
      this.categories.find((c) => c.id === this.projectCategory) || {
        name: "项目搜索",
        subtitle: "查找需要参加的采集项目",
        image: "assets/bear-album.webp",
      }
    );
  },
  get projectState() {
    const state = this.projectStatus(this.project);
    return { ...state, ...this.project.notice };
  },
  get canCollect() {
    return (
      this.project.status === "ongoing" &&
      this.config.entries[this.project.type] === true
    );
  },
  get featuredProjects() {
    return this.config.featuredProjectIds
      .map((id) => this.projects.find((p) => p.id === id))
      .filter(Boolean);
  },
  get projectsShown() {
    if (this.view === "home") return this.featuredProjects;
    const term = this.searchTerm.trim().toLowerCase();
    return this.projects.filter(
      (p) =>
        (this.projectCategory === "all" || p.type === this.projectCategory) &&
        (!term || (p.name + p.organization).toLowerCase().includes(term)),
    );
  },
  projectStatus(project) {
    return (
      COLLECTION_PROJECT_STATES[project.status] ||
      COLLECTION_PROJECT_STATES.not_started
    );
  },
  entryEnabled(id) {
    return this.config.entries[id] === true;
  },
  guardCollect(project = this.project) {
    if (project.status === "ongoing" && this.entryEnabled(project.type))
      return true;
    const state = this.projectStatus(project);
    this.showNotice(
      this.entryEnabled(project.type) ? state.message : "暂未开放这个功能",
      "warning",
      "manual",
    );
    return false;
  },
  get records() {
    const phone = this.account.session?.phone;
    return phone
      ? this.recordsStore.items
          .filter((r) => !r.fixture && r.owner === phone)
          .slice()
          .sort(
            (a, b) =>
              (b.updatedAt || b.createdAt || 0) -
              (a.updatedAt || a.createdAt || 0),
          )
      : [];
  },
  get scopedRecords() {
    return this.view === "records" && !!this.recordCategory;
  },
  get categoryRecordCountLabel() {
    if (!this.account.session) return "登录后查看";
    if (this.recordsStore.error) return "读取失败";
    if (!this.recordsStore.ready) return "读取中…";
    return this.recordsInCategory(this.projectCategory).length + " 条";
  },
  get recordListTitle() {
    return this.categories.find(c => c.id === this.recordCategory)?.recordsTitle || "采集记录";
  },
  get scrollKey() {
    if (this.scopedRecords) return "records:" + this.recordCategory;
    return this.view === "projects"
      ? (this.dedicatedSearch && this.projectCategory !== "all" ? "search:" : "projects:") + this.projectCategory + ":" + this.searchTerm
      : this.view;
  },
  get scrollHost() {
    return this.view === "home"
      ? this.$refs.collectionProjectList
      : this.view === "projects"
        ? this.isProjectSearch
          ? this.$refs.collectionProjectSearchScroll
          : this.$refs.collectionCategoryList
        : this.view === "notifications"
          ? this.$refs.collectionMessageList
          : this.view === "records"
            ? this.$refs.collectionRecordList
            : this.$refs.collectionScroll;
  },
  get isSection() {
    return ["home", "records", "services"].includes(this.view) && !this.scopedRecords;
  },
  get isProjectSearch() {
    return this.view === "projects" && (this.projectCategory === "all" || this.dedicatedSearch);
  },
  get actionableRecords() {
    return this.records.filter((r) => canEditCollectionPhoto(r.status));
  },
  get continueTask() {
    return this.actionableRecords[0] || null;
  },
  get messageStore() {
    return this.$store.collectionMessages;
  },
  syncMessages() {
    this.messageStore.sync(
      this.account.session?.phone || "",
      this.records,
      this.projects,
      this.config.messages,
    );
  },
  get collectionNotifications() {
    return this.notifications.filter((n) => n.type === "collection");
  },
  get latestCollectionNotification() {
    return this.collectionNotifications[0] || null;
  },
  get notificationsError() {
    return (
      this.messageStore.error ||
      (this.recordsStore.error
        ? "采集结果暂时无法同步，已有通知仍可查看。"
        : "")
    );
  },
  get notificationsLoading() {
    return (
      !!this.account.loggedIn &&
      !this.recordsStore.ready &&
      !this.recordsStore.error
    );
  },
  get notifications() {
    if (
      !this.account.loggedIn ||
      this.messageStore.owner !== this.account.session?.phone
    )
      return [];
    return this.messageStore.items
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((n) => ({
        ...n,
        time: new Date(n.timestamp).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
  },
  get notificationsShown() {
    return this.notifications.filter(
      (n) =>
        this.notificationFilter === "all" || n.type === this.notificationFilter,
    );
  },
  get sourceMessage() {
    return this.notifications.find((n) => n.id === this.messageId);
  },
  markNotificationViewed() {
    const n = this.sourceMessage;
    if (
      n &&
      ((this.view === "announcement" && n.body?.trim()) ||
        (this.isRecordView && this.current?.id === n.recordId))
    )
      this.messageStore.markRead(n.id);
  },
  async retryNotifications() {
    if (this.recordsStore.error) await this.recordsStore.load();
    this.messageStore.retry();
    this.syncMessages();
  },
  get helpArticle() {
    return this.serviceContent.questions.find(
      (item) => item.id === this.helpOpen,
    );
  },
  get supportEmail() {
    return !this.serviceContent.error &&
      this.serviceContent.ready &&
      validSupportEmail(this.serviceContent.email)
      ? this.serviceContent.email
      : "";
  },
  openHelp(id) {
    if (
      this.busy ||
      this.panel ||
      !this.serviceContent.questions.some((q) => q.id === id)
    )
      return;
    this.helpOpen = id;
    this.openPanel("serviceHelp");
  },
  retryServiceContent() {
    this.serviceContent = createServiceContent();
  },
  recordsInCategory(category) {
    if (!category || category === "all") return this.records;
    return this.records.filter(record =>
      this.projects.find(project => project.id === record.projectId)?.type === category
    );
  },
  get filteredRecords() {
    return this.recordsInCategory(this.recordCategory || this.category).filter(
      record => this.recordFilter === "all" ||
        (isCollectionFinished(record.status) ? this.recordFilter === "complete" : this.recordFilter === "ongoing")
    );
  },
  get recordStatistics() {
    return [
      { id: "all", name: "全部", count: this.records.length },
      ...this.categories.map((category) => ({
        id: category.id, name: category.name, count: this.recordsInCategory(category.id).length,
      })),
    ];
  },
  recordFilterSelected(filter) {
    return this.recordFilter === "all" || this.recordFilter === filter;
  },
  toggleRecordFilter(filter) {
    if (!["ongoing", "complete"].includes(filter) || this.panel) return;
    if (this.recordFilter === "all")
      this.recordFilter = filter === "ongoing" ? "complete" : "ongoing";
    else if (this.recordFilter !== filter) this.recordFilter = "all";
  },
  get projectRecords() {
    return this.records.filter((r) => r.projectId === this.projectId);
  },
  get disabled() {
    return this.busy || this.recordsStore.busy || !this.recordsStore.ready;
  },
  get photoSrc() {
    return (
      this.photoURL ||
      (this.current?.fixture && this.statusKey !== "pending"
        ? "assets/collection-example-good.webp"
        : "")
    );
  },
  get primaryLabel() {
    if (canEditCollectionPhoto(this.current?.status) && !this.canCollect)
      return this.projectState.label;
    if (this.needsPayment) return "支付并开始采集";
    if(!this.busy && this.statusKey==="pending" && this.current?.payment?.status==="paid") return "开始采集";
    if (this.busy) return "正在处理…";
    if (this.status.action === "records") return this.taskReturnLabel;
    return this.status.primary;
  },
  get taskReturnLabel() {
    return this.projectFrom === "notifications" ? "返回通知中心" :
      this.projectFrom === "records" ? "返回采集记录" : "返回项目";
  },
  get needsPayment() {
    return (
      !!this.current &&
      !this.current.fixture &&
      this.statusKey === "pending" &&
      this.current.payment?.status !== "paid"
    );
  },
  guardCollectionPayment() {
    if (this.current?.payment?.status === "paid") return true;
    if (this.needsPayment) this.openPayment();
    else this.error = "采集任务状态异常，请返回项目后重试。";
    return false;
  },
  get collectionPrice() {
    return (
      (this.current?.payment?.amount ?? this.project.price) / 100
    ).toFixed(2);
  },
  get collectionPaymentLabel() {
    if (this.busy) return "正在确认…";
    return this.current?.payment?.status === "verifying"
      ? "查询付款结果"
      : "确认支付 ¥" + this.collectionPrice;
  },
  openPayment() {
    if (this.disabled || !this.needsPayment || !this.guardCollect()) return;
    this.paymentMethod = this.current.payment?.method || "wechat";
    this.openPanel("payment");
  },
  async payCollection() {
    if (
      this.disabled ||
      this.panel !== "payment" ||
      !this.needsPayment ||
      !this.guardCollect()
    )
      return;
    const record = this.current,
      owner = this.account.session?.phone;
    if (!owner || record.owner !== owner) return;
    const token = this.task;
    const query = record.payment?.status === "verifying";
    let payment = {
      id: "collection-" + record.id,
      amount: this.project.price,
      status: "pending",
      createdAt: Date.now(),
      ...record.payment,
    };
    this.busy = true;
    this.error = "";
    const valid = () =>
      token === this.task && this.account.session?.phone === owner;
    const persist = async () => {
      const latest = this.recordsStore.items.find(
        (r) => r.id === record.id && r.owner === owner,
      );
      if (!latest) throw Error("record unavailable");
      await this.recordsStore.commit(
        this.recordsStore.items.map((r) =>
          r.id === record.id && r.owner === owner
            ? { ...r, payment: { ...payment } }
            : r,
        ),
      );
    };
    try {
      // Save an unresolved order before payment. A retry queries this same order.
      payment = {
        ...payment,
        status: "verifying",
        paymentResult: paymentResult("verifying"),
        method: query ? payment.method : this.paymentMethod,
      };
      await persist();
      if (!valid()) return;
      const status = await collectionAdapter.payment(
        payment,
        this.paymentOutcome,
        query,
      );
      if (!valid()) return;
      payment = {
        ...payment,
        status,
        paymentResult: paymentResult(status, this.paymentOutcome),
        ...(status === "paid" ? { paidAt: Date.now() } : {}),
      };
      await persist();
      if (!valid()) return;
      if (status === "paid") this.panel = null;
      else
        this.error =
          status === "verifying"
            ? "付款结果待确认，请查询付款结果。"
            : this.paymentOutcome === "cancel"
              ? "已取消付款，采集任务已保留。"
              : "付款未完成，请重试。";
    } catch (_) {
      if (valid())
        this.error =
          this.current?.payment?.status === "verifying"
            ? "付款结果未能确认，请查询后继续。"
            : "付款未能发起，请重试。";
    } finally {
      if (valid()) this.busy = false;
    }
    if (valid() && this.current?.payment?.status === "paid") {
      if (this.status.action === "submit") await this.submit();
    }
  },
  get identityMethods() {
    return this.project.methods.filter((m) => !["id", "qr"].includes(m));
  },
  get identifierLabel() {
    return (
      {
        id: "证件号",
        student: "学号",
        passport: "护照号",
        document: "证件号",
        employee: "工号",
        qr: "学号",
      }[this.current?.method || this.method] || "编号"
    );
  },
  get isAuthPanel() {
    return [
      "identity",
      "verify",
      "alternate",
      "employee",
      "qr",
      "qrCheck",
    ].includes(this.panel);
  },
  get isTaskPanel() {
    return (
      [
        "confirm",
        "reviewReason",
        "taskSupport",
        "serviceHelp",
        "email",
      ].includes(this.panel) ||
      (this.panel === "email" && this.isRecordView && !!this.current)
    );
  },
  get isRecordView() {
    return ["detail", "complete"].includes(this.view);
  },
  get canViewReviewReason() {
    return (
      this.isRecordView &&
      ["rejected", "processing_failed", "upload_failed"].includes(
        this.statusKey,
      ) &&
      !!this.current?.reason?.trim()
    );
  },
  get failureReasonLabel() {
    return this.statusKey === "rejected" ? "查看未通过原因" : "查看失败原因";
  },
  get failureReasonTitle() {
    return this.statusKey === "rejected" ? "未通过原因" : "失败原因";
  },
  get failureReasonHint() {
    return this.statusKey === "upload_failed"
      ? "请核对失败原因，联系客户服务处理"
      : this.statusKey === "processing_failed"
        ? "请按失败原因重新制作证件照"
        : "请按未通过原因调整后重新提交";
  },
  openReviewReason() {
    if (!this.canViewReviewReason || this.disabled) return;
    this.openPanel("reviewReason");
  },
  openTaskSupport() {
    if (!this.isRecordView || !this.current || this.disabled) return;
    this.openPanel("taskSupport");
  },
  get authReturnLabel() {
    if (this.panel === "qrCheck") return "重新识别采集码";
    if (this.panel === "verify") return "返回身份证上传";
    if (this.panel === "alternate")
      return (
        {
          id: "返回身份证上传",
          qr: "返回采集码认证",
          employee: "返回工号认证",
        }[this.project.methods[0]] || ""
      );
    return "";
  },
  returnAuthentication() {
    if (
      this.disabled ||
      !["verify", "alternate", "qrCheck"].includes(this.panel)
    )
      return;
    const method =
      this.panel === "verify"
        ? "id"
        : this.panel === "qrCheck"
          ? "qr"
          : this.project.methods[0];
    if (!this.project.methods.includes(method)) return;
    this.method = method;
    if (method === "qr") this.qrRead = false;
    this.openPanel(
      { id: "identity", qr: "qr", employee: "employee" }[method] || "alternate",
    );
  },
  get panelTitle() {
    return (
      {
        email: "联系知拍客服",
        serviceHelp: this.helpArticle?.title || "采集帮助",
        identity: "身份认证",
        verify: "核对身份信息",
        alternate: "其他认证方式",
        qr: "毕业生身份认证",
        employee: "身份认证",
        existing: "已有采集记录",
        requirements: "采集要求",
        projectRecords: "当前采集任务",
        reviewReason: this.failureReasonTitle,
        taskSupport: "客服支持",
        confirm: "确认提交",
        qrCheck: "确认身份信息",
      }[this.panel] || ""
    );
  },
  init() {
    this.scanDirectory = () => ({
      projects: this.projects,
      entries: this.config.entries,
      bindings: this.config.codeBindings,
    });
    collectionScanService.directory = this.scanDirectory;
    this.routeHandler = () => this.sync();
    this.photoHandler = (e) => this.acceptPhoto(e.detail);
    this.qrHandler = (e) => this.receiveScan(e.detail);
    window.addEventListener("zhipai-route", this.routeHandler);
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-collection-photo", this.photoHandler);
    window.addEventListener("zhipai-collection-code", this.qrHandler);
    this.recordsHandler = () => {
      this.syncMessages();
      this.markNotificationViewed();
      this.loadPhoto();
      if (
        new URLSearchParams(location.search).get("page") === "collection" &&
        this.view === "project"
      )
        this.resumeScan();
    };
    this.$watch?.("account.session.phone", () => {
      this.recordFilters = {};
      for (const key of Object.keys(this.sectionScroll))
        if (key === "records" || key.startsWith("records:")) this.sectionScroll[key] = 0;
      this.panel = null;
      this.syncMessages();
      this.sync();
    });
    this.$watch?.("disabled", () => {
      if (
        !this.disabled &&
        new URLSearchParams(location.search).get("page") === "collection" &&
        this.view === "project"
      )
        this.resumeScan();
    });
    window.addEventListener("zhipai-collection-records", this.recordsHandler);
    this.syncMessages();
    this.sync();
  },
  destroy() {
    if (collectionScanService.directory === this.scanDirectory) {
      collectionScanService.directory = () => ({});
      collectionScanService.clear();
    }
    window.removeEventListener("zhipai-route", this.routeHandler);
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-collection-photo", this.photoHandler);
    window.removeEventListener("zhipai-collection-code", this.qrHandler);
    window.removeEventListener(
      "zhipai-collection-records",
      this.recordsHandler,
    );
    clearTimeout(this.noticeTimer);
    this.task++;
    this.releaseIdentity();
    if (this.photoURL) URL.revokeObjectURL(this.photoURL);
  },
  sync() {
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "collection") {
      const pending = collectionScanService.pending;
      let loginBack;
      try {
        loginBack = new URL(q.get("back") || "/", location.origin);
      } catch (_) {}
      if (
        q.get("page") !== "scan" &&
        !(
          q.get("page") === "account" &&
          pending &&
          loginBack?.origin === location.origin &&
          loginBack?.searchParams.get("page") === "collection" &&
          loginBack?.searchParams.get("view") === "project" &&
          loginBack?.searchParams.get("project") === pending.projectId
        )
      ) {
        collectionScanService.clear();
        this.scanReturn = null;
      }
      this.task++;
      this.busy = false;
      this.panel = null;
      this.releaseIdentity();
      return;
    }
    const validRecords = q.get("view") === "records" && this.categories.some(c => c.id === q.get("category"));
    if (!validRecords && !["projects", "project", "notifications", "announcement", "services", "detail", "complete"].includes(q.get("view"))) {
      const linkedRecord = this.records.find(item => item.id === q.get("record"));
      const linkedProject = this.projects.find(item => item.id === (linkedRecord?.projectId || q.get("project")));
      collectionNavigate("home", "", "", true, {category: linkedProject?.type || q.get("category")});
      return;
    }
    this.task++;
    this.busy = false;
    this.dismissNotice();
    this.releaseIdentity();
    const leftSearch = this.isProjectSearch;
    const previousPanel = this.panel;
    this.view = [
      "project",
      "projects",
      "notifications",
      "announcement",
      "records",
      "services",
      "detail",
      "complete",
    ].includes(q.get("view"))
      ? q.get("view")
      : "home";
    this.dedicatedSearch = q.get("search") === "1" || (q.has("q") && ["projects","project"].includes(this.view));
    this.recordCategory = validRecords ? q.get("category") : "";
    if (validRecords) this.projectCategory = this.recordCategory;
    this.recordQuery = "";
    const linkedRecord = this.records.find(item => item.id === q.get("record"));
    const linkedProject = this.projects.find(item => item.id === (linkedRecord?.projectId || q.get("project")));
    if (linkedProject) this.projectId = linkedProject.id;
    if (this.view === "projects") {
      this.projectCategory = this.categories.some(
        (c) => c.id === q.get("category"),
      )
        ? q.get("category")
        : "all";
      this.keyword = this.searchTerm = q.get("q") || "";
      if (
        this.projectCategory !== "all" &&
        !this.entryEnabled(this.projectCategory)
      ) {
        this.view = "home";
        collectionNavigate("home", "", "", true);
        this.showNotice("暂未开放这个功能");
        return;
      }
    }
    if (this.view === "notifications" && !this.entryEnabled("notifications")) {
      collectionNavigate("home", "", "", true);
      this.showNotice("暂未开放这个功能");
      return;
    }
    const sections = ["home", "records", "services"];
    this.notificationFrom = [...sections, APP_HOME_SECTION].includes(q.get("section"))
      ? q.get("section")
      : "home";
    this.projectFrom = [
      "project",
      "projects",
      "notifications",
      "announcement",
      ...sections,
    ].includes(q.get("from"))
      ? q.get("from")
      : "home";
    if (["project", "detail", "complete"].includes(this.view)) {
      this.projectCategory = this.dedicatedSearch && q.get("category") === "all"
        ? "all" : linkedProject?.type || (this.categories.some(c => c.id === q.get("category")) ? q.get("category") : "all");
      this.projectQuery = q.get("q") || "";
    }
    this.recordId = q.get("record") || "";
    this.messageId = q.get("message") || "";
    this.error = "";
    this.panel = null;
    const layer = history.state?.collectionCaptureLayer;
    if (layer?.record === this.recordId && this.canChooseCapture) {
      this.shootingMode = layer.mode || "";
      this.panel = layer.guide && shootingGuides[layer.mode] ? "shootingGuide" : "captureMethod";
      this.skipShootingPrompt = false;
    }
    const syncToken = this.task;
    this.$nextTick(() => {
      if (syncToken !== this.task) return;
      this.loadPhoto();
      this.markNotificationViewed();
      if (this.scrollHost)
        this.scrollHost.scrollTop = this.sectionScroll[this.scrollKey] || 0;
      if (["captureMethod","shootingGuide"].includes(previousPanel) && !this.panel && this.isRecordView)
        (this.previousFocus?.isConnected ? this.previousFocus : this.$refs.collectionScroll?.closest?.(".collection-page")?.querySelector(".collection-task-footer button"))?.focus?.({preventScroll:true});
      if (leftSearch && !this.isProjectSearch && ["projects","home"].includes(this.view)) this.$refs.projectSearchEntry?.focus?.({preventScroll:true});
      if (
        this.view === "notifications" &&
        this.lastMessageId &&
        this.$refs.collectionMessageList
      ) {
        const node = [
          ...this.$refs.collectionMessageList.querySelectorAll(
            "[data-message-id]",
          ),
        ].find(
          (el) =>
            el.dataset.messageId === "collection:" + this.lastMessageId ||
            el.dataset.messageId === "system:" + this.lastMessageId ||
            el.dataset.messageId === "project:" + this.lastMessageId,
        );
        node?.focus({ preventScroll: true });
      }
      this.resumeScan();
    });
  },
  resumeScan() {
    const pending = collectionScanService.pending;
    if (pending) {
      if (
        this.view !== "project" ||
        this.projectId !== pending.projectId ||
        pending.expires < Date.now() ||
        (pending.owner && pending.owner !== this.account.session?.phone)
      ) {
        collectionScanService.clear();
        this.scanReturn = null;
        return;
      }
      if (!this.guardCollect()) {
        collectionScanService.clear();
        return;
      }
      if (this.disabled) return;
      if (!this.account.loggedIn) {
        // Cancelled login returns to project without forcing another login loop.
        if (pending.loginRequested) return;
        pending.loginRequested = true;
        accountRoute("welcome", location.pathname + location.search);
        return;
      }
      collectionScanService.clear();
      this.scanReturn = null;
      this.releaseIdentity();
      if (pending.kind === "chsi" && !this.project.methods.includes("qr")) {
        this.showNotice(
          "本项目当前不支持采集码认证，请按项目要求办理。",
          "warning",
          "manual",
        );
        return;
      }
      if (pending.kind === "chsi" && this.project.methods.includes("qr")) {
        this.method = "qr";
        this.qrRead = true;
        this.qrPrototype = pending.prototype;
        this.identity = {
          name: pending.identity?.name || "",
          number: pending.identity?.number || "",
          lastFour: pending.identity?.lastFour || "",
        };
        this.openPanel("qrCheck");
      } else this.begin();
      return;
    }
    const previous = this.scanReturn;
    this.scanReturn = null;
    if (
      previous &&
      previous.projectId === this.projectId &&
      this.view === "project" &&
      previous.owner === this.account.session?.phone &&
      previous.expires > Date.now() &&
      this.canCollect
    ) {
      this.method = previous.method;
      this.identity = previous.identity;
      this.openPanel(previous.panel);
    }
  },
  loadPhoto() {
    if (this.current) this.projectId = this.current.projectId;
    const key =
      this.current?.id +
      ":" +
      (this.current?.photo?.size || 0) +
      ":" +
      this.current?.updatedAt;
    if (
      this.view === "complete" &&
      this.recordsStore.ready &&
      !isCollectionFinished(this.current?.status)
    )
      this.view = "detail";
    if (this.previewId === key) return;
    if (this.photoURL) URL.revokeObjectURL(this.photoURL);
    this.photoURL = this.current?.photo?.blob
      ? URL.createObjectURL(this.current.photo.blob)
      : "";
    this.previewId = key;
  },
  route(view, project = this.projectId, record = "", context = {}) {
    if (this.busy) return;
    this.rememberScroll();
    collectionNavigate(view, project, record, false, context);
  },
  rememberScroll() {
    if (this.scrollHost)
      this.sectionScroll[this.scrollKey] = this.scrollHost.scrollTop;
  },
  switchSection(view) {
    if (
      !["home", "records", "services"].includes(view) ||
      this.busy ||
      this.panel ||
      view === this.view
    )
      return;
    this.rememberScroll();
    collectionNavigate(view, "", "", true);
  },
  openNotifications(fromAppHome = false) {
    if (this.busy || this.panel) return;
    if (!this.entryEnabled("notifications")) {
      this.showNotice("暂未开放这个功能");
      return;
    }
    this.notificationFilter = "all";
    if (fromAppHome) {
      this.lastMessageId = "";
      this.sectionScroll.notifications = 0;
      collectionNavigate("notifications", "", "", false, { section: APP_HOME_SECTION });
      return;
    }
    this.route("notifications", "", "", {
      section: this.isSection ? this.view : this.notificationFrom,
    });
  },
  openCategory(id) {
    if (this.busy || this.panel) return;
    if (!this.entryEnabled(id)) {
      this.showNotice("暂未开放这个功能");
      return;
    }
    this.route("projects", "", "", { category: id });
  },
  openNotification(n) {
    if (this.busy || this.panel) return;
    const message = this.notifications.find((item) => item.id === n.id);
    if (!message) return;
    this.lastMessageId = message.id;
    if (message.type === "collection") {
      const record = this.records.find((item) => item.id === message.recordId);
      if (!record || !this.projects.some((p) => p.id === record.projectId)) {
        this.showNotice(
          "该任务暂时无法查看，请进入对应项目核实或联系客服。",
          "warning",
          "manual",
        );
        return;
      }
      this.route(
        isCollectionFinished(record.status) ? "complete" : "detail",
        record.projectId,
        record.id,
        {
          from: "notifications",
          section: this.notificationFrom,
          message: message.id,
        },
      );
    } else if (message.body?.trim())
      this.route("announcement", message.projectId || "", "", {
        section: this.notificationFrom,
        message: message.id,
      });
    else
      this.showNotice(
        "通知正文暂时无法读取，请稍后重试。",
        "warning",
        "manual",
      );
  },
  openAnnouncementProject() {
    const n = this.sourceMessage;
    if (!n?.projectId || !this.projects.some((p) => p.id === n.projectId)) {
      this.showNotice(
        "该项目暂时无法查看，请联系客服核实。",
        "warning",
        "manual",
      );
      return;
    }
    this.route("project", n.projectId, "", {
      from: "announcement",
      section: this.notificationFrom,
      message: n.id,
    });
  },
  showNotice(text, severity = "info", closeMode = "auto") {
    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    this.noticeSeverity = severity;
    this.noticeCloseMode = closeMode;
    this.notice = text;
    if (closeMode === "auto")
      this.noticeTimer = setTimeout(() => {
        this.notice = "";
      }, 4000);
  },
  dismissNotice() {
    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    this.notice = "";
  },
  exitCollection() {
    if (this.busy || this.panel || !this.isSection) return;
    this.rememberScroll();
    this.go("home");
  },
  enterProjectSearch(term = "") {
    if (this.busy || this.panel) return;
    const category = this.view === "projects" ? this.projectCategory : "all";
    this.projectSearchReturnId = "";
    this.focusNewSearch = true;
    this.sectionScroll[(category === "all" ? "projects:" : "search:") + category + ":" + term] = 0;
    this.route("projects", "", "", { category, q:term, search:"1", section:this.notificationFrom });
  },
  searchProjects() {
    if (this.busy || this.panel) return;
    const term = this.keyword.trim();
    if (!this.isProjectSearch) return this.enterProjectSearch(term);
    this.keyword = term;
    this.projectSearchReturnId = "";
    if (term === this.searchTerm) {
      this.sectionScroll[this.scrollKey] = 0;
      if (this.scrollHost) this.scrollHost.scrollTop = 0;
      return;
    }
    this.rememberScroll();
    const category = this.projectCategory;
    this.sectionScroll[(category === "all" ? "projects:" : "search:") + category + ":" + term] = 0;
    collectionNavigate("projects", "", "", true, {category, search:"1", q:term, section:this.notificationFrom});
  },
  clearSearch() {
    if (this.busy || this.panel) return;
    this.keyword = "";
    if (this.isProjectSearch) this.searchProjects();
  },
  loginForRecords() {
    const view = ["services", "notifications"].includes(this.view)
      ? this.view
      : "records";
    const target =
      "/?page=collection&view=" +
      view +
      (view === "notifications"
        ? "&section=" + encodeURIComponent(this.notificationFrom)
        : "");
    accountRoute("welcome", this.scopedRecords ? location.pathname + location.search : target);
  },
  openCategoryRecords() {
    if (this.busy || this.panel || this.view !== "projects" || this.isProjectSearch) return;
    this.route("records", "", "", {
      category: this.projectCategory, from: "projects", section: this.notificationFrom,
    });
  },
  openProject(id) {
    this.releaseIdentity();
    if (!this.projects.some((p) => p.id === id)) return;
    this.route("project", id, "", {
      from: this.view,
      search: this.isProjectSearch ? "1" : "",
      category: this.projectCategory,
      q: this.searchTerm,
      section: this.notificationFrom,
    });
  },
  openRecord(record) {
    const owned = this.records.find(item => item.id === record?.id);
    if (!owned) return;
    this.route(
      isCollectionFinished(owned.status) ? "complete" : "detail",
      owned.projectId, owned.id,
      {
        from: this.view === "notifications" ? "notifications" : this.scopedRecords ? "records" : "project",
        category: this.projects.find(item => item.id === owned.projectId)?.type,
        section: this.notificationFrom,
      },
    );
  },
  returnToProject() {
    if (returnCollectionHistory("task")) return;
    const q = new URLSearchParams(location.search);
    const project = this.projects.find(item => item.id === (this.current?.projectId || q.get("project")));
    if (this.projectFrom === "records" && (project || this.categories.some(c => c.id === q.get("category")))) {
      collectionNavigate("records", "", "", true, {
        category: project?.type || q.get("category"), from: "projects", section: this.notificationFrom,
      });
      return;
    }
    if (project) collectionNavigate("project", project.id, "", true, {from:"projects", category:project.type});
    else collectionNavigate("home", "", "", true, {category:q.get("category")});
  },
  back() {
    if (!this.busy && !this.modal && !this.panel && returnToOrderCenter())
      return;
    if (this.busy) return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    if (this.view === "home") {
      this.go("home");
      return;
    }
    if (this.view === "announcement") {
      this.route("notifications", "", "", { section: this.notificationFrom });
      return;
    }
    if (this.view === "notifications") {
      this.dismissNotice();
      if (this.notificationFrom === APP_HOME_SECTION) {
        const depth = history.state?.homeNotificationDepth;
        if (Number.isSafeInteger(depth) && depth > 0 && depth < history.length) {
          history.go(-depth);
        } else {
          // A direct link or a restored login has no known home history entry.
          history.replaceState({ page: "home" }, "", "/?page=home");
          window.dispatchEvent(new Event("zhipai-route"));
        }
        return;
      }
      this.route(this.notificationFrom, "");
      return;
    }
    if (this.isProjectSearch) {
      this.rememberScroll();
      if (!returnCollectionHistory("search"))
        collectionNavigate(this.projectCategory === "all" ? "home" : "projects", "", "", true, {
          category:this.projectCategory === "all" ? "" : this.projectCategory, section:this.notificationFrom,
        });
      return;
    }
    if (this.scopedRecords) {
      this.rememberScroll();
      if (!returnCollectionHistory("records"))
        collectionNavigate("projects", "", "", true, {category:this.recordCategory, section:this.notificationFrom});
      return;
    }
    if (this.view === "projects") {
      if (this.projectCategory !== "all") {
        this.rememberScroll();
        if (!returnCollectionHistory("category"))
          collectionNavigate("home", "", "", true);
      } else this.route("home", "");
      return;
    }
    if (this.view === "project") {
      this.dismissNotice();
      const scanBack = new URLSearchParams(location.search).get("scanBack");
      if (scanBack) {
        try {
          const target = new URL(scanBack, location.origin);
          if (
            target.origin === location.origin &&
            [
              "home",
              "album",
              "my",
              "collection",
              "specifications",
              "orders",
            ].includes(target.searchParams.get("page")) &&
            target.searchParams.get("view") !== "project"
          ) {
            history.replaceState({}, "", target);
            window.dispatchEvent(new Event("zhipai-route"));
            return;
          }
        } catch (_) {}
      }
      if (this.projectFrom === "projects" && (this.projectCategory !== "all" || this.dedicatedSearch)) {
        this.rememberScroll();
        if (returnCollectionHistory("project")) return;
      }
      if(this.projectFrom==="projects" && this.dedicatedSearch) {
        collectionNavigate("projects","","",true,{category:this.projectCategory,search:"1",q:this.projectQuery,section:this.notificationFrom});
        return;
      }
      if (["notifications", "announcement"].includes(this.projectFrom)) {
        this.route(this.projectFrom, "", "", { section:this.notificationFrom, message:this.messageId });
      } else {
        collectionNavigate("projects", "", "", true, {category:this.project.type});
      }
      return;
    }
    if (
      ["detail", "complete"].includes(this.view) &&
      this.projectFrom === "notifications"
    ) {
      this.route("notifications", "", "", { section: this.notificationFrom });
      return;
    }
    if (["detail", "complete"].includes(this.view)) this.returnToProject();
    else collectionNavigate("home", "", "", true);
  },
  openRequirements() {
    if (this.busy || this.panel || this.view !== "project") return;
    this.previousFocus = document.activeElement;
    this.error = "";
    this.panel = "requirements";
    this.$nextTick(() =>
      this.$refs.collectionDialog
        ?.querySelector("button")
        ?.focus({ preventScroll: true }),
    );
  },
  get emailLink() {
    return this.supportEmail
      ? "mailto:" +
          this.supportEmail +
          "?subject=" +
          encodeURIComponent("专项采集咨询")
      : undefined;
  },
  openEmailContact() {
    if (
      this.busy ||
      (!this.isRecordView && this.view !== "services") ||
      (this.panel && !["taskSupport", "serviceHelp"].includes(this.panel))
    )
      return;
    if (!this.panel) this.previousFocus = document.activeElement;
    this.error = "";
    this.contactNotice = "";
    this.panel = "email";
    this.$nextTick(() =>
      this.$refs.collectionDialog
        ?.querySelector("button")
        ?.focus({ preventScroll: true }),
    );
  },
  confirmEmailContact() {
    if (
      !["email", "taskSupport"].includes(this.panel) ||
      !this.supportEmail ||
      this.busy
    )
      return false;
    this.contactNotice =
      "如未打开邮箱，可复制邮箱后自行联系。邮件需由你在邮箱应用中发送。";
    return true;
  },
  async copySupportEmail() {
    if (!this.supportEmail) return;
    const email = this.supportEmail,
      token = this.task;
    try {
      await navigator.clipboard.writeText(email);
      if (token === this.task && ["email", "taskSupport"].includes(this.panel))
        this.contactNotice = "邮箱已复制";
    } catch (_) {
      if (token === this.task)
        this.contactNotice = "复制失败，请长按邮箱地址复制。";
    }
  },
  openPanel(panel) {
    if (
      (panel === "serviceHelp" ? this.busy : this.disabled) ||
      ![
        "identity",
        "verify",
        "alternate",
        "employee",
        "qr",
        "qrCheck",
        "confirm",
        "reviewReason",
        "taskSupport",
        "serviceHelp",
        "email",
        "payment",
        "existing",
        "requirements",
        "projectRecords",
      ].includes(panel)
    )
      return;
    this.previousFocus = document.activeElement;
    this.error = "";
    this.panel = panel;
    this.$nextTick(() =>
      this.$refs.collectionDialog?.querySelector("button,input,select")?.focus({
        preventScroll: true,
      }),
    );
  },
  closePanel() {
    if (this.busy) return;
    if (["captureMethod","shootingGuide"].includes(this.panel)) {
      this.skipShootingPrompt=false;
      if (history.state?.collectionCaptureLayer && typeof history.back === "function") {
        history.back();
      } else this.panel=this.panel==="shootingGuide" ? "captureMethod" : null;
      return;
    }
    this.releaseIdentity();
    this.panel = null;
    this.contactNotice = "";
    this.$nextTick(() =>
      this.previousFocus?.focus({
        preventScroll: true,
      }),
    );
  },
  releaseIdentity() {
    this.task++;
    for (const side of ["front", "back"]) {
      if (this.idURLs[side]) URL.revokeObjectURL(this.idURLs[side]);
      this.idURLs[side] = "";
      this.idSides[side] = null;
    }
    if (this.qrURL) URL.revokeObjectURL(this.qrURL);
    this.qrURL = "";
    this.qr = null;
    this.qrRead = false;
    this.qrPrototype = false;
    this.identity = {
      name: "",
      number: "",
      lastFour: "",
    };
  },
  begin() {
    if (this.disabled || !this.guardCollect()) return;
    if (collectionScanService.pending?.projectId === this.projectId) {
      collectionScanService.pending.loginRequested = false;
      this.resumeScan();
      return;
    }
    if (!this.account.loggedIn) {
      accountRoute(
        "welcome",
        "/?page=collection&view=project&project=" + this.projectId,
      );
      return;
    }
    this.releaseIdentity();
    this.method = this.project.methods[0];
    this.openPanel(
      this.method === "qr"
        ? "qr"
        : this.method === "employee"
          ? "employee"
          : this.method === "id"
            ? "identity"
            : "alternate",
    );
  },
  async uploadIdentity(e, side) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || this.busy) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 15 * 1048576
    ) {
      this.error = "请选择15 MB以内的 JPG、PNG 或 WebP 图片";
      return;
    }
    try {
      const token = this.task;
      await decodePhotoBlob(file);
      if (token !== this.task || !["identity", "verify"].includes(this.panel))
        return;
      if (this.idURLs[side]) URL.revokeObjectURL(this.idURLs[side]);
      this.idSides[side] = file;
      this.idURLs[side] = URL.createObjectURL(file);
      this.error = "";
    } catch (_) {
      this.error = "图片无法读取，请重新上传";
    }
  },
  reviewIdentity() {
    if (!this.idSides.front || !this.idSides.back) return;
    this.openPanel("verify");
  },
  alternate() {
    const method = this.identityMethods[0];
    if (this.disabled || !method) return;
    this.method = method;
    this.openPanel("alternate");
  },
  async uploadQR(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || this.busy) return;
    const token = ++this.task;
    const owner = this.account.session?.phone;
    this.busy = true;
    this.error = "";
    try {
      validateCollectionCodeFile(file);
      const image = await decodePhotoBlob(file);
      const code = await readCollectionQRCode(image);
      if (token !== this.task || owner !== this.account.session?.phone) return;
      if (!code) throw Error("未识别到二维码，请上传清晰完整的采集码");
      const result = await resolveCollectionCode(
        code,
        { intent: "collectionIdentity", projectId: this.projectId },
        {
          projects: this.projects,
          entries: this.config.entries,
          bindings: this.config.codeBindings,
        },
      );
      if (token !== this.task || owner !== this.account.session?.phone) return;
      if (this.qrURL) URL.revokeObjectURL(this.qrURL);
      this.qrURL = URL.createObjectURL(file);
      this.qrRead = true;
      this.method = "qr";
      this.qrPrototype = result.prototype;
      this.identity = {
        name: result.identity.name || "",
        number: result.identity.number || "",
        lastFour: result.identity.lastFour || "",
      };
      this.panel = "qrCheck";
    } catch (e) {
      if (token === this.task)
        this.error = /[\u4e00-\u9fff]/.test(e.message)
          ? e.message
          : "二维码识别未完成，请上传清晰完整的图片";
    } finally {
      if (token === this.task) this.busy = false;
    }
  },
  scanCode() {
    if (this.disabled) return;
    const previous = {
      projectId: this.projectId,
      owner: this.account.session?.phone,
      method: this.method,
      identity: { ...this.identity },
      panel: "qr",
      expires: Date.now() + 5 * 60 * 1000,
    };
    this.closePanel();
    this.scanReturn = previous;
    const returnTo = location.pathname + location.search;
    window.dispatchEvent(
      new CustomEvent("zhipai-scan-open", {
        detail: {
          returnTo,
          intent: "collectionIdentity",
          projectId: this.projectId,
        },
      }),
    );
    this.go("scan");
  },
  async receiveScan(detail) {
    // Compatibility event: never treat any non-empty QR string as verification.
    if (
      !detail?.code ||
      this.view !== "project" ||
      detail.projectId !== this.projectId
    )
      return;
    const token = this.task;
    try {
      const result = await resolveCollectionCode(
        detail.code,
        { intent: "collectionIdentity", projectId: this.projectId },
        this.scanDirectory(),
      );
      if (token !== this.task) return;
      collectionScanService.queue(result, this.account.session?.phone);
      this.resumeScan();
    } catch (e) {
      if (token === this.task) this.error = e.message;
    }
  },
  async matchIdentity() {
    if (!this.guardCollect()) return;
    if (this.disabled) return;
    if (this.method === "id" && (!this.idSides.front || !this.idSides.back)) {
      this.error = "请上传身份证两面";
      return;
    }
    if (this.method === "qr" && !this.qrRead) {
      this.error = "请先识别采集二维码";
      return;
    }
    if (!this.project.methods.includes(this.method)) {
      this.error = "此项目不支持当前认证方式";
      return;
    }
    if (!this.account.loggedIn) {
      this.error = "请先登录再认证";
      return;
    }
    const token = ++this.task,
      project = this.project,
      fields = {
        ...this.identity,
        method: this.method,
      },
      owner = this.account.session.phone;
    this.busy = true;
    this.error = "";
    try {
      const person = await collectionAdapter.match(project, fields);
      if (token !== this.task || this.account.session?.phone !== owner) return;
      if (!this.guardCollect(project)) return;
      const existing = this.records.find(
        (r) =>
          !r.fixture &&
          r.projectId === project.id &&
          r.name === person.name &&
          r.identifierKey === person.identifierKey,
      );
      if (existing) {
        this.recordId = existing.id;
        this.panel = "existing";
        return;
      }
      const record = {
        id: crypto.randomUUID(),
        owner,
        method: this.method,
        identifierKey: person.identifierKey,
        projectId: project.id,
        name: person.name,
        number: person.number,
        lastFour: person.lastFour,
        status: "pending",
        payment: {
          id: "collection-" + crypto.randomUUID(),
          amount: project.price,
          status: "pending",
          createdAt: Date.now(),
        },
        customer: String(Date.now()),
        photo: null,
        createdAt: Date.now(),
        fixture: false,
      };
      await this.recordsStore.commit([record, ...this.recordsStore.items]);
      if (token !== this.task) return;
      this.releaseIdentity();
      this.busy = false;
      this.openRecord(record);
    } catch (e) {
      if (token === this.task)
        this.error = /[\u4e00-\u9fff]/.test(e.message)
          ? e.message
          : "身份匹配未完成，请重试";
    } finally {
      if (token === this.task) this.busy = false;
    }
  },
  async capture() {
    if (!this.guardCollect()) return;
    if (
      this.disabled ||
      !this.current ||
      !canEditCollectionPhoto(this.current.status)
    )
      return;
    if (this.current.fixture) {
      this.error = "此记录用于展示状态，请返回项目创建本人的采集记录";
      return;
    }
    if (!this.guardCollectionPayment()) return;
    if (this.panel || !this.canChooseCapture) return;
    this.previousFocus = document.activeElement;
    this.shootingMode = "";
    this.setCaptureLayer(false);
  },
  get canChooseCapture() {
    return this.isRecordView && !this.disabled && !!this.current && !this.current.fixture &&
      this.current.payment?.status === "paid" && this.canCollect && canEditCollectionPhoto(this.current.status);
  },
  setCaptureLayer(guide) {
    this.skipShootingPrompt = false;
    this.error = "";
    const layer = { record:this.recordId, mode:this.shootingMode, guide };
    history.pushState({...history.state,collectionCaptureLayer:layer}, "", location.href);
    this.panel = guide ? "shootingGuide" : "captureMethod";
  },
  chooseShootingMode(mode) {
    if (this.panel !== "captureMethod" || !this.canChooseCapture || !Object.hasOwn(shootingGuides,mode)) return;
    this.shootingMode = mode;
    if (skipShootingGuide(mode)) this.launchCollectionCamera(mode);
    else {
      const picker=history.state?.collectionCaptureLayer;
      if(picker) history.replaceState({...history.state,collectionCaptureLayer:{...picker,mode}},"",location.href);
      this.setCaptureLayer(true);
    }
  },
  acceptShootingGuide() {
    if (this.panel !== "shootingGuide" || !this.canChooseCapture) return;
    if (this.skipShootingPrompt) rememberShootingGuide(this.shootingMode);
    this.launchCollectionCamera(this.shootingMode);
  },
  async useCaptureFile(file) {
    if (this.panel !== "captureMethod" || !this.canChooseCapture) return;
    const record = this.recordId, token=this.task;
    try {
      if (!file.size || file.size > 30*1048576 || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw Error();
      const photo = await uploadedPhoto(file);
      if (this.task === token && this.panel === "captureMethod" && this.recordId === record && this.canChooseCapture)
        this.launchCollectionCamera("album",photo);
    } catch {
      if(this.task === token && this.panel === "captureMethod") this.error="照片无法读取，请选择30 MB以内的 JPG、PNG 或 WebP。";
    }
  },
  launchCollectionCamera(mode, photo=null) {
    if(!this.canChooseCapture) return;
    const context={intent:"collectionCapture", recordId:this.current.id, captureMode:mode,
      returnTo:location.pathname+location.search};
    const state={...history.state};
    delete state.collectionCaptureLayer;
    history.replaceState(state,"",location.href);
    this.panel=null;
    window.dispatchEvent(new CustomEvent("zhipai-camera-open",{detail:{returnTo:context.returnTo}}));
    window.dispatchEvent(new CustomEvent("zhipai-camera-intent",{detail:context}));
    if(photo) {
      window.dispatchEvent(new CustomEvent("zhipai-photo-chosen",{detail:{
        photo,kind:"phone",context:{intent:"camera",exitTo:context.returnTo,cameraCaller:"collectionCapture",cameraCreationContext:context}
      }}));
    } else this.go("camera");
  },
  async acceptPhoto(detail) {
    const record = this.recordsStore.items.find(
      (r) => r.id === detail?.recordId,
    );
    if (
      !record ||
      record.fixture ||
      record.owner !== this.account.session?.phone ||
      record.payment?.status !== "paid" ||
      !detail.photo?.blob ||
      !canEditCollectionPhoto(record.status)
    )
      return;
    if (
      !this.guardCollect(
        this.projects.find((p) => p.id === record.projectId) || this.project,
      )
    )
      return;
    try {
      const next = this.recordsStore.items.map((r) =>
        r.id === record.id
          ? {
              ...r,
              photo: {
                ...detail.photo,
              },
              status: "draft",
              reason: "",
              updatedAt: Date.now(),
            }
          : r,
      );
      await this.recordsStore.commit(next);
      this.loadPhoto();
      this.showNotice("照片已制作，请核对后提交审核");
    } catch (_) {
      this.error = "照片未能保存到采集记录，请重新拍摄";
    }
  },
  async submit() {
    if (!this.guardCollect()) return;
    if (
      this.disabled ||
      this.statusKey !== "draft" ||
      this.current.owner !== this.account.session?.phone ||
      !this.current.photo?.blob
    )
      return;
    if (!this.guardCollectionPayment()) return;
    this.openPanel("confirm");
  },
  async confirmSubmit() {
    if (!this.guardCollect()) return;
    if (!this.guardCollectionPayment()) return;
    if (
      this.disabled ||
      this.statusKey !== "draft" ||
      this.current.owner !== this.account.session?.phone ||
      !this.current.photo?.blob
    )
      return;
    const token = ++this.task,
      snapshot = {
        ...this.current,
        photo: {
          ...this.current.photo,
        },
      };
    this.busy = true;
    this.error = "";
    try {
      const updated = await collectionAdapter.submit(snapshot);
      if (token !== this.task || snapshot.owner !== this.account.session?.phone)
        return;
      await this.recordsStore.commit(
        this.recordsStore.items.map((r) => (r.id === updated.id ? updated : r)),
      );
      if (token !== this.task) return;
      this.panel = null;
      this.showNotice("照片已提交审核");
    } catch (_) {
      if (token === this.task) this.error = "提交未完成，照片已保留，请重试";
    } finally {
      if (token === this.task) this.busy = false;
    }
  },
  async copyCustomer(record = this.current) {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.customer);
      this.showNotice("客服号已复制");
    } catch (_) {
      this.showNotice("无法自动复制，请长按客服号复制");
    }
  },
  download() {
    if (
      !["complete", "uploaded"].includes(this.statusKey) ||
      !this.current?.photo?.blob
    ) {
      this.error = "此记录暂无可下载的实际照片";
      return;
    }
    downloadAlbumBlob(
      this.current.photo.blob,
      "采集照片-" + this.current.id + ".jpg",
    );
  },
  primary() {
    if (!this.current || this.disabled) return;
    if (canEditCollectionPhoto(this.current.status) && !this.guardCollect())
      return;
    if (this.needsPayment) {
      this.openPayment();
      return;
    }
    if (this.status.action === "capture") this.capture();
    else if (this.status.action === "submit") this.submit();
    else if (this.status.action === "download") this.download();
    else if (this.status.action === "support") this.openTaskSupport();
    else this.back();
  },
  trap(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = [
        ...this.$refs.collectionDialog.querySelectorAll(
          "button:not([disabled]),a[href],input:not([type=file]),select",
        ),
      ].filter((n) => n.getClientRects().length),
      first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  },
}));
export {
  collectionProjectState,
  COLLECTION_PROJECTS,
  COLLECTION_STATUSES,
  collectionDB,
  openCollectionDB,
  readCollectionRecords,
  writeCollectionRecords,
  collectionFixtures,
  collectionAdapter,
  collectionNavigate,
};
