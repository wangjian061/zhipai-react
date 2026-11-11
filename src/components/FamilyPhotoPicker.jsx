import React, { useEffect, useRef, useState } from "react";
import SharedSheet, { SheetFrame } from "./SharedSheet.jsx";
import ToolPhotoSelection from "./ToolPhotoSelection.jsx";
import { captureCameraPhoto } from "../domain/camera.js";
import {
  copyFinishedForMember,
  importArchiveImage,
} from "../domain/album-spaces.js";

function CapturedPhoto({ photo }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(photo.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo]);
  return (
    url && (
      <img src={url} alt="本次拍摄的照片" className="member-camera-preview" />
    )
  );
}

function MemberCamera({ member, busy, error, onAdd, onClose, trigger }) {
  const video = useRef(null),
    native = useRef(null),
    session = useRef(0);
  const [attempt, setAttempt] = useState(0),
    [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false),
    [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const token = ++session.current;
    setReady(false);
    setCapturing(false);
    setMessage("");
    if (draft) return;
    let stream;
    const element = video.current;
    function stop() {
      stream?.getTracks().forEach((track) => track.stop());
      if (element && element.srcObject === stream) element.srcObject = null;
    }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (session.current !== token) {
          stop();
          return;
        }
        element.srcObject = stream;
        await element.play();
        if (session.current === token) setReady(true);
      } catch (e) {
        stop();
        if (session.current === token) {
          setReady(false);
          setMessage(
            e.name === "NotAllowedError"
              ? "请允许使用相机后重试，或使用设备拍照。"
              : "相机暂不可用，可重新开启或使用设备拍照。",
          );
        }
      }
    }
    function visibility() {
      if (!document.hidden) return;
      session.current++;
      stop();
      setReady(false);
      setCapturing(false);
      setMessage("相机已暂停，可重新开启。");
    }
    document.addEventListener("visibilitychange", visibility);
    if (!document.hidden) start();
    else visibility();
    return () => {
      session.current++;
      document.removeEventListener("visibilitychange", visibility);
      stop();
    };
  }, [draft, attempt]);

  async function take(file) {
    if (capturing || busy) return;
    const token = session.current;
    setCapturing(true);
    setMessage("");
    try {
      const photo = file
        ? await importArchiveImage(file)
        : await captureCameraPhoto(video.current);
      if (session.current === token) setDraft(photo);
    } catch {
      if (session.current === token) setMessage("照片未能读取，请重新拍照。");
    } finally {
      if (session.current === token) setCapturing(false);
    }
  }
  return (
    <SharedSheet
      opened
      id="member-camera-title"
      title={draft ? "确认照片" : "为成员拍照"}
      onClose={onClose}
      busy={busy}
      returnFocusRef={trigger}
      footer={
        draft ? (
          <div className="member-camera-actions">
            <button
              type="button"
              className="tool-secondary"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              重拍
            </button>
            <button
              type="button"
              className="tool-primary"
              disabled={busy}
              onClick={() =>
                onAdd(async () => [{ ...draft, addedAt: Date.now() }])
              }
            >
              {busy ? "正在添加…" : "使用这张照片"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="tool-primary"
            disabled={!ready || capturing}
            onClick={() => take()}
          >
            拍照
          </button>
        )
      }
    >
      <p className="member-camera-owner">{member.name}的相册</p>
      {draft ? (
        <CapturedPhoto photo={draft} />
      ) : (
        <video
          ref={video}
          className="member-camera-preview"
          autoPlay
          muted
          playsInline
          aria-label="相机预览"
        />
      )}
      {message && (
        <p role="status" className="member-camera-status">
          {message}
        </p>
      )}
      {!draft && (
        <div className="member-camera-options">
          {!ready && message && (
            <button type="button" onClick={() => setAttempt((a) => a + 1)}>
              重新开启相机
            </button>
          )}
          <button
            type="button"
            disabled={capturing}
            onClick={() => native.current?.click()}
          >
            使用设备拍照
          </button>
          <input
            ref={native}
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (file) take(file);
            }}
          />
        </div>
      )}
      {error && (
        <p className="album-error" role="alert">
          {error}
        </p>
      )}
    </SharedSheet>
  );
}

export default function FamilyPhotoPicker({
  member,
  library,
  busy,
  error,
  onAdd,
  onClose,
  trigger,
  multiple = true,
}) {
  const phone = useRef(null);
  const [candidate, setCandidate] = useState(null),
    [camera, setCamera] = useState(false);
  if (camera)
    return (
      <MemberCamera {...{ member, busy, error, onAdd, onClose, trigger }} />
    );
  return (
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
        error={error}
        onClose={onClose}
        onPhone={() => phone.current?.click()}
        onCreate={() => setCamera(true)}
        onSelect={setCandidate}
        onConfirm={() =>
          onAdd(async () => [
            await copyFinishedForMember(
              library.finished.find((photo) => photo.id === candidate),
            ),
          ])
        }
      />
      <input
        ref={phone}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files || []);
          e.currentTarget.value = "";
          if (files.length)
            onAdd(() => Promise.all(files.map(importArchiveImage)));
        }}
      />
    </SheetFrame>
  );
}
