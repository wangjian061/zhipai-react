export const shootingGuides = {
  front: {
    title: "前置摄像头 · 自动拍摄",
    alt: "手机竖放在左侧支架上，右侧被拍人正对手机",
    steps: [
      [
        "放稳手机，向后站",
        "手机竖放，屏幕朝向自己。向后站，让头和双肩完整入框。",
      ],
      [
        "正对镜头，等待自动拍摄",
        "按屏幕提示调整姿势，保持不动。符合要求后，手机会自动拍摄。",
      ],
    ],
  },
  rear: {
    title: "后置摄像头 · 他人帮拍",
    alt: "左侧帮拍人竖握手机，后置镜头正对右侧被拍人",
    steps: [
      [
        "请他人拿稳手机",
        "请对方竖握手机，用后置镜头正对你。双肩摆正，看向镜头。",
      ],
      [
        "看屏幕提示，由对方按快门",
        "请对方根据屏幕提示，帮你调整姿势。符合要求后，由对方按下快门。",
      ],
    ],
  },
};
const skipped = new Set();
const key = (mode) => "zhipai.collection.shooting-guide.v1." + mode;
export function skipShootingGuide(mode) {
  try {
    return skipped.has(mode) || localStorage.getItem(key(mode)) === "1";
  } catch {
    return skipped.has(mode);
  }
}
export function rememberShootingGuide(mode) {
  if (!Object.hasOwn(shootingGuides, mode)) return;
  skipped.add(mode);
  try {
    localStorage.setItem(key(mode), "1");
  } catch {
    /* Session preference is still available. */
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
