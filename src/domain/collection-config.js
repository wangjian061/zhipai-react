// Replaceable frontend configuration: featured projects, entry switches and center notices.
export const COLLECTION_CATEGORIES = [
  {
    id: "enrollment",
    recordsTitle: "新生采集记录",
    name: "新生入学",
    subtitle: "入学证照 · 规范采集",
    icon: "collection-school",
    image: "assets/collection-icon-school.webp",
    iconImage: "assets/collection-icon-school.webp",
  },
  {
    id: "graduate",
    recordsTitle: "毕业生采集记录",
    name: "毕业生",
    subtitle: "毕业图像 · 留存档案",
    icon: "collection-graduate",
    image: "assets/collection-icon-graduate.webp",
    iconImage: "assets/collection-icon-graduate.webp",
  },
  {
    id: "association",
    recordsTitle: "其它采集记录",
    name: "其它采集",
    subtitle: "会员证照 · 身份登记",
    icon: "collection-org",
    image: "assets/collection-icon-organization.webp",
    iconImage: "assets/collection-icon-organization.webp",
  },
];

export const GRADUATE_FLOW_STEPS = [
  ["获取图像采集码", "打开学信网，保存本人高清图像采集码", "学生点手机上的「保存图片」，保存脱敏示例中的学信码"],
  ["扫码绑定采集资格", "扫码或从相册选取采集码，核验并绑定学籍", "左边用手机扫描另一台设备上的学信码，右边在相册勾选已保存的码图"],
  ["拍摄照片注意姿势", "正对镜头端正坐姿，双耳露出、衣着得体", "一位同学举起手机拍照，取景屏中另一位学生端坐、平肩、双耳露出"],
  ["提交等待审核", "确认照片无误后一键提交，等待审核", "学生在手机上核对蓝底照片，准备点「确认提交审核」"],
  ["上网完成", "照片已成功上传至学信网，可在采集记录查看", "采集记录的已完成页签中，一条院校名称已脱敏的记录显示绿色「上网完成」"],
].map(([title, description, alt], index) => ({
  id: index + 1, title, description, alt, image: `/assets/graduate-flow-step-${index + 1}.webp`,
}));

export const ENROLLMENT_FLOW_STEPS = [
  ["搜索院校", "输入录取院校名称，查找所属高校入学采集入口", "手机上的院校搜索结果列出示例学院的新生照片采集入口"],
  ["获取采集学籍", "输入学号或证件号等信息，在线获取本人采集学籍", "在认证抽屉选择学号认证，填写本人姓名和学号"],
  ["确认学籍信息", "仔细核对姓名、学院与专业信息，确认无误后继续", "在已匹配的采集任务中核对本人姓名与所属院校"],
  ["拍摄照片", "正对镜头自然端坐，按拍摄指引完成入学照拍摄", "同学举起手机拍摄，后置取景界面中可见新生的正脸和双肩"],
  ["提交审核", "确认成片无误后一键提交，等待审核", "提交审核抽屉中展示蓝底证件照、采集信息和确认提交审核按钮"],
  ["采集成功", "审核通过即完成采集，可在采集记录随时查看进度", "采集记录的已完成页签里，新生照片旁的绿色状态显示采集完成"],
].map(([title, description, alt], index) => ({
  id: index + 1, title, description, alt, image: `/assets/enrollment-flow-step-${index + 1}.webp`,
}));

