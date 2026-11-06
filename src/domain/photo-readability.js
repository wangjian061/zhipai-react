// Shared file-readability boundary for photo detail and the personal photo sheet.
// This verifies decoding only; portrait/content checks remain in each tool.
export async function decodePhotoBlob(blob) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error("照片文件不可用");
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!(image.naturalWidth > 0 && image.naturalHeight > 0))
      throw new Error("照片无法读取");
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function photoReadabilityState() {
  return {
    photoReadStatus: "idle",
    photoReadBlob: null,
    photoReadEpoch: 0,
    photoRenderKey: 0,
    async checkPhotoReadability() {
      const blob = this.photo?.blob,
        epoch = ++this.photoReadEpoch;
      this.photoRenderKey++;
      this.photoReadBlob = blob || null;
      this.photoReadStatus = blob ? "checking" : "idle";
      if (!blob) return;
      try {
        await decodePhotoBlob(blob);
        if (epoch === this.photoReadEpoch && this.photo?.blob === blob)
          this.photoReadStatus = "ready";
      } catch {
        if (epoch === this.photoReadEpoch && this.photo?.blob === blob)
          this.photoReadStatus = "failed";
      }
    },
    failPhotoReadability(blob) {
      if (
        this.photo?.blob !== blob ||
        (this.photoReadStatus === "failed" && this.photoReadBlob === blob)
      )
        return;
      this.photoReadEpoch++;
      this.photoReadBlob = blob;
      this.photoReadStatus = "failed";
    },
  };
}

export const isPhotoReadable = (state) =>
  state.photoReadStatus === "ready" &&
  state.photoReadBlob === state.photo?.blob;
