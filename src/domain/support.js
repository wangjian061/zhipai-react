import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

registerController("supportCenter", () => ({
  email: "zpai_service@163.com",
  query: "",
  category: "全部",
  categories: ["全部", "证件照", "照片工具", "专项采集"],
  openId: null,
  copyState: "",
  copyTimer: null,
  faqs: [
    {
      id: "spec",
      category: "证件照",
      question: "怎样选择证件照规格？",
      answer:
        "先查看使用单位要求的尺寸、背景颜色和文件大小，再选择对应规格。同为一寸或二寸的照片也可能有不同要求，请以提交单位的通知为准。",
      keywords: "一寸 二寸 白底 蓝底 红底 尺寸 规格",
    },
    {
      id: "download",
      category: "证件照",
      question: "制作好的照片在哪里下载？",
      answer:
        "制作完成后点击“保存到知拍相册”，照片会保存在知拍相册中。打开照片详情，点击“下载照片”可下载到设备；若未找到文件，可检查浏览器下载记录或手机文件目录。",
      keywords: "下载 保存 找不到 相册",
    },
    {
      id: "resize",
      category: "照片工具",
      question: "怎样调整照片尺寸和文件大小？",
      answer:
        "证照规格和裁剪用于调整照片尺寸；“修改体积”用于设置目标文件体积（KB），从手机相册选图后压缩并保存照片。该工具保持宽高像素不变，如果目标太小无法达到，可增大目标体积。",
      keywords: "像素 KB MB 压缩 裁剪 大小 尺寸",
    },
    {
      id: "format",
      category: "照片工具",
      question: "可以转换哪些照片格式？",
      answer:
        "先确认接收方要求的文件格式，再选择相应的导出格式。可转换的格式以工具页面的选项为准；直接修改文件后缀不会改变图片格式。",
      keywords: "JPG JPEG PNG 格式 转换 后缀",
    },
    {
      id: "code",
      category: "专项采集",
      question: "采集码在哪里获取？",
      answer:
        "采集码或项目入口通常由学校、协会等采集单位提供。未收到时请先查看项目通知或联系负责人；已有入口但无法进入时，可邮件提供项目名称和问题截图。",
      keywords: "采集码 项目 新生 入学 毕业 学校 会员 协会",
    },
    {
      id: "review",
      category: "专项采集",
      question: "照片审核未通过怎么办？",
      answer:
        "先查看未通过原因，核对背景、清晰度、姿态与项目规格。修改和重新提交的方式以项目通知为准；对审核原因有疑问时，请邮件提供项目名称及审核提示。",
      keywords: "审核 驳回 不通过 重新提交 重拍",
    },
  ],
  get filtered() {
    const keyword = this.query.trim().toLowerCase();
    return this.faqs.filter(
      (faq) =>
        (this.category === "全部" || faq.category === this.category) &&
        (!keyword ||
          `${faq.question} ${faq.answer} ${faq.keywords}`
            .toLowerCase()
            .includes(keyword)),
    );
  },
  get emailHref() {
    const current = this.faqs.find((faq) => faq.id === this.openId);
    const topic = current?.question || this.query.trim() || "问题咨询";
    const type =
      current?.category ||
      (this.category === "全部"
        ? "证件照制作 / 照片工具 / 专项采集"
        : this.category);
    const body = `业务类型：${type}\r\n\r\n遇到的问题：${current?.question || this.query.trim()}\r\n\r\n相关采集项目（选填）：\r\n\r\n设备与系统（选填）：\r\n`;
    return `mailto:${this.email}?subject=${encodeURIComponent(`知拍客服｜${topic}`)}&body=${encodeURIComponent(body)}`;
  },
  async copyEmail() {
    clearTimeout(this.copyTimer);
    this.copyState = "";
    try {
      await navigator.clipboard.writeText(this.email);
      this.copyState = "copied";
      this.copyTimer = setTimeout(() => {
        this.copyState = "";
      }, 4500);
    } catch {
      this.copyState = "failed";
    }
  },
  destroy() {
    clearTimeout(this.copyTimer);
  },
}));
export {};