function resolveHeroMode(configured, preview) {
  if (preview === "flow" || preview === "schools") return preview;
  return configured === "schools" ? "schools" : "flow";
}
export function graduateHeroMode(config, preview) {
  return resolveHeroMode(config?.graduateHeroMode, preview);
}
export function enrollmentHeroMode(config, preview) {
  return resolveHeroMode(config?.enrollmentHeroMode, preview);
}
// Project-owner artwork fields remain independent from category illustrations.
export const COLLECTION_PROJECT_MEDIA = {
  enrollment: {
    image: "assets/campus-shenzhen.webp",
    bannerImage: "assets/campus-shenzhen.webp",
  },
  graduate: {
    image: "assets/campus-hainan.webp",
    bannerImage: "assets/campus-hainan.webp",
    crest: "assets/university-hainnu-crest.webp",
    summary: "面向 2026 届毕业生采集学历照片。",
  },
  association: {
    image: "assets/collection-org-building.webp",
    bannerImage: "assets/collection-org-building.webp",
  },
  "enrollment-vocational": {
    image: "assets/collection-campus.webp",
    bannerImage: "assets/collection-campus.webp",
  },
  "graduate-degree": {
    image: "assets/campus-shenzhen.webp",
    bannerImage: "assets/campus-shenzhen.webp",
    crest: "assets/university-szu-crest.webp",
    summary: "面向 2027 届毕业生采集学历照片。",
  },
  "association-engineering": {
    image: "assets/collection-org-engineering.webp",
    bannerImage: "assets/collection-org-engineering.webp",
  },
  "enrollment-postgraduate": {
    image: "assets/campus-hainan.webp",
    bannerImage: "assets/campus-hainan.webp",
  },
  "graduate-continuing": {
    image: "assets/university-ouc-campus.webp",
    bannerImage: "assets/university-ouc-campus.webp",
    crest: "assets/university-ouc-crest.webp",
    summary: "面向开放教育毕业生采集学历照片。",
  },
  "graduate-xmu": {
    image: "assets/university-xmu-campus.webp",
    bannerImage: "assets/university-xmu-campus.webp",
    crest: "assets/university-xmu-crest.webp",
    summary: "面向 2027 届本科毕业生采集学历照片。",
  },
  "graduate-zju": {
    image: "assets/university-zju-campus.webp",
    bannerImage: "assets/university-zju-campus.webp",
    crest: "assets/university-zju-crest.webp",
    summary: "面向 2027 届毕业研究生采集学历照片。",
  },
  "association-talent": {
    image: "assets/collection-org-talent.webp",
    bannerImage: "assets/collection-org-talent.webp",
  },
};
const associationProcessSteps = [
  ["沟通需求", "确认款式材质、预估数量与交付周期"],
  ["线上采集", "开通专属入口，成员自助拍照并按名单归集"],
  ["样张核对", "自动匹配人像与版式，提供样张或样卡确认"],
  ["批量交付", "定稿后批量印制质检，按收货清单寄送"],
];

export const ASSOCIATION_OFFERS = [
  {
    id: "layout",
    title: "背胶模切排版照",
    eyebrow: "职场建档 · 随撕随贴",
    summary: "免剪精准模切，一撕即贴",
    poster: "/assets/association-banner-diecut.webp",
  },
  {
    id: "employeeBadge",
    title: "企业工牌定制",
    eyebrow: "企业 / 团队批量定制",
    summary: "员工照统一采集，PVC 工牌含挂绳直出",
    poster: "/assets/association-banner-badge.webp",
    description: "员工照与工号逐一匹配，支持按需定制版面设计，成品工牌配套编织挂绳。",
    heroImage: "/assets/association-detail-badge.webp",
    heroAlt: "正反两张哑光工牌，搭配藏青编织挂绳与金属扣",
    highlights: ["人像工号匹配", "支持打样确认", "批量直发"],
    specs: [
      ["卡面材质", "哑光 PVC / 高清覆膜"],
      ["配套挂件", "编织挂绳 + 金属扣"],
      ["照片核对", "按工号姓名自动匹配"],
      ["适用场景", "入职 / 门禁 / 展会"],
    ],
    processSteps: associationProcessSteps,
  },
  {
    id: "certificate",
    title: "比赛证书定制",
    eyebrow: "赛事 / 协会荣誉颁发",
    summary: "特种纸烫金精装，支持选手照批量印制",
    poster: "/assets/association-banner-certificate.webp",
    description: "丝绒烫金封面搭配选手照片，支持按需定制版面设计，按获奖名单批量校对印制。",
    heroImage: "/assets/association-detail-certificate.webp",
    heroAlt: "微敞的烫金丝绒硬壳证书，内页为带人像框位的象牙色特种纸",
    highlights: ["烫金精装封面", "选手照精准嵌位", "批量校对印制"],
    specs: [
      ["封面工艺", "丝绒硬壳烫金封面"],
      ["内页纸张", "象牙特种纸人像位"],
      ["信息排版", "姓名奖项批量校对"],
      ["适用场景", "竞赛 / 评奖 / 颁证"],
    ],
    processSteps: associationProcessSteps,
  },
  {
    id: "membership",
    title: "会员卡定制",
    eyebrow: "行业协会 / 俱乐部专属",
    summary: "人像与会员编号精准匹配，磨砂拉丝质感",
    poster: "/assets/association-banner-membership.webp",
    description: "人像与会员编号逐一核对，支持按需定制版面设计，可选磨砂 PVC 或拉丝金属卡面。",
    heroImage: "/assets/association-detail-membership.webp",
    heroAlt: "三张圆角会员卡扇形叠放，展示磨砂 PVC 和银色拉丝金属",
    highlights: ["磨砂 / 金属可选", "编号防重核验", "VI 规范定制"],
    specs: [
      ["卡面材质", "磨砂 PVC / 拉丝金属"],
      ["编号核验", "会员号防重缺号核对"],
      ["版面定制", "按协会 / 俱乐部 VI"],
      ["适用场景", "行业协会 / 俱乐部"],
    ],
    processSteps: associationProcessSteps,
  },
];

