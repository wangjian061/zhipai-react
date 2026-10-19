// Visible image content, excluding contain-fit gutters and clipped crop overflow.
// Coordinates are percentages of the frame so device preview scaling is preserved.
export function visiblePhotoBounds({
  frame,
  image,
  naturalWidth,
  naturalHeight,
  fit = "contain",
  positionX = 0.5,
  positionY = 0.5,
}) {
  if (
    ![frame?.left, frame?.top, image?.left, image?.top].every(
      Number.isFinite,
    ) ||
    ![
      frame?.width,
      frame?.height,
      image?.width,
      image?.height,
      naturalWidth,
      naturalHeight,
    ].every((value) => Number.isFinite(value) && value > 0)
  )
    return null;
  let { left, top, width, height } = image;
  if (fit === "contain") {
    const scale = Math.min(width / naturalWidth, height / naturalHeight);
    const contentWidth = naturalWidth * scale;
    const contentHeight = naturalHeight * scale;
    left += (width - contentWidth) * positionX;
    top += (height - contentHeight) * positionY;
    width = contentWidth;
    height = contentHeight;
  }
  const x = Math.max(frame.left, left);
  const y = Math.max(frame.top, top);
  const right = Math.min(frame.left + frame.width, left + width);
  const bottom = Math.min(frame.top + frame.height, top + height);
  if (right <= x || bottom <= y) return null;
  return {
    left: ((x - frame.left) / frame.width) * 100,
    top: ((y - frame.top) / frame.height) * 100,
    width: ((right - x) / frame.width) * 100,
    height: ((bottom - y) / frame.height) * 100,
  };
}

export function toolPhotoProcessingLabel(tool) {
  if (!tool.photo || tool.error || tool.saving || tool.paying) return "";
  if (tool.stage === "checking") return "正在检查照片";
  if (tool.stage === "standardizing") return "正在准备照片";
  if (tool.stage === "processing")
    return tool.action === "repair" ? "正在精修照片" : "正在换装";
  if (!tool.previewPending) return "";
  return (
    {
      background: "正在更换背景",
      crop: "正在裁剪照片",
      format: "正在转换格式",
      resize: "正在调整体积",
    }[tool.action] || "正在处理照片"
  );
}
