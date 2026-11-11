import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useArchiveZoom, ArchiveZoom } from "./ArchiveZoom.jsx";
import FamilyPhotoPicker from "./FamilyPhotoPicker.jsx";
import FamilyPhotoDetail from "./FamilyPhotoDetail.jsx";
import PhotoDeleteDialog from "./PhotoDeleteDialog.jsx";
import SharedSheet from "./SharedSheet.jsx";
import { getStore } from "../runtime/state.js";
import { accountRoute } from "../domain/account.js";
import { downloadAlbumBlob } from "../domain/album.js";
import { albumDate } from "../domain/photo-date.js";
import {
  DOCUMENT_NAME_LIMIT,
  SELF_DOCUMENT_ALBUM,
  archivePath,
  backInArchive,
  navigateArchive,
  readArchive,
  updateArchive,
  newMember,
  renameFamilyMember,
  deleteFamilyMember,
  appendFamilyPhotos,
  deleteFamilyPhoto,
  documentAlbums,
  addDocumentGroup,
  appendDocumentGroupPhotos,
  renameDocumentGroup,
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
          aria-haspopup="dialog"
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

export default function AlbumSpaces({ owner, space, search, scope }) {
  const query = new URLSearchParams(search),
    memberId = query.get("member"),
    itemId = query.get("item");
  const type = query.get("doctype"),
    sheet = query.get("sheet");
  const family = space === "family";
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
  const deletingPhoto = family && sheet === "delete-photo";
  const memberListOpen = family && !!memberId && !itemId && !sheet;
  const managementOpen = sheet === "manage" && !memberId && !itemId;
  const editingMember = sheet === "edit-member" && !itemId;
  const deletingMember = sheet === "delete-member" && !itemId;
  const addingMember = sheet === "member" && !memberId;
  const deleteTrigger = useRef(null);
  const fields = { member: memberId, item: itemId };
  const base = archivePath(space, fields);
  const root = archivePath(space);
  const listPath = archivePath(space, { member: memberId });
  const managementPath = archivePath(space, { sheet: "manage" });
  const detailTrigger = useRef(null);
  useEffect(() => {
    if (family || !data || (!type && sheet !== "document")) return;
    const legacy = data.documents.find((group) => group.id === itemId);
    navigateArchive(archivePath(space, legacy ? {
      member: legacy.holderId || SELF_DOCUMENT_ALBUM,
    } : {}), true);
  }, [family, data, type, itemId, sheet, space]);
  useEffect(() => {
    if (!family) setError("");
  }, [family, search]);
  const memberManagement = managementOpen || addingMember || editingMember || deletingMember;
  const dialogOpen = !!(data && owner && (memberManagement || memberId || (family && (itemId || sheet))));
  useEffect(() => {
    if (!dialogOpen) return;
    const ui = getStore("albumSpacesUi");
    ui.opened = true;
    return () => {
      ui.opened = false;
    };
  }, [dialogOpen]);
  const memberTrigger = useRef(null);
  const memberScroll = useRef(new Map());
  const lastOpenedPhoto = useRef(null);
  const memberBody = useCallback((body) => {
    if (!body) return;
    body.scrollTop = memberScroll.current.get(memberId) || 0;
    return () => {
      memberScroll.current.set(memberId, body.scrollTop);
    };
  }, [memberId]);
  const panelRef = useRef(null);
  const addPhotoButton = useRef(null);
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
  const requestDelete = (side, event) => {
    deleteTrigger.current = event.currentTarget;
    const fromList = history.state?.albumSpaceParent === listPath;
    openSheet("delete-" + side);
    history.replaceState(
      { ...history.state, albumDeleteFromList: fromList },
      "",
    );
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
  if (!owner || !data)
    return (
      <AlbumLibraryCard title={title}>
        <div className="album-library-content archive-panel">
          {!owner ? (
            <>
              <Empty>登录后查看{family ? "家人照片" : "证件照片"}</Empty>
              <button className="tool-primary" onClick={() => accountRoute("welcome", base)}>
                登录 / 注册
              </button>
            </>
          ) : error ? (
            <>
              {err}
              <button className="account-text" onClick={load}>重新读取</button>
            </>
          ) : (
            <p className="archive-empty" role="status">正在读取相册…</p>
          )}
        </div>
      </AlbumLibraryCard>
    );

  return (
    <>
      <AlbumLibraryCard
        title={title}
        actions={
          <button
            type="button"
            ref={managementTrigger}
            aria-haspopup="dialog"
            disabled={busy}
            onClick={() => {
              managementReturn.current = null;
              openSheet("manage");
            }}
          >
            管理
          </button>
        }
      >
        <div className="album-library-content archive-panel" ref={panelRef}>
          {family ? (
            data.members.length ? (
              <ArchiveFolderGrid entries={data.members} onOpen={(id, trigger) => {
                memberTrigger.current = trigger;
                go({ member: id });
              }} />
            ) : (
              <Empty>点「管理」添加家人，为对方建立照片相册。</Empty>
            )
          ) : (
            <DocumentAlbums owner={owner} data={data} search={search}
              managementOpen={memberManagement} busy={busy} error={error} save={save}
              clearError={() => setError("")}
            />
          )}
          {!dialogOpen && err}
        </div>
      </AlbumLibraryCard>
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
      {memberListOpen && (
        <SharedSheet
          opened
          id="member-photos-title"
          title={member?.name || "家人相册"}
          busy={busy}
          bodyRef={memberBody}
          returnFocusRef={memberTrigger}
          onClose={() => backInArchive(root)}
          footer={
            member && (
              <button
                type="button"
                className="tool-primary"
                ref={addPhotoButton}
                disabled={busy}
                onClick={() => openSheet("photos")}
              >
                添加照片
              </button>
            )
          }
        >
          {!member ? (
            <Empty>这个家人相册已不存在。</Empty>
          ) : !member.photos.length ? (
            <Empty>还没有照片，添加一张照片留作纪念。</Empty>
          ) : (
            <div className="archive-photo-grid">
              {member.photos.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  ref={(node) => {
                    if (node && lastOpenedPhoto.current === p.id)
                      detailTrigger.current = node;
                  }}
                  onClick={(event) => {
                    lastOpenedPhoto.current = p.id;
                    detailTrigger.current = event.currentTarget;
                    go({ member: member.id, item: p.id });
                  }}
                >
                  <ArchiveImage photo={p} alt={p.name || "家人照片"} />
                  <AlbumDate photo={p} />
                </button>
              ))}
            </div>
          )}
          {err}
        </SharedSheet>
      )}
      {space === "family" && itemId && !deletingPhoto && (
        <FamilyPhotoDetail
          key={itemId}
          photo={photo}
          scope={scope}
          busy={busy}
          onClose={returnFromItem}
          onDelete={(event) => requestDelete("photo", event)}
          returnFocusRef={detailTrigger}
        />
      )}
      {deletingPhoto && (
        <PhotoDeleteDialog
          description="只删除这位家人相册中的照片，原照片和其他家人的照片不会删除。"
          busy={busy}
          error={error}
          unavailable={!photo}
          onClose={closeSheet}
          returnFocusRef={deleteTrigger}
          onDelete={() =>
            save(
              async () => (state) => deleteFamilyPhoto(state, memberId, itemId),
              () => {
                if (
                  history.state?.albumDeleteFromList &&
                  history.state?.albumSpaceParent === base &&
                  history.length > 2
                )
                  history.go(-2);
                else navigateArchive(listPath, true);
              },
            )
          }
        />
      )}
      {space === "family" && sheet === "photos" && member && !itemId && (
        <FamilyPhotoPicker
          key={member.id}
          member={member}
          library={getStore("photoLibrary")}
          trigger={addPhotoButton}
          busy={busy}
          error={error}
          onClose={closeSheet}
          onAdd={(prepare) =>
            save(async () => {
              const images = await prepare();
              return (state) => appendFamilyPhotos(state, member.id, images);
            }, closeSheet)
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

function documentPreviewKey(groupId, photoId) {
  return encodeURIComponent(groupId) + ":" + encodeURIComponent(photoId);
}

function hasDocumentPhotoFile(photo) {
  return photo?.blob instanceof Blob && photo.blob.size > 0;
}

function DocumentAlbums({ owner, data, search, managementOpen, busy, error, save, clearError }) {
  const query = new URLSearchParams(search);
  const memberId = query.get("member"), groupId = query.get("group");
  const itemId = query.get("item"), requestedSheet = query.get("sheet");
  const sheet = requestedSheet === "rename-group-photo" ? "group-photo-actions" : requestedSheet;
  const albums = documentAlbums(data);
  const album = albums.find((entry) => entry.id === memberId);
  const group = album?.groups.find((entry) => entry.id === groupId);
  const photoIndex = group?.photos.findIndex((entry) => entry.id === itemId) ?? -1;
  const photo = group?.photos[photoIndex];
  const root = archivePath("documents");
  const path = (fields) => archivePath("documents", { member: memberId, ...fields });
  const listPath = path();
  const groupMenu = path({ group: groupId, sheet: "group-actions" });
  const photoMenu = path({ group: groupId, item: itemId, sheet: "group-photo-actions" });
  const [downloadNotice, setDownloadNotice] = useState(null);
  const folderTrigger = useRef(null);
  const lastListAction = useRef(null);
  const lastPhotoMenu = useRef(null);
  const scrollPositions = useRef(new Map());
  const listBody = useCallback((body) => {
    if (!body) return;
    body.scrollTop = scrollPositions.current.get(memberId) || 0;
    const frame = requestAnimationFrame(() => {
      Array.from(body.querySelectorAll("[data-document-list-action]"))
        .find((button) => button.dataset.documentListAction === lastListAction.current)
        ?.focus({ preventScroll: true });
    });
    return () => {
      scrollPositions.current.set(memberId, body.scrollTop);
      cancelAnimationFrame(frame);
    };
  }, [memberId]);
  const groupMenuBody = useCallback((body) => {
    if (!body) return;
    body.scrollTop = scrollPositions.current.get(groupMenu) || 0;
    const frame = requestAnimationFrame(() => {
      Array.from(body.querySelectorAll("[data-document-photo-menu]"))
        .find((button) => button.dataset.documentPhotoMenu === lastPhotoMenu.current)
        ?.focus({ preventScroll: true });
    });
    return () => {
      scrollPositions.current.set(groupMenu, body.scrollTop);
      cancelAnimationFrame(frame);
    };
  }, [groupMenu]);
  const viewing = !!memberId && !managementOpen && !sheet;
  const zoom = useArchiveZoom(viewing ? owner + ":documents:" + memberId : "");
  const [zoomGroup, zoomItem] = zoom.side.split(":");
  const preview = viewing && zoom.side && album?.groups
    .find((entry) => encodeURIComponent(entry.id) === zoomGroup)
    ?.photos.find((entry) => encodeURIComponent(entry.id) === zoomItem);
  const go = (fields) => {
    clearError();
    setDownloadNotice(null);
    navigateArchive(path(fields));
  };
  const back = (destination) => {
    clearError();
    setDownloadNotice(null);
    backInArchive(destination);
  };
  const download = (entry, index) => {
    const image = entry.photos[index];
    if (!hasDocumentPhotoFile(image) || getStore("account")?.session?.phone !== owner) return;
    let message = "已发起照片下载。";
    try {
      const extension = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[image.blob.type] || "";
      const name = entry.name.replace(/[\\/:*?"<>|]/g, "_") + "-" + (index + 1);
      downloadAlbumBlob(image.blob, name + extension);
    } catch {
      message = "下载未完成，请重试。";
    }
    setDownloadNotice({ id: entry.id, search, message });
  };
  const openDownload = (entry) => {
    if (entry.photos.length === 1) {
      download(entry, 0);
      return;
    }
    lastListAction.current = "download:" + entry.id;
    go({ group: entry.id, sheet: "download-group" });
  };
  const downloadStatus = (id) => (
    <p className="document-group-notice" role="status">
      {downloadNotice?.id === id && downloadNotice.search === search ? downloadNotice.message : ""}
    </p>
  );
  const errorMessage = error && <p className="album-error" role="alert">{error}</p>;
  const list = (
    <SharedSheet opened id="document-groups-title" title={album?.name || "证件照片"}
      className={album?.canCreate ? "" : "archive-management-sheet"}
      busy={busy} onClose={() => back(root)} bodyRef={listBody} returnFocusRef={folderTrigger}
      footer={album?.canCreate && (
        <button type="button" className="tool-primary" disabled={busy}
          onClick={() => {
            lastListAction.current = null;
            go({ sheet: "new-group" });
          }}>
          添加证件
        </button>
      )}>
      {album?.groups.length ? album.groups.map((entry) => (
        <section className="document-group" key={entry.id}>
          <header>
            <h3>{entry.name}</h3>
            <div className="document-group-actions">
              <button type="button" className="document-download-button" data-document-list-action={"download:" + entry.id}
                aria-label={"下载「" + entry.name + "」的照片"}
                aria-haspopup={entry.photos.length > 1 ? "dialog" : undefined}
                disabled={busy || !entry.photos.some(hasDocumentPhotoFile)} onClick={() => openDownload(entry)}>
                下载
              </button>
              <button type="button" data-document-list-action={"menu:" + entry.id} disabled={busy}
                aria-label={entry.name + "的操作"}
                onClick={() => {
                  lastListAction.current = "menu:" + entry.id;
                  lastPhotoMenu.current = null;
                  go({ group: entry.id, sheet: "group-actions" });
                }}>
                <svg aria-hidden="true"><use href="#i-more" /></svg>
              </button>
            </div>
          </header>
          {entry.photos.length === 1 && downloadStatus(entry.id)}
          <div className="archive-photo-grid">
            {entry.photos.map((image, index) => {
              const key = documentPreviewKey(entry.id, image.id);
              return (
                <button type="button" key={image.id} data-zoom-source={key}
                  aria-label={"放大查看「" + entry.name + "」的第 " + (index + 1) + " 张照片"}
                  disabled={!hasDocumentPhotoFile(image)}
                  onClick={() => {
                    lastListAction.current = null;
                    zoom.open(key);
                  }}>
                  <DocumentThumbnail photo={image} />
                </button>
              );
            })}
          </div>
          {!entry.photos.length && <Empty>这份证件还没有照片。</Empty>}
        </section>
      )) : <Empty>{album ? "还没有证件。" : "这个家人相册已不存在。"}</Empty>}
      {errorMessage}
    </SharedSheet>
  );

  let panel = null;
  if (memberId && !managementOpen) {
    if (viewing && zoom.side) {
      panel = <ArchiveZoom onClose={zoom.close}>
        {preview?.blob?.size ? <ArchiveImage photo={preview} alt="证件照片" /> :
          <p className="album-photo-viewer-error" role="status">照片暂时无法显示</p>}
      </ArchiveZoom>;
    } else if (viewing) panel = list;
    else if (group && sheet === "download-group") {
      panel = (
        <DocumentDownloadSheet group={group} busy={busy} status={downloadStatus(group.id)}
          onClose={() => back(listPath)} onDownload={(index) => download(group, index)} />
      );
    } else if (album && (group || (!groupId && album.canCreate)) &&
        ["new-group", "append-group", "pick-group-photos"].includes(sheet)) {
      const editing = path({ group: groupId, sheet: group ? "append-group" : "new-group" });
      panel = (
        <DocumentGroupComposer key={memberId + ":" + (groupId || "new")} album={album} group={group}
          busy={busy} error={error} pickingMore={sheet === "pick-group-photos"}
          onPickMore={() => go({ group: groupId, sheet: "pick-group-photos" })}
          onReturnFromPicker={() => back(editing)} onClose={() => back(group ? groupMenu : listPath)}
          onSave={(name, photos) => save(
            () => (state) => group
              ? appendDocumentGroupPhotos(state, group, photos)
              : addDocumentGroup(state, album.holderId, name, photos),
            () => {
              if (!group) scrollPositions.current.set(memberId, 0);
              back(listPath);
            },
          )} />
      );
    } else if (group && sheet === "group-actions") {
      panel = (
        <SharedSheet opened id="document-group-actions-title" title={group.name}
          className="archive-management-sheet" onClose={() => back(listPath)} busy={busy} bodyRef={groupMenuBody}>
          <DocumentAction onClick={() => go({ group: groupId, sheet: "append-group" })}>添加照片</DocumentAction>
          <DocumentAction onClick={() => go({ group: groupId, sheet: "rename-group" })}>修改证件名称</DocumentAction>
          {group.photos.length > 0 && (
            <section className="document-group-action-photos" aria-labelledby="group-photo-actions-heading">
              <h3 id="group-photo-actions-heading">证件照片</h3>
              {group.photos.map((image, index) => (
                <DocumentAction key={image.id} photo={image}
                  onClick={() => {
                    lastPhotoMenu.current = image.id;
                    go({ group: groupId, item: image.id, sheet: "group-photo-actions" });
                  }}>
                  第 {index + 1} 张
                </DocumentAction>
              ))}
            </section>
          )}
          <DocumentAction danger onClick={() => go({ group: groupId, sheet: "delete-group" })}>
            删除证件
          </DocumentAction>
          {errorMessage}
        </SharedSheet>
      );
    } else if (photo && sheet === "group-photo-actions") {
      const open = (action) => go({ group: groupId, item: itemId, sheet: action });
      panel = (
        <DocumentPhotoActions canDownload={hasDocumentPhotoFile(photo)} status={downloadStatus(group.id)}
          onDownload={() => download(group, photoIndex)} onClose={() => back(groupMenu)}
          onReplace={() => open("replace-group-photo")} onDelete={() => open("delete-group-photo")} />
      );
    } else if (group && sheet === "rename-group") {
      panel = (
        <DocumentNameSheet key={groupId} initialName={group.name}
          busy={busy} error={errorMessage}
          onClose={() => back(groupMenu)}
          onSave={(name) => save(() => (state) => renameDocumentGroup(state, group, name), () => back(groupMenu))} />
      );
    } else if (photo && sheet === "replace-group-photo") {
      panel = (
        <FamilyPhotoPicker member={album} library={getStore("photoLibrary")} multiple={false}
          busy={busy} error={error} onClose={() => back(photoMenu)}
          onAdd={(prepare) => save(async () => {
            const [image] = await prepare();
            return (state) => replaceDocumentPhoto(state, group, itemId, image);
          }, () => back(groupMenu))} />
      );
    } else if ((group && sheet === "delete-group") || (photo && sheet === "delete-group-photo")) {
      const deletingPhoto = sheet === "delete-group-photo";
      panel = (
        <DocumentGroupDelete key={sheet + ":" + (itemId || groupId)}
          group={group} photoId={deletingPhoto ? itemId : null}
          busy={busy} error={error} onClose={() => back(deletingPhoto ? photoMenu : groupMenu)}
          onDelete={(snapshot, photoId) => save(
            () => (state) => deleteDocumentPhotos(state, snapshot, photoId),
            (saved) => {
              if (saved.documents.some((entry) => entry.id === groupId)) back(groupMenu);
              else back(documentAlbums(saved).some((entry) => entry.id === memberId) ? listPath : root);
            },
            "删除未完成，照片已保留，请重试。",
          )} />
      );
    } else {
      panel = (
        <SharedSheet opened id="document-group-unavailable-title" title="证件照片"
          onClose={() => back(album ? listPath : root)}>
          <Empty>这份证件暂不可用。</Empty>
        </SharedSheet>
      );
    }
  }

  return (
    <>
      <ArchiveFolderGrid documentCover entries={albums.map((entry) => ({
        ...entry,
        photos: entry.groups.flatMap((group) => group.photos.slice(0, 3)).slice(0, 3),
        caption: entry.groups.length + " 份",
      }))} onOpen={(id, trigger) => {
        folderTrigger.current = trigger;
        lastListAction.current = null;
        go({ member: id });
      }} />
      {panel}
    </>
  );
}

function DocumentThumbnail({ photo }) {
  const unavailable = <span>照片不可用</span>;
  return (
    <span className="document-group-thumb">
      <ArchiveImage photo={photo} loading="lazy" hideOnError
        fallback={hasDocumentPhotoFile(photo) ? null : unavailable} errorFallback={unavailable} />
    </span>
  );
}

function DocumentAction({ children, onClick, disabled, danger = false, photo }) {
  return (
    <button type="button" className={danger ? "archive-row document-group-danger" : "archive-row"}
      disabled={disabled} onClick={onClick} data-document-photo-menu={photo?.id}>
      {photo && <DocumentThumbnail photo={photo} />}
      <span className="archive-row-text">{children}</span>
    </button>
  );
}

function DocumentDownloadSheet({ group, busy, status, onClose, onDownload }) {
  return (
    <SharedSheet opened id="document-download-title" title="下载证件照片"
      className="archive-management-sheet" onClose={onClose} busy={busy}>
      <h3 className="document-download-name">{group.name}</h3>
      {status}
      {group.photos.length ? (
        <div className="archive-photo-grid document-download-grid">
          {group.photos.map((photo, index) => (
            <button type="button" key={photo.id} disabled={busy || !hasDocumentPhotoFile(photo)}
              aria-label={"下载第 " + (index + 1) + " 张照片"} onClick={() => onDownload(index)}>
              <DocumentThumbnail photo={photo} />
              <span className="document-download-label">下载</span>
            </button>
          ))}
        </div>
      ) : <Empty>这份证件还没有照片。</Empty>}
    </SharedSheet>
  );
}

function DocumentPhotoActions({ canDownload, status, onClose, onDownload, onReplace, onDelete }) {
  return (
    <SharedSheet opened id="document-photo-actions-title" title="照片操作"
      className="archive-management-sheet" onClose={onClose}>
      <DocumentAction disabled={!canDownload} onClick={onDownload}>下载</DocumentAction>
      <DocumentAction onClick={onReplace}>替换</DocumentAction>
      <DocumentAction danger onClick={onDelete}>删除照片</DocumentAction>
      {status}
    </SharedSheet>
  );
}

function DocumentNameSheet({ initialName, busy, error, onClose, onSave }) {
  const [name, setName] = useState(initialName);
  return (
    <SharedSheet opened id="document-name-title" title="修改证件名称"
      busy={busy} onClose={onClose} footer={
        <button type="button" className="tool-primary" disabled={busy || !name.trim()}
          onClick={() => onSave(name)}>{busy ? "正在保存…" : "保存"}</button>
      }>
      <fieldset className="archive-form" disabled={busy}>
        <label>证件名称
          <input value={name} maxLength={DOCUMENT_NAME_LIMIT} onChange={(event) => setName(event.target.value)} />
        </label>
      </fieldset>
      {error}
    </SharedSheet>
  );
}

function DocumentGroupDelete({ group, photoId, busy, error, onClose, onDelete }) {
  const [snapshot] = useState(group);
  const last = photoId && snapshot.photos.length === 1;
  const whole = !photoId || last;
  const description = last
    ? "这是「" + snapshot.name + "」的最后一张照片，删除后会一并移除这份证件。"
    : whole
      ? "「" + snapshot.name + "」及其中 " + snapshot.photos.length + " 张照片将被删除，无法恢复。"
      : "这张照片将被删除，无法恢复。";
  return (
    <PhotoDeleteDialog title={whole ? "删除证件？" : "删除这张照片？"}
      description={description} confirmLabel={whole ? "删除证件" : "删除照片"}
      busy={busy} error={error} onClose={onClose} onDelete={() => onDelete(snapshot, photoId)} />
  );
}

function DocumentGroupComposer({ album, group, busy, error, pickingMore, onPickMore, onReturnFromPicker, onClose, onSave }) {
  const [photos, setPhotos] = useState([]);
  const [name, setName] = useState("");
  const [preparing, setPreparing] = useState(false), [readError, setReadError] = useState("");
  const active = useRef(false), preparingRef = useRef(false);
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
      setPhotos((current) => [...current, ...images]);
      if (pickingMore) onReturnFromPicker();
    } catch (failure) {
      if (active.current && source === currentArchiveRoute())
        setReadError(failure instanceof DOMException ? "图片未能读取，请重新选择。" : failure.message || "图片未能读取，请重新选择。");
    } finally {
      preparingRef.current = false;
      if (active.current) setPreparing(false);
    }
  }
  if (!photos.length || pickingMore)
    return <FamilyPhotoPicker member={album} library={getStore("photoLibrary")}
      busy={busy || preparing} error={readError || error} onAdd={select}
      onClose={pickingMore ? onReturnFromPicker : onClose} />;

  return (
    <SharedSheet opened id="document-group-composer-title" title={group ? "添加照片" : "添加证件"}
      onClose={onClose} busy={busy} footer={
        <button type="button" className="tool-primary" disabled={busy} onClick={() => onSave(name, photos)}>
          {busy ? "正在保存…" : group ? "保存照片" : "保存"}
        </button>
      }>
      <fieldset className="archive-form" disabled={busy}>
        {!group && (
          <label>证件名称（选填）
            <input value={name} maxLength={DOCUMENT_NAME_LIMIT} placeholder="例如：身份证"
              onChange={(event) => setName(event.target.value)} />
          </label>
        )}
        <div className="archive-photo-grid" role="group" aria-label={"已选 " + photos.length + " 张照片"}>
          {photos.map((photo) => <DocumentThumbnail key={photo.id} photo={photo} />)}
        </div>
        <button type="button" className="document-group-add" onClick={() => {
          setReadError("");
          onPickMore();
        }}>继续添加照片</button>
      </fieldset>
      {error && <p className="album-error" role="alert">{error}</p>}
    </SharedSheet>
  );
}
