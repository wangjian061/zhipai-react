import React, { useRef, useState } from "react";
import { SheetFrame } from "./SharedSheet.jsx";
import ToolPhotoSelection from "./ToolPhotoSelection.jsx";
import {
  assertDocumentPhotoCount,
  compressDocumentPhoto,
  DOCUMENT_PHOTO_MAX_BYTES,
} from "../domain/document-photos.js";
import {
  copyFinishedForMember,
  importArchiveImage,
  importDocumentImage,
} from "../domain/album-spaces.js";

export default function FamilyPhotoPicker({
  library,
  busy,
  error,
  onAdd,
  onClose,
  onTakePhoto,
  trigger,
  documentSlots,
}) {
  const phone = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [activity, setActivity] = useState("");
  const [pickError, setPickError] = useState("");
  const forDocument = documentSlots !== undefined;
  function openPhone() {
    setPickError("");
    phone.current?.click();
  }
  async function pickPhone(event) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!files.length || busy) return;
    setPickError("");
    if (forDocument) {
      try {
        assertDocumentPhotoCount(files.length, documentSlots);
      } catch (failure) {
        setPickError(failure.message);
        return;
      }
      return onAdd(async () => {
        setActivity(
          files.some(({ size }) => size > DOCUMENT_PHOTO_MAX_BYTES)
            ? "正在压缩照片…"
            : "正在读取照片…",
        );
        try {
          const images = [];
          for (const file of files)
            images.push(await importDocumentImage(file));
          return images;
        } finally {
          setActivity("");
        }
      });
    }
    if (files.length !== 1) {
      setPickError("每次只能选择 1 张照片。");
      return;
    }
    return onAdd(async () => {
      // The Web prototype demonstrates acceptance without recognizing the photo.
      setActivity("正在校验证件照（演示）…");
      try {
        return [await importArchiveImage(files[0])];
      } catch (failure) {
        throw new Error(
          failure instanceof DOMException
            ? "图片未能读取，请重新选择。"
            : failure.message || "图片未能读取，请重新选择。",
        );
      } finally {
        setActivity("");
      }
    }, "phone");
  }
  function confirmLibrary() {
    const photo = library.finished.find((image) => image.id === candidate);
    setPickError("");
    if (!forDocument)
      return onAdd(async () => [await copyFinishedForMember(photo)]);
    if (!documentSlots) {
      setPickError("这份证件已达到 5 张照片的上限。");
      return;
    }
    return onAdd(async () => {
      setActivity(
        photo?.blob?.size > DOCUMENT_PHOTO_MAX_BYTES
          ? "正在压缩照片…"
          : "正在读取照片…",
      );
      try {
        return [
          await compressDocumentPhoto(await copyFinishedForMember(photo)),
        ];
      } finally {
        setActivity("");
      }
    });
  }
  return (
    <>
      <input
        ref={phone}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={forDocument && documentSlots > 1}
        onChange={pickPhone}
      />
      <SheetFrame
        id="family-photo-picker"
        opened
        className="photo-selection-sheet"
        returnFocusRef={trigger}
        busy={busy}
        onClose={onClose}
      >
        <ToolPhotoSelection
          forMember
          titleId="family-photo-picker"
          library={library}
          selectedId={candidate}
          mascot="/assets/bear-album.webp"
          busy={busy}
          error={pickError || error}
          selectionHint={
            forDocument
              ? `本次最多选 ${documentSlots} 张，单张超过 5 MB 会自动压缩。`
              : "从手机相册每次选 1 张。"
          }
          activity={activity}
          onClose={onClose}
          onPhone={openPhone}
          onCreate={onTakePhoto}
          onSelect={setCandidate}
          onConfirm={confirmLibrary}
        />
      </SheetFrame>
    </>
  );
}
