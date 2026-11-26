// Shared local help source; external screens remain subject to current official interfaces.
export const collectionCodeHelp = {
  institution: {
    title: "机构／院校二维码",
    intro: "由组织本次采集的机构或院校提供。",
    steps: [
      "查看机构或院校发布的采集通知，找到负责人／老师发送的二维码。",
      "二维码在手机里时，先保存图片，再返回知拍从相册识别；现场提供的二维码可直接扫描。",
      "尚未找到二维码时，可联系知拍客服协助核实。",
    ],
    note: "机构码用于进入采集项目，身份认证按项目要求继续办理。",
  },
  chsi: {
    title: "学信网图像采集码",
    url: "https://www.zhipai.com.cn/h5/bystxcj.html",
    intro: "查看学信网图像采集码获取教程。",
    steps: [],
    note: "",
  },
};

// The scanner and graduate landing render the same three steps and tutorial link.
export const universityChsiSteps = [
  { title: "打开学信网", path: "微信搜「学信网」小程序或打开学信网 App" },
  { title: "找到图像采集码", path: "学信档案 → 高等教育信息 → 图像采集码" },
  { title: "保存并回知拍识别", path: "保存完整图片，点下方按钮从相册上传" },
];
