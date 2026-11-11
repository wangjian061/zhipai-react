export const shootingGuides = {
  front: {
    cameraLabel: "前置摄像头",
    captureLabel: "自动拍摄",
    guideTitle: "请固定手机进行拍摄",
    alt: "左侧支架固定竖直手机，右侧被拍者正对屏幕",
    steps: [
      "将手机竖着固定在支架上或者桌面上。",
      "屏幕朝向您，镜头与视线齐平。",
      "正对镜头，让头和双肩入框。",
      "站稳等候，取景到位后会自动拍摄。",
    ],
  },
  rear: {
    cameraLabel: "后置摄像头",
    captureLabel: "他人帮拍",
    guideTitle: "邀请他人帮您拍摄",
    alt: "左侧同伴竖拿手机，后置镜头朝向右侧站立的被拍者",
    steps: [
      "请同伴竖拿手机，使用后置镜头。",
      "请同伴将镜头抬到您的视线高度。",
      "您正对镜头，让头和双肩入框。",
      "取景到位后，请同伴按下快门。",
    ],
  },
};
export function skipShootingGuide(mode) {
  try {
    return localStorage.getItem("zhipai.collection.shooting-guide.v1." + mode) === "1";
  } catch {
    return false;
  }
}

// Lightweight on-device framing, not the institution's server-side compliance check.
export function faceInFrame(faces, width, height) {
  if (faces.length !== 1 || !width || !height) return false;
  const r = faces[0].boundingBox,
    cx = (r.x + r.width / 2) / width,
    cy = (r.y + r.height / 2) / height;
  return (
    cx >= 0.3 &&
    cx <= 0.7 &&
    cy >= 0.2 &&
    cy <= 0.58 &&
    r.width / width >= 0.13 &&
    r.width / width <= 0.56 &&
    r.y > 0 &&
    r.y + r.height < height * 0.78
  );
}