export const ASSOCIATION_SERVICES = Object.fromEntries(
  ASSOCIATION_OFFERS.filter(offer => offer.heroImage).map(offer => [offer.id, offer]),
);

export const COLLECTION_PROJECT_STATES = {
  not_started: {
    label: "未开始",
    tone: "warm",
    message: "采集尚未开始，当前可查看采集要求与已有记录。",
    severity: "info",
    closeMode: "auto",
  },
  ongoing: {
    label: "进行中",
    tone: "green",
    message: "项目正在进行，请核对采集要求后办理。",
    severity: "info",
    closeMode: "auto",
  },
  ended: {
    label: "已结束",
    tone: "red",
    message: "采集已结束，可查看采集要求与已有记录。",
    severity: "warning",
    closeMode: "manual",
  },
};
export function createCollectionConfig() {
  return {
    graduateHeroMode: "flow",
    enrollmentHeroMode: "flow",
    // Synthetic code bindings for the local prototype, independent of school names.
    // Production replaces these with an authorized backend resolution response.
    codeBindings: [
      {
        schoolCode: "demo-10001",
        organizationId: "demo-college",
        projectIds: ["graduate"],
      },
      {
        schoolCode: "demo-10002",
        organizationId: "demo-technical",
        projectIds: ["graduate-degree"],
      },
      {
        schoolCode: "demo-10003",
        organizationId: "demo-continuing",
        projectIds: ["graduate-continuing"],
      },
      {
        schoolCode: "demo-10004",
        organizationId: "demo-xmu",
        projectIds: ["graduate-xmu"],
      },
      {
        schoolCode: "demo-10005",
        organizationId: "demo-zju",
        projectIds: ["graduate-zju"],
      },
    ],
    featuredProjectIds: [
      "enrollment",
      "graduate",
      "association",
      "enrollment-vocational",
      "graduate-degree",
    ],
    entries: {
      enrollment: true,
      graduate: true,
      association: true,
      notifications: true,
    },
    messages: [
      {
        id: "system-help",
        type: "system",
        title: "专项采集服务指南",
        body: "按所属类别选择本次采集项目，核对项目时间与采集要求后完成身份认证。\n\n拍摄和提交后，请在采集记录中查看办理进度。遇到问题时，知拍客服统一受理并协调相关机构。",
        text: "按所属类别选择项目，完成身份认证后采集照片。采集进度可在采集记录中查看。",
        timestamp: new Date("2026-10-14T08:00:00+08:00").getTime(),
      },
      {
        id: "project-graduate",
        type: "project",
        projectId: "graduate",
        title: "毕业生图像采集已开放",
        body: "请参加本项目的用户先核对项目时间与身份认证要求，再使用本人学信网图像采集码办理。\n\n已经提交审核的用户，可在原采集任务中查看最新进度，无需重复创建任务。",
        text: "请先核对项目时间与身份认证要求，再参加图像采集。",
        timestamp: new Date("2026-10-13T09:00:00+08:00").getTime(),
      },
    ],
  };
}
