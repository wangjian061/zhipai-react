import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import DocumentPhotoViewer from "./DocumentPhotoViewer.jsx";
import ToolNavigation from "./ToolNavigation.jsx";
import { FeedbackToast } from "./Feedback.jsx";
import FamilyPhotoPicker from "./FamilyPhotoPicker.jsx";
import FamilyPhotoDetail from "./FamilyPhotoDetail.jsx";
import PhotoDeleteDialog from "./PhotoDeleteDialog.jsx";
import SharedSheet from "./SharedSheet.jsx";
import { getStore } from "../runtime/state.js";
import { accountRoute } from "../domain/account.js";
import { downloadAlbumBlob } from "../domain/album.js";
import { albumDate } from "../domain/photo-date.js";
import { assertDocumentPhotoCount, remainingDocumentPhotoSlots } from "../domain/document-photos.js";
import {
  openFamilyAlbumCamera,
  DOCUMENT_NAME_LIMIT,
  archivePath,
  backInArchive,
  navigateArchive,
  replaceArchiveEntry,
  legacyDocumentPath,
  readArchive,
  updateArchive,
  newMember,
  renameFamilyMember,
  deleteFamilyMember,
  appendFamilyPhotos,
  deleteFamilyPhotos,
  documentAlbums,
  addDocumentGroup,
  saveDocumentGroupEdit,
  replaceDocumentPhoto,
  deleteDocumentPhotos,
} from "../domain/album-spaces.js";

