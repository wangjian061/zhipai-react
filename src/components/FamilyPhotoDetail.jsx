import React, { useEffect, useState } from "react";
import PhotoActionSheet from "./PhotoActionSheet.jsx";
import { decodePhotoBlob } from "../domain/photo-readability.js";
import { downloadAlbumBlob } from "../domain/album.js";

// Family photos use the established photo/detail/service/download layout too.
export default function FamilyPhotoDetail({ photo, scope, onClose, onDelete, busy, returnFocusRef }) {
  const [image, setImage] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const blob = photo?.blob;
  useEffect(() => {
    if (!blob) return;
    let active = true;
    const url = URL.createObjectURL(blob);
    setImage({ blob, url, status: "checking" });
    decodePhotoBlob(blob).then(
      () => { if (active) setImage({ blob, url, status: "ready" }); },
      () => { if (active) setImage({ blob, url, status: "failed" }); },
    );
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [blob, attempt]);
  const current = image?.blob === blob ? image : null;
  const state = {
    photo, opened: true, downloading, working: busy, notice,
    photoReadable: current?.status === "ready",
    photoReadStatus: current?.status || (blob ? "checking" : "failed"),
    photoRenderKey: attempt,
    url: () => current?.url || "",
    checkPhotoReadability: () => setAttempt(value => value + 1),
    failPhotoReadability: () => setImage(value => value?.status === "failed" ? value : { ...value, status: "failed" }),
    close: onClose, requestDelete: onDelete,
    download() {
      if (downloading || current?.status !== "ready") return;
      setDownloading(true);
      try {
        downloadAlbumBlob(blob, photo.name || "知拍照片.jpg");
        setNotice("已发起照片下载。");
      } catch { setNotice("保存未完成，请重试下载。"); }
      finally { setDownloading(false); }
    },
  };
  return <PhotoActionSheet scope={scope} archive={state} returnFocusRef={returnFocusRef} />;
}
