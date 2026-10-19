const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
// Brand and supplied QR are embedded unchanged so exported files are self-contained.
export function createSharePoster(entry, { art, logo, qr }) {
  const headline = entry?.headline || ["证件照制作", "一张就搞定"];
  const tags = ["尺寸裁剪", "背景更换", "照片精修", "排版冲印"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="880" viewBox="0 0 640 880" style="font-family:'PingFang SC','Microsoft YaHei',sans-serif">
    <defs>
      <linearGradient id="share-paper" x2=".25" y2="1"><stop stop-color="#a8bdfb"/><stop offset=".4" stop-color="#e9f2fc"/><stop offset=".75" stop-color="#e7edff"/><stop offset="1" stop-color="#c4c1fb"/></linearGradient>
      <radialGradient id="share-halo"><stop stop-color="#fff" stop-opacity=".94"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="share-glass" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
    </defs>
    <rect width="640" height="880" rx="28" fill="url(#share-paper)"/>
    <ellipse cx="160" cy="420" rx="470" ry="430" fill="url(#share-halo)"/>
    <image href="${logo}" x="42" y="29" width="36" height="42"/>
    <text x="91" y="58" font-size="25" font-weight="700" fill="#203858">知拍证件照</text>
    <text x="42" y="139" font-size="59" font-weight="800" letter-spacing="-1" fill="#102956">${escape(headline[0])}</text>
    <text x="42" y="211" font-size="59" font-weight="800" letter-spacing="-1" fill="#0032ff">${escape(headline[1])}</text>
    <rect x="42" y="238" width="556" height="43" rx="14" fill="url(#share-glass)" stroke="#fff" stroke-opacity=".7"/>
    ${tags.map((tag, i) => `<text x="${111 + i * 139}" y="266" text-anchor="middle" font-size="19" fill="#32486b">${tag}</text>${i < 3 ? `<path d="M${181 + i * 139} 251v17" stroke="#9caed1" stroke-opacity=".45"/>` : ""}`).join("")}
    <image href="${art}" x="94" y="291" width="452" height="383" preserveAspectRatio="xMidYMid meet"/>
    <rect x="26" y="688" width="588" height="166" rx="22" fill="url(#share-glass)" stroke="#fff" stroke-opacity=".75"/>
    <image href="${qr}" x="42" y="691" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
    <text x="226" y="740" font-size="29" font-weight="700" fill="#203858">扫码体验知拍</text>
    <text x="226" y="778" font-size="20" fill="#526586">长按识别 · 开始制作</text>
    <text x="226" y="819" font-size="18" fill="#526586">${escape(entry ? entry.title + " · 尽在知拍" : "你的随身证件照工具")}</text>
  </svg>`;
}
export async function renderSharePoster(markup) {
  await document.fonts?.ready;
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 1760;
    const context = canvas.getContext("2d");
    if (!context) throw Error("canvas unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("image unavailable"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