const tabs = [
  ["mine", "我的照片", "#i-nav-album"],
  ["family", "家人照片", "#i-users"],
  ["documents", "证件照片", "#i-collection-id"],
];
export function AlbumTabs({ space = "mine" }) {
  return (
    <nav className="album-tab-card album-space-tabs" aria-label="相册分类">
      {tabs.map(([id, label, icon]) => (
        <button
          key={id}
          type="button"
          aria-current={space === id ? "page" : undefined}
          onClick={() => navigateArchive(archivePath(id), true)}
        >
          <svg aria-hidden="true" focusable="false">
            <use href={icon} />
          </svg>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
export function AlbumLibraryCard({ title, actions, children }) {
  return (
    <section className="album-library-card" aria-labelledby="album-library-title">
      <header className="album-library-toolbar">
        <h2 id="album-library-title">{title}</h2>
        {actions && <div className="album-library-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
export function AlbumDate({ photo }) {
  const date = albumDate(photo);
  return (
    date && (
      <time
        dateTime={date.day}
        className="album-capture-date"
        aria-label={date.kind + " " + date.day.replaceAll("-", "/")}
      >
        {date.label}
      </time>
    )
  );
}
function ArchiveImage({
  photo,
  alt = "",
  className = "",
  hideOnError = false,
  loading,
  fallback = null,
  errorFallback = fallback,
}) {
  const [image, setImage] = useState(null);
  const blob = photo?.blob;
  useEffect(() => {
    if (!(blob instanceof Blob) || !blob.size) return;
    const url = URL.createObjectURL(blob);
    setImage({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  if (image?.blob === blob && image?.failed) return errorFallback;
  return image?.blob === blob && image?.url ? (
    <img
      decoding="async"
      className={className}
      src={image.url}
      alt={alt}
      loading={loading}
      onError={hideOnError ? () => setImage({ blob, failed: true }) : undefined}
    />
  ) : fallback;
}
function ArchiveFolderCover({ photos, documentCover }) {
  const previews = photos.length ? photos.slice(0, 3) : [null];
  const placeholder = documentCover
    ? <span className="archive-document-placeholder" />
    : <img src="assets/photo-placeholder-silhouette-20261106.webp" alt="" loading="lazy" />;
  return (
    <span className="archive-folder-cover" data-cover={documentCover ? "document" : undefined} aria-hidden="true">
      <span className="archive-folder-back" />
      {previews.map((photo, index) => (
        <span className="archive-folder-paper" data-layer={index} key={(photo?.id || "empty") + ":" + index}>
          <ArchiveImage photo={photo} hideOnError loading="lazy"
            fallback={index === 0 ? placeholder : null} />
        </span>
      ))}
      <span className="archive-folder-front" />
    </span>
  );
}
function ArchiveFolderGrid({ entries, onOpen, documentCover }) {
  return (
    <div className="archive-folder-grid">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="archive-folder-tile"
          aria-haspopup={documentCover ? undefined : "dialog"}
          onClick={(event) => onOpen(entry.id, event.currentTarget)}
        >
          <ArchiveFolderCover photos={entry.photos} documentCover={documentCover} />
          <strong>{entry.name}</strong>
          <span>{entry.caption ?? (entry.photos.length ? entry.photos.length + " 张" : "空相册")}</span>
        </button>
      ))}
    </div>
  );
}
function Empty({ children }) {
  return <p className="archive-empty">{children}</p>;
}

function FamilyMemberPhotos({
  member, mode, busy, error, toast, bodyRef, addPhotoButton, overlayOpen,
  onClose, onBrowse, onAdd, onOpenPhoto, onManage, onConfirm, onCancelConfirm, onDelete,
  detailTrigger, lastOpenedPhoto,
}) {
  const [selection, setSelection] = useState([]);
  const [pending, setPending] = useState(null);
  const manageButton = useRef(null);
  const selectAllButton = useRef(null);
  const deleteButton = useRef(null);
  const wasManaging = useRef(false);
  const photos = member?.photos || [];
  const ids = photos.map(({ id }) => id);
  const selected = selection.filter((id) => ids.includes(id));
  const confirming = mode === "delete-photos" && !!pending && !!member;
  const managing = (photos.length > 0 && mode !== null) || confirming;
  const allSelected = !!ids.length && selected.length === ids.length;
  const changed = confirming && pending.some((id) => !ids.includes(id));

  useEffect(() => {
    if (mode === "delete-photos" && !confirming) onCancelConfirm();
  }, [mode, confirming, onCancelConfirm]);

  useLayoutEffect(() => {
    if (mode === null) setSelection([]);
    if (mode !== "delete-photos") setPending(null);
    if (wasManaging.current === managing) return;
    wasManaging.current = managing;
    (managing ? selectAllButton.current : manageButton.current || addPhotoButton.current)
      ?.focus({ preventScroll: true });
  }, [mode, managing, addPhotoButton]);

  return (
    <>
      <ArchiveHolderLayout
        space="family"
        title={managing ? `已选 ${selected.length} 张` : member ? member.name + "的照片" : "家人照片"}
        onBack={onClose}
        busy={busy}
        scrollRef={bodyRef}
        headingId="member-photos-title"
        right={photos.length > 0 && (
          <button type="button" className="ui-button-text archive-holder-control"
            disabled={busy} ref={managing ? selectAllButton : manageButton}
            onClick={managing ? () => setSelection(allSelected ? [] : ids) : onManage}>
            {managing ? (allSelected ? "取消全选" : "全选") : "管理"}
          </button>
        )}
        action={member && (managing ? (
          <div className="family-photo-management-actions">
            <button type="button" className="ui-button-secondary" disabled={busy} onClick={onBrowse}>取消</button>
            <button type="button" className="ui-button-danger-soft" ref={deleteButton}
              disabled={busy || !selected.length} onClick={() => {
                setPending(selected);
                onConfirm();
              }}>
              删除（已选 {selected.length} 张）
            </button>
          </div>
        ) : (
          <button type="button" className="ui-button-primary" ref={addPhotoButton}
            disabled={busy} onClick={onAdd}>添加照片</button>
        ))}
      >
        {!member ? (
          <Empty>这个家人相册已不存在。</Empty>
        ) : !photos.length ? (
          <Empty>还没有照片，添加一张照片留作纪念。</Empty>
        ) : (
          <div className="archive-photo-grid">
            {photos.map((photo, index) => {
              const checked = selected.includes(photo.id);
              return (
                <button type="button" key={photo.id}
                  ref={photo.id === lastOpenedPhoto.current ? detailTrigger : undefined}
                  className={managing && checked ? "selected" : undefined}
                  aria-pressed={managing ? checked : undefined}
                  aria-haspopup={managing ? undefined : "dialog"}
                  aria-label={photo.name || "家人照片 " + (index + 1)}
                  disabled={busy}
                  onClick={(event) => {
                    if (managing) setSelection(checked
                      ? selected.filter((id) => id !== photo.id)
                      : [...selected, photo.id]);
                    else onOpenPhoto(photo.id, event.currentTarget);
                  }}>
                  <ArchiveImage photo={photo} alt={photo.name || "家人照片"} />
                  <AlbumDate photo={photo} />
                  {managing && (
                    <span className="photo-check" aria-hidden="true">
                      {checked && <svg><use href="#i-check" /></svg>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {error && !confirming && <p role="alert" className="album-error">{error}</p>}
      </ArchiveHolderLayout>
      {toast && !managing && !overlayOpen && <FeedbackToast message={toast} />}
      {confirming && (
        <PhotoDeleteDialog
          title={pending.length === 1 ? "删除这张照片？" : "删除 " + pending.length + " 张照片？"}
          description="只删除这位家人相册中的照片，原照片和其他家人的照片不会删除。"
          busy={busy}
          error={error || (changed ? "家人相册已变化，请重新选择要删除的照片。" : "")}
          unavailable={changed}
          onClose={onCancelConfirm}
          returnFocusRef={deleteButton}
          onDelete={() => onDelete(pending)}
        />
      )}
    </>
  );
}

export default function AlbumSpaces({ owner, space, search, scope }) {
  const query = new URLSearchParams(search),
    memberId = query.get("member"),
    itemId = query.get("item");
  const sheet = query.get("sheet");
  const family = space === "family";
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneImportNotice, setPhoneImportNotice] = useState(null);
  const reading = useRef(0),
    writing = useRef(false),
    mounted = useRef(false);
  const load = useCallback(async () => {
    if (!owner || writing.current) return;
    const ticket = ++reading.current;
    try {
      const result = await readArchive(owner);
      if (mounted.current && ticket === reading.current) {
        setData(result);
        setError("");
      }
    } catch {
      if (mounted.current && ticket === reading.current)
        setError("相册暂时无法读取，请重试。");
    }
  }, [owner]);
  useEffect(() => {
    mounted.current = true;
    load();
    window.addEventListener("focus", load);
    return () => {
      mounted.current = false;
      reading.current++;
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const member = data?.members.find((m) => m.id === memberId);
  const photo = member?.photos.find((p) => p.id === itemId);
  const memberPhotoMode = ["manage-photos", "delete-photos"].includes(sheet) ? sheet : null;
  const memberListOpen = family && !!memberId && !itemId && (sheet === null || memberPhotoMode);
  useEffect(() => {
    if (!memberListOpen && sheet !== "photos") setPhoneImportNotice(null);
  }, [memberListOpen, sheet]);
  const managementOpen = sheet === "manage" && !memberId && !itemId;
  const editingMember = sheet === "edit-member" && !itemId;
  const deletingMember = sheet === "delete-member" && !itemId;
  const addingMember = sheet === "member" && !memberId;
  const fields = { member: memberId, item: itemId };
  const base = archivePath(space, fields);
  const root = archivePath(space);
  const listPath = archivePath(space, { member: memberId });
  const managementPath = archivePath(space, { sheet: "manage" });
  const detailTrigger = useRef(null);
  useEffect(() => {
    if (family || !data) return;
    const legacy = legacyDocumentPath(data, search);
    if (legacy) replaceArchiveEntry(legacy);
  }, [family, data, search]);
  useEffect(() => {
    if (!family) setError("");
  }, [family, search]);
  const memberManagement = managementOpen || addingMember || editingMember || deletingMember;
  const familyHolderOpen = family && !!memberId && !memberManagement;
  const dialogOpen = !!(data && owner && (memberManagement ||
    (family ? itemId || (sheet && sheet !== "manage-photos") : memberId && sheet)));
  useEffect(() => {
    if (!dialogOpen) return;
    const ui = getStore("albumSpacesUi");
    ui.opened = true;
    return () => {
      ui.opened = false;
    };
  }, [dialogOpen]);
  const memberTrigger = useRef(null);
  const lastOpenedPhoto = useRef(null);
  const memberScroll = useRef(new Map());
  const folderScroll = useRef(0);
  const memberBody = useCallback((body) => {
    if (!body) return;
    body.scrollTop = memberScroll.current.get(memberId) || 0;
    return () => {
      memberScroll.current.set(memberId, body.scrollTop);
    };
  }, [memberId]);
  const panelRef = useRef(null);
  const addPhotoButton = useRef(null);
  const wasFamilyHolder = useRef(false);
  useEffect(() => {
    const wasOpen = wasFamilyHolder.current;
    wasFamilyHolder.current = familyHolderOpen;
    if (!wasOpen || familyHolderOpen || !family) return;
    const frame = requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.scrollTop = folderScroll.current;
      memberTrigger.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [family, familyHolderOpen]);
  useEffect(() => {
    if (!memberListOpen || memberPhotoMode || !data) return;
    const frame = requestAnimationFrame(() => {
      const page = document.querySelector(".family-holder-page");
      if (page?.contains(document.activeElement)) return;
      const trigger = detailTrigger.current;
      (trigger?.isConnected ? trigger : page?.querySelector(".tool-navigation-back"))
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [memberListOpen, memberPhotoMode, !!data]);
  const scrollPositions = useRef(new Map());
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = scrollPositions.current.get(root) || 0;
    return () => {
      scrollPositions.current.set(root, panel.scrollTop);
    };
  }, [root, !!data]);
  const managementTrigger = useRef(null);
  const managementBody = useRef(null);
  const managementReturn = useRef(null);
  useEffect(() => {
    if (!managementOpen || !data || !managementReturn.current) return;
    const frame = requestAnimationFrame(() => {
      const body = managementBody.current;
      if (!body) return;
      const { action, scrollTop } = managementReturn.current;
      managementReturn.current = null;
      body.scrollTop = scrollTop;
      const actions = Array.from(body.querySelectorAll("[data-archive-action]"));
      (actions.find((button) => button.dataset.archiveAction === action) ||
        actions[0])?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [managementOpen, !!data, space]);
  const go = (params) => navigateArchive(archivePath(space, params));
  const openSheet = (name) => {
    setError("");
    setPhoneImportNotice(null);
    go({ ...fields, sheet: name });
  };
  const closeSheet = () => {
    setError("");
    backInArchive(base);
  };
  const openManagementAction = (action, member) => {
    managementReturn.current = {
      action: member ? action + ":" + member : action,
      scrollTop: managementBody.current?.scrollTop || 0,
    };
    setError("");
    go({ member, sheet: action });
  };
  const closeManagementAction = () => {
    const parent = history.state?.albumSpaceParent;
    const parentQuery = new URLSearchParams(parent?.split("?")[1]);
    const fromManagement = parentQuery.get("page") === "album" &&
      parentQuery.get("space") === space && parentQuery.get("sheet") === "manage";
    if (fromManagement || editingMember || deletingMember) {
      setError("");
      backInArchive(fromManagement ? parent : managementPath);
    } else closeSheet();
  };
  const returnFromItem = () =>
    backInArchive(listPath);
  const save = async (prepare, after, failureMessage) => {
    if (!owner || writing.current) return;
    writing.current = true;
    reading.current++;
    setBusy(true);
    setError("");
    const source = currentArchiveRoute();
    try {
      const prepared = prepare();
      const mutate = typeof prepared === "function" ? prepared : await prepared;
      if (!mounted.current || currentArchiveRoute() !== source) return;
      const saved = await updateArchive(owner, mutate);
      if (mounted.current) {
        setData(saved);
        if (currentArchiveRoute() === source) after?.(saved);
      }
    } catch (e) {
      const changed =
        /家人相册已变化|家人相册已不存在|证件已变化|照片已不存在/.test(e.message || "");
      if (changed) {
        try {
          const latest = await readArchive(owner);
          if (mounted.current) setData(latest);
        } catch {
          /* Preserve the original failure so the user can retry. */
        }
      }
      if (mounted.current && currentArchiveRoute() === source)
        setError(
          changed
            ? e.message
            : failureMessage ||
                (e instanceof DOMException
                  ? "保存失败，请检查图片和本地存储后重试。"
                  : e.message || "未能保存，请重试。"),
        );
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const err = error && (
    <p role="alert" className="album-error">
      {error}
    </p>
  );
  const title = family ? "家人相册" : "证件照片";
  if (!owner || !data) {
    const content = !owner ? (
      <>
        <Empty>登录后查看{family ? "家人照片" : "证件照片"}</Empty>
        <button className="tool-primary" onClick={() => accountRoute("welcome", base)}>登录 / 注册</button>
      </>
    ) : error ? (
      <>
        {err}
        <button className="ui-button-text" onClick={load}>重新读取</button>
      </>
    ) : <p className="archive-empty" role="status">正在读取相册…</p>;
    if (memberId && !memberManagement)
      return <ArchiveHolderLayout space={space} title={family ? "家人照片" : "证件照片"}
        onBack={() => backInArchive(root)}>{content}</ArchiveHolderLayout>;
    return <AlbumLibraryCard title={title}><div className="album-library-content archive-panel">
      {content}
    </div></AlbumLibraryCard>;
  }

  const renderLibrary = (folders) => (
    <AlbumLibraryCard title={title} actions={
      <button type="button" ref={managementTrigger} aria-haspopup="dialog" disabled={busy}
        onClick={() => {
          managementReturn.current = null;
          openSheet("manage");
        }}>
        管理
      </button>
    }>
      <div className="album-library-content archive-panel" ref={panelRef}>
        {folders}
        {!dialogOpen && err}
      </div>
    </AlbumLibraryCard>
  );

  return (
    <>
      {family ? renderLibrary(data.members.length ? (
        <ArchiveFolderGrid entries={data.members} onOpen={(id, trigger) => {
          memberTrigger.current = trigger;
          folderScroll.current = panelRef.current?.scrollTop || 0;
          detailTrigger.current = null;
          lastOpenedPhoto.current = null;
          go({ member: id });
        }} />
      ) : <Empty>点「管理」添加家人，为对方建立照片相册。</Empty>) : (
        <DocumentAlbums owner={owner} data={data} search={search}
          managementOpen={memberManagement} busy={busy} error={error} save={save}
          clearError={() => setError("")} renderLibrary={renderLibrary} />
      )}
      {managementOpen && (
        <SharedSheet
          opened
          id="album-archive-management-title"
          title="管理家人相册"
          className="archive-management-sheet"
          busy={busy}
          bodyRef={managementBody}
          returnFocusRef={managementTrigger}
          onClose={closeSheet}
        >
          <button
            type="button"
            className="archive-row archive-management-entry"
            data-archive-action="member"
            disabled={busy}
            onClick={() => openManagementAction("member")}
          >
            <strong className="archive-row-text">添加家人</strong>
            <Chevron />
          </button>
          {data.members.length > 0 && (
            <ul className="archive-management-list">
              {data.members.map((m) => (
                <li key={m.id} className="archive-row">
                  <span className="archive-row-text">
                    <strong>{m.name}</strong>
                    <small>{m.photos.length ? m.photos.length + " 张" : "空相册"}</small>
                  </span>
                  <button
                    type="button"
                    data-archive-action={"edit-member:" + m.id}
                    aria-label={"编辑" + m.name + "的相册"}
                    disabled={busy}
                    onClick={() => openManagementAction("edit-member", m.id)}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="archive-remove-member"
                    data-archive-action={"delete-member:" + m.id}
                    aria-label={"删除" + m.name + "的相册"}
                    disabled={busy}
                    onClick={() => openManagementAction("delete-member", m.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SharedSheet>
      )}
      {deletingMember && (
        <FamilyMemberDeleteDialog
          key={memberId}
          member={member}
          busy={busy}
          error={error}
          onClose={closeManagementAction}
          onDelete={(snapshot) =>
            save(
              () => (state) => deleteFamilyMember(state, snapshot),
              closeManagementAction,
              "删除未完成，相册已保留，请重试。",
            )
          }
        />
      )}
      {familyHolderOpen && (
        <FamilyMemberPhotos
          key={memberId}
          member={member}
          mode={memberPhotoMode}
          overlayOpen={dialogOpen}
          busy={busy}
          error={error}
          toast={phoneImportNotice === memberId ? "证件照校验通过（演示），已添加" : ""}
          bodyRef={memberBody}
          addPhotoButton={addPhotoButton}
          onClose={() => backInArchive(root)}
          onBrowse={() => { setError(""); backInArchive(listPath); }}
          onAdd={() => openSheet("photos")}
          detailTrigger={detailTrigger}
          lastOpenedPhoto={lastOpenedPhoto}
          onOpenPhoto={(id, trigger) => {
            lastOpenedPhoto.current = id;
            detailTrigger.current = trigger;
            go({ member: memberId, item: id });
          }}
          onManage={() => openSheet("manage-photos")}
          onConfirm={() => openSheet("delete-photos")}
          onCancelConfirm={() => {
            setError("");
            backInArchive(archivePath(space, { member: memberId, sheet: "manage-photos" }));
          }}
          onDelete={(ids) => save(
            () => (state) => deleteFamilyPhotos(state, memberId, ids),
            () => backInArchive(listPath),
            "删除未完成，照片已保留，请重试。",
          )}
        />
      )}
      {family && itemId && (
        <FamilyPhotoDetail
          key={itemId}
          photo={photo}
          scope={scope}
          onClose={returnFromItem}
          returnFocusRef={detailTrigger}
        />
      )}
      {space === "family" && sheet === "photos" && member && !itemId && (
        <FamilyPhotoPicker
          key={member.id}
          library={getStore("photoLibrary")}
          trigger={addPhotoButton}
          busy={busy}
          error={error}
          onClose={closeSheet}
          onTakePhoto={() => openFamilyAlbumCamera(owner, member.id)}
          onAdd={(prepare, source) =>
            save(async () => {
              const images = await prepare();
              return (state) => appendFamilyPhotos(state, member.id, images);
            }, () => {
              if (source === "phone") setPhoneImportNotice(member.id);
              closeSheet();
            })
          }
        />
      )}
      {(editingMember || addingMember) && (
        <ArchiveForm key={base + sheet} kind={sheet} member={member}
          busy={busy} error={err} save={save} close={closeManagementAction} />
      )}
    </>
  );
}

function Chevron() {
  return (
    <svg className="archive-chevron" aria-hidden="true">
      <use href="#i-chevron" />
    </svg>
  );
}

function ArchiveForm({ kind, member, busy, error, save, close }) {
  const editing = kind === "edit-member";
  const [name, setName] = useState(member?.name || "");
  const submit = () => save(() => {
    if (editing) return (state) => renameFamilyMember(state, member.id, name);
    const nextMember = newMember(name);
    return (state) => state.members.push(nextMember);
  }, close);
  return (
    <SharedSheet
      id="album-archive-form"
      opened
      title={editing ? "编辑家人相册" : "添加家人"}
      busy={busy}
      onClose={close}
      footer={
        <button className="tool-primary" disabled={busy || (editing && !member) || !name.trim()}
          onClick={submit}>
          {busy ? "正在保存…" : "保存"}
        </button>
      }
    >
      {editing && !member ? (
        <Empty>这个家人相册已不存在。</Empty>
      ) : (
        <fieldset className="archive-form" disabled={busy}>
          <label>
            称呼
            <input maxLength={30} required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例如：妈妈、小雨" />
          </label>
        </fieldset>
      )}
      {error}
    </SharedSheet>
  );
}

function FamilyMemberDeleteDialog({ member, busy, error, onClose, onDelete }) {
  const [snapshot] = useState(member);
  const photoCount = snapshot?.photos.length || 0;
  const description = snapshot
    ? "「" + snapshot.name + "」相册" +
      (photoCount ? "及其中 " + photoCount + " 张照片" : "") +
      "将被删除，无法恢复。已登记的证件会保留。"
    : "这个家人相册已不存在。";
  return (
    <PhotoDeleteDialog
      title="删除家人相册"
      description={description}
      confirmLabel={photoCount ? "删除相册及照片" : "删除相册"}
      hideClose
      busy={busy}
      error={error}
      unavailable={!snapshot}
      onClose={onClose}
      onDelete={() => onDelete(snapshot)}
      returnFocusSelector="[data-archive-action='member']"
    />
  );
}

function currentArchiveRoute() {
  const query = new URLSearchParams(location.search);
  query.sort();
  return location.pathname + "?" + query;
}

function ArchiveHolderLayout({ space = "documents", title, onBack, action, children, pageRef, scrollRef, busy, right, headingId }) {
  return (
    <section className={`archive-holder-page ${space === "family" ? "family" : "document"}-holder-page`}
      ref={pageRef} aria-label={title}>
      <ToolNavigation title={title} onBack={onBack} disabled={busy} right={right}
        renderTitle={headingId ? (props) => <h1 {...props} id={headingId}>{title}</h1> : undefined} />
      <div className="archive-holder-scroll" ref={scrollRef}>{children}</div>
      {action && <footer className={`archive-holder-actions ${space === "family" ? "" : "document-holder-actions"}`.trim()}>{action}</footer>}
    </section>
  );
}

const editorSheets = new Set([
  "new-document", "edit-document", "pick-document-add",
  "pick-document-replace", "confirm-document-delete",
]);

function DocumentAlbums({ owner, data, search, managementOpen, busy, error, save, clearError, renderLibrary }) {
  const query = new URLSearchParams(search);
  const member = query.get("member");
  const groupId = query.get("group");
  const item = query.get("item");
  const sheet = query.get("sheet");
  const albums = documentAlbums(data);
  const album = albums.find((entry) => entry.id === member);
  const group = album?.groups.find((entry) => entry.id === groupId);
  const page = Number(item);
  const index = group?.photos.length && Number.isInteger(page)
    ? Math.min(group.photos.length - 1, Math.max(0, page - 1))
    : 0;
  const root = archivePath("documents");
  const path = (fields) => archivePath("documents", { member, ...fields });
  const listPath = path();
  const viewPath = (page = index) => path({ group: groupId, item: page + 1, sheet: "view-document" });
  const go = (destination) => {
    clearError();
    navigateArchive(destination);
  };
  const back = (destination) => {
    clearError();
    backInArchive(destination);
  };

  const folderTrigger = useRef(null);
  const folderPanel = useRef(null);
  const folderPosition = useRef(0);
  const lastAction = useRef(null);
  const pageRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (sheet || managementOpen) return;
    const frame = requestAnimationFrame(() => {
      if (!member) {
        const folder = folderTrigger.current;
        const panel = folderPanel.current;
        if (panel) panel.scrollTop = folderPosition.current;
        const target = folder?.isConnected ? folder : panel?.querySelector(".archive-folder-tile");
        target?.focus({ preventScroll: true });
        return;
      }
      const page = pageRef.current;
      const actions = [...(page?.querySelectorAll("[data-document-action]") || [])];
      const target = actions.find((button) => button.dataset.documentAction === lastAction.current)
        || page?.querySelector(".tool-navigation-back");
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [member, sheet, managementOpen]);

  function openFor(action, destination) {
    lastAction.current = action;
    go(destination);
  }

  function savePhoto(photo, page) {
    if (!(photo?.blob instanceof Blob) || !photo.blob.size ||
        getStore("account")?.session?.phone !== owner) return "下载未完成，请重试。";
    try {
      const extension = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[photo.blob.type] || "";
      const name = group.name.replace(/[\\/:*?"<>|]/g, "_") + "-" + (page + 1);
      downloadAlbumBlob(photo.blob, name + extension);
      return "已发起照片下载";
    } catch {
      return "下载未完成，请重试。";
    }
  }

  const folders = renderLibrary(<ArchiveFolderGrid documentCover entries={albums.map((entry) => ({
    ...entry,
    photos: entry.groups.flatMap((record) => record.photos.slice(0, 3)).slice(0, 3),
    caption: entry.groups.length + " 份",
  }))} onOpen={(id, trigger) => {
    folderTrigger.current = trigger;
    folderPanel.current = trigger.closest(".archive-panel");
    folderPosition.current = folderPanel.current?.scrollTop || 0;
    lastAction.current = null;
    go(archivePath("documents", { member: id }));
  }} />);

  if (!member || managementOpen) return folders;
  const title = album ? album.name + "的证件" : "证件照片";
  const action = album?.canCreate && (
    <button type="button" className="ui-button-primary" data-document-action="add" disabled={busy}
      onClick={() => openFor("add", path({ sheet: "new-document" }))}>
      添加证件
    </button>
  );

  let overlay;
  if (sheet === "view-document" && group?.photos[index]) {
    overlay = <DocumentPhotoViewer group={group} index={index}
      onPage={(page) => replaceArchiveEntry(viewPath(page))}
      onClose={() => back(listPath)} onSave={savePhoto}
      onReplace={() => go(path({ group: group.id, item: index + 1, sheet: "replace-document" }))} />;
  } else if (sheet === "replace-document" && group?.photos[index]) {
    overlay = <DocumentViewerReplacement key={groupId + ":" + index} group={group} index={index}
      busy={busy} error={error} onClose={() => back(viewPath())} save={save} />;
  } else if (album && editorSheets.has(sheet) && (groupId || album.canCreate)) {
    overlay = <DocumentEditor key={member + ":" + (groupId || "new")} group={group} groupId={groupId} album={album}
      sheet={sheet} item={item} busy={busy} error={error} save={save}
      onOpen={(mode, photoId) => go(path({ group: groupId, item: photoId, sheet: mode }))}
      onReturn={() => back(path({ group: groupId, sheet: groupId ? "edit-document" : "new-document" }))}
      onClose={() => back(listPath)}
      onSaved={(saved) => {
        if (!groupId && scrollRef.current) scrollRef.current.scrollTop = 0;
        back(documentAlbums(saved).some((entry) => entry.id === member) ? listPath : root);
      }} />;
  } else if (sheet) {
    overlay = <SharedSheet opened id="document-unavailable-title" title="证件照片" onClose={() => back(listPath)}>
      <Empty>这份证件暂不可用。</Empty>
    </SharedSheet>;
  }

  return (
    <>
      {folders}
      <ArchiveHolderLayout title={title} pageRef={pageRef} scrollRef={scrollRef} busy={busy}
        onBack={() => back(root)} action={action}>
        {!album ? <Empty>这个证件夹已不存在。</Empty> : !album.groups.length ?
          <Empty>还没有证件</Empty> : album.groups.map((entry) => (
            <section className="document-group" key={entry.id}>
              <header>
                <div className="document-group-title">
                  <h2>{entry.name}</h2>
                  <span>{entry.photos.length}张</span>
                </div>
                <button type="button" data-document-action={"edit:" + entry.id} aria-label={"编辑" + entry.name}
                  aria-haspopup="dialog" disabled={busy}
                  onClick={() => openFor("edit:" + entry.id,
                    path({ group: entry.id, sheet: "edit-document" }))}>
                  <svg aria-hidden="true"><use href="#i-more" /></svg>
                </button>
              </header>
              <div className="document-photo-grid" data-columns={entry.photos.length <= 2 ? 2 : 3}>
                {entry.photos.map((photo, page) => {
                  const focusKey = "photo:" + entry.id + ":" + page;
                  return <button key={photo.id} type="button" data-document-action={focusKey}
                    aria-label={"查看" + entry.name + "第 " + (page + 1) + " 张照片"} aria-haspopup="dialog" disabled={busy}
                    onClick={() => openFor(focusKey,
                      path({ group: entry.id, item: page + 1, sheet: "view-document" }))}>
                    <DocumentThumbnail photo={photo} />
                  </button>;
                })}
              </div>
            </section>
          ))}
      </ArchiveHolderLayout>
      {overlay}
    </>
  );
}

function DocumentThumbnail({ photo }) {
  const unavailable = <span>照片不可用</span>;
  return (
    <span className="document-group-thumb">
      <ArchiveImage photo={photo} loading="lazy" hideOnError
        fallback={photo?.blob instanceof Blob && photo.blob.size ? null : unavailable} errorFallback={unavailable} />
    </span>
  );
}

function DocumentViewerReplacement({ group, index, busy, error, onClose, save }) {
  const [snapshot] = useState(group);
  return <FamilyPhotoPicker library={getStore("photoLibrary")} documentSlots={1} title="替换照片"
    busy={busy} error={error} onClose={onClose}
    onAdd={(prepare) => save(async () => {
      const [photo] = await prepare();
      return (state) => replaceDocumentPhoto(state, snapshot, snapshot.photos[index].id, photo);
    }, onClose)} />;
}

function DocumentEditor({ album, group, groupId, sheet, item, busy, error, save, onOpen, onClose, onReturn, onSaved }) {
  const isNew = !groupId;
  const [snapshot] = useState(group);
  const [photos, setPhotos] = useState(() => snapshot?.photos || []);
  const [name, setName] = useState(() => snapshot?.name || "");
  const [preparing, setPreparing] = useState(false);
  const [readError, setReadError] = useState("");
  const active = useRef(false);
  const preparingRef = useRef(false);
  const deleteTrigger = useRef(null);
  const index = photos.findIndex((photo) => photo.id === item);
  const remaining = remainingDocumentPhotoSlots(photos.length);
  const pickingReplacement = sheet === "pick-document-replace" && !!photos[index];
  const pickingMore = sheet === "pick-document-add" && remaining > 0;
  const pickingInitial = isNew && !photos.length;
  const picking = pickingReplacement || pickingMore || pickingInitial;
  const confirming = !isNew && sheet === "confirm-document-delete" && (!item || !!photos[index]);
  const removingRecord = confirming && (!item || photos.length === 1);
  const unchanged = name.trim() === snapshot?.name && photos === snapshot?.photos;

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function select(prepare) {
    if (preparingRef.current) return;
    preparingRef.current = true;
    setPreparing(true);
    setReadError("");
    const source = currentArchiveRoute();
    try {
      const images = await prepare();
      if (!active.current || source !== currentArchiveRoute()) return;
      assertDocumentPhotoCount(images.length, pickingReplacement ? 1 : remaining);
      setPhotos((current) => pickingReplacement
        ? current.map((photo, i) => i === index ? images[0] : photo)
        : [...current, ...images]);
      if (!pickingInitial) onReturn();
    } catch (failure) {
      if (active.current && source === currentArchiveRoute())
        setReadError(failure instanceof DOMException ? "图片未能读取，请重新选择。" : failure.message || "图片未能读取，请重新选择。");
    } finally {
      preparingRef.current = false;
      if (active.current) setPreparing(false);
    }
  }

  if (!isNew && !snapshot)
    return <SharedSheet opened id="document-edit-title" title="编辑证件" onClose={onClose}>
      <Empty>这份证件暂不可用。</Empty>
    </SharedSheet>;
  if (picking)
    return <FamilyPhotoPicker library={getStore("photoLibrary")}
      title={pickingReplacement ? "替换照片" : undefined}
      documentSlots={pickingReplacement ? 1 : remaining} busy={busy || preparing}
      error={readError || error} onAdd={select} onClose={pickingInitial ? onClose : onReturn} />;

  function requestDelete(event, photoId) {
    deleteTrigger.current = event.currentTarget;
    onOpen("confirm-document-delete", photoId);
  }

  function removeRecord() {
    return save(() => (state) => deleteDocumentPhotos(state, snapshot), onSaved,
      "删除未完成，证件已保留，请重试。");
  }

  return (
    <>
      <SharedSheet opened id="document-edit-title" title={isNew ? "添加证件" : "编辑证件"}
        onClose={onClose} suspended={confirming} busy={busy} footer={
          <button type="button" className="ui-button-primary"
            disabled={busy || !photos.length || (!isNew && (!name.trim() || unchanged))}
            onClick={() => save(
              () => (state) => isNew
                ? addDocumentGroup(state, album.holderId, name, photos)
                : saveDocumentGroupEdit(state, snapshot, name, photos),
              onSaved,
              "保存未完成，原证件已保留，请重试。",
            )}>
            {busy ? "正在保存…" : "保存"}
          </button>
        }>
        <fieldset className="archive-form document-editor-form" disabled={busy}>
          <label>{isNew ? "证件名称（选填）" : "证件名称"}
            <input value={name} maxLength={DOCUMENT_NAME_LIMIT} placeholder="例如：身份证"
              onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="document-photo-grid" data-columns="2" role="group" aria-label={"已选 " + photos.length + " 张照片"}>
            {photos.map((photo, page) => (
              <div className="document-editor-tile" key={photo.id}>
                {isNew ? <DocumentThumbnail photo={photo} /> : (
                  <>
                    <button type="button" aria-label={"替换第 " + (page + 1) + " 张照片"}
                      onClick={() => onOpen("pick-document-replace", photo.id)}>
                      <DocumentThumbnail photo={photo} />
                    </button>
                    <button type="button" className="document-editor-remove"
                      aria-label={"删除第 " + (page + 1) + " 张照片"}
                      onClick={(event) => requestDelete(event, photo.id)}>
                      <svg aria-hidden="true"><use href="#i-close" /></svg>
                    </button>
                  </>
                )}
              </div>
            ))}
            {remaining > 0 && (
              <button type="button" className="document-editor-add" onClick={() => onOpen("pick-document-add")}>
                {isNew ? "继续添加照片" : "+ 添加"}
              </button>
            )}
          </div>
          {!isNew && (
            <button type="button" className="ui-button-text document-editor-delete"
              onClick={(event) => requestDelete(event)}>删除整份证件</button>
          )}
        </fieldset>
        {error && !confirming && <p className="album-error" role="alert">{error}</p>}
      </SharedSheet>
      {confirming && (removingRecord ? (
        <PhotoDeleteDialog overSheet returnFocusRef={deleteTrigger}
          title={item ? "删除这张照片？" : "删除整份证件？"}
          description={item ? "这是最后一张照片。删除后会一并移除这份证件。"
            : "「" + snapshot.name + "」及其中 " + snapshot.photos.length + " 张照片将被删除，无法恢复。"}
          confirmLabel="删除证件" onDelete={removeRecord} onClose={onReturn}
          busy={busy} error={error} />
      ) : (
        <ConfirmationDialog overSheet returnFocusRef={deleteTrigger}
          title="移除这张照片？" description="点击「保存」后，这张照片才会从证件中移除。"
          confirmLabel="移除照片" onClose={onReturn}
          onConfirm={() => {
            setPhotos((current) => current.filter((_, page) => page !== index));
            onReturn();
          }} />
      ))}
    </>
  );
}
