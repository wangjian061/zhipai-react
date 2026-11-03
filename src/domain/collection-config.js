// Replaceable frontend configuration: featured projects, entry switches and center notices.
export const COLLECTION_CATEGORIES = [
  {
    id: "enrollment",
    name: "新生入学",
    subtitle: "入学证照 · 规范采集",
    icon: "collection-school",
    image: "assets/collection-icon-school.webp",
    iconImage: "assets/collection-icon-school.webp",
  },
  {
    id: "graduate",
    name: "毕业生",
    subtitle: "毕业图像 · 留存档案",
    icon: "collection-graduate",
    image: "assets/collection-icon-graduate.webp",
    iconImage: "assets/collection-icon-graduate.webp",
  },
  {
    id: "association",
    name: "行业协会",
    subtitle: "会员证照 · 身份登记",
    icon: "collection-org",
    image: "assets/collection-icon-organization.webp",
    iconImage: "assets/collection-icon-organization.webp",
  },
];
// Project-owner artwork fields remain independent from category illustrations.
export const COLLECTION_PROJECT_MEDIA = {
  enrollment: {
    image: "assets/campus-shenzhen.webp",
    bannerImage: "assets/campus-shenzhen.webp",
  },
  graduate: {
    image: "assets/campus-hainan.webp",
    bannerImage: "assets/campus-hainan.webp",
  },
  association: {
    image: "assets/collection-campus.webp",
    bannerImage: "assets/collection-campus.webp",
  },
  "enrollment-vocational": {
    image: "assets/collection-campus.webp",
    bannerImage: "assets/collection-campus.webp",
  },
  "graduate-degree": {
    image: "assets/campus-shenzhen.webp",
    bannerImage: "assets/campus-shenzhen.webp",
  },
  "association-engineering": {
    image: "assets/collection-campus.webp",
    bannerImage: "assets/collection-campus.webp",
  },
  "enrollment-postgraduate": {
    image: "assets/campus-hainan.webp",
    bannerImage: "assets/campus-hainan.webp",
  },
  "graduate-continuing": {
    image: "assets/collection-campus.webp",
    bannerImage: "assets/collection-campus.webp",
  },
  "association-talent": {
    image: "assets/campus-shenzhen.webp",
    bannerImage: "assets/campus-shenzhen.webp",
  },
};
export const COLLECTION_PROJECT_STATES = {
  not_started: {
    label: "未开始",
    tone: "warm",
    message: "项目尚未开始，当前可查看采集要求与已有记录。",
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
    message: "本项目采集已结束，当前仅支持查看项目与已有记录。",
    severity: "warning",
    closeMode: "manual",
  },
};
export function createCollectionConfig() {
  return {
    // Fictional school → institution → project bindings for the local prototype.
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
