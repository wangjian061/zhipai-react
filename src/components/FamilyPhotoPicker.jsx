import React, { useEffect, useRef, useState } from "react";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import { SheetFrame } from "./SharedSheet.jsx";
import ToolPhotoSelection from "./ToolPhotoSelection.jsx";
import { albumPhotoId } from "../domain/album.js";
import {
  assertDocumentPhotoCount,
  compressDocumentPhoto,
  DOCUMENT_PHOTO_MAX_BYTES,
  PHONE_ALBUM_PHOTO_MAX_BYTES,
} from "../domain/document-photos.js";
import {
  copyFinishedForMember,
  importPhoneAlbumImage,
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
  const phoneTrigger = useRef(null);
  const pendingRequest = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [activity, setActivity] = useState("");
  const [pickError, setPickError] = useState("");
  const [overLimit, setOverLimit] = useState(0);
  const forDocument = documentSlots !== undefined;

  useEffect(() => {
    function syncConsent() {
      const request = pendingRequest.current;
      const currentId = history.state?.archiveCompressionConsent;
      if (!request) {
        // A refresh or Forward must not restore stale files or reopen consent.
        if (currentId) history.back();
        return;
      }
      if (currentId === request.id) return;
      pendingRequest.current = null;
      setOverLimit(0);
      if (request.accepted && location.href === request.route) request.submit();
    }
    syncConsent();
    window.addEventListener("popstate", syncConsent);
    return () => window.removeEventListener("popstate", syncConsent);
  }, []);

  function openPhone() {
    if (busy || pendingRequest.current) return;
    setPickError("");
    phone.current?.click();
  }

  function submitPhone(files, consent) {
    return onAdd(
      async () => {
        setActivity(
          consent
            ? "正在压缩照片…"
            : forDocument
              ? "正在读取照片…"
              : "正在校验证件照（演示）…",
        );
        try {
          const images = [];
          for (const file of files)
            images.push(await importPhoneAlbumImage(file, consent));
          return images;
        } finally {
          setActivity("");
        }
      },
      forDocument ? undefined : "phone",
    );
  }

  function pickPhone(event) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!files.length || busy || pendingRequest.current) return;
    setPickError("");
    if (forDocument) {
      try {
        assertDocumentPhotoCount(files.length, documentSlots);
      } catch (failure) {
        setPickError(failure.message);
        return;
      }
    } else if (files.length !== 1) {
      setPickError("每次只能选择 1 张照片。");
      return;
    }
    const count = files.filter(
      ({ size }) => size > PHONE_ALBUM_PHOTO_MAX_BYTES,
    ).length;
    if (!count) return submitPhone(files, false);
    const id = albumPhotoId();
    const route = location.href;
    pendingRequest.current = {
      id,
      route,
      accepted: null,
      submit: () => submitPhone(files, true),
    };
    try {
      history.pushState(
        { ...history.state, archiveCompressionConsent: id },
        "",
        route,
      );
      setOverLimit(count);
    } catch {
      pendingRequest.current = null;
      setPickError("暂时无法确认压缩，请重新选择。");
    }
  }

  function resolveConsent(accepted) {
    const request = pendingRequest.current;
    if (!request || request.accepted !== null) return;
    if (history.state?.archiveCompressionConsent === request.id) {
      request.accepted = accepted;
      history.back();
    } else {
      pendingRequest.current = null;
      setOverLimit(0);
    }
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
        suspended={overLimit > 0}
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
              ? `本次最多选 ${documentSlots} 张；手机照片超过 1 MB 时，需同意压缩后上传。`
              : "从手机相册每次选 1 张；超过 1 MB 时，需同意压缩后上传。"
          }
          activity={activity}
          onClose={onClose}
          onPhone={openPhone}
          phoneTriggerRef={phoneTrigger}
          onCreate={onTakePhoto}
          onSelect={setCandidate}
          onConfirm={confirmLibrary}
        />
      </SheetFrame>
      {overLimit > 0 && (
        <ConfirmationDialog
          overSheet
          hideClose
          title="照片需要压缩"
          description={`有 ${overLimit} 张照片超过 1 MB，压缩到 1 MB 以内后才能上传。手机相册里的原图不会被修改。`}
          confirmLabel="压缩并上传"
          onConfirm={() => resolveConsent(true)}
          onClose={() => resolveConsent(false)}
          returnFocusRef={phoneTrigger}
        />
      )}
    </>
  );
}
