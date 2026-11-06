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
import SpecificationIcon from "./SpecificationIcon.jsx";
import { getStore } from "../runtime/state.js";
import { accountRoute } from "../domain/account.js";
import { albumDate } from "../domain/photo-date.js";
import {
  DOCUMENT_TYPES,
  archivePath,
  backInArchive,
  navigateArchive,
  readArchive,
  updateArchive,
  importArchiveImage,
  newMember,
  appendFamilyPhotos,
  deleteFamilyPhoto,
  addDocument,
  deleteDocumentSide,
} from "../domain/album-spaces.js";

const tabs = [
  ["mine", "我的照片"],
  ["family", "家人照片"],
  ["documents", "证件照片"],
];
export function AlbumTabs({ space = "mine" }) {
  return (
    <nav className="album-space-tabs" aria-label="相册分类">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-current={space === id ? "page" : undefined}
          onClick={() => navigateArchive(archivePath(id), true)}
        >
          {label}
        </button>
      ))}
    </nav>
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
function ArchiveImage({ photo, alt = "", className = "" }) {
  const [image, setImage] = useState(null);
  const blob = photo?.blob;
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setImage({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return image?.blob === blob && image?.url ? (
    <img decoding="async" className={className} src={image.url} alt={alt} />
  ) : null;
}
function ArchiveHeading({ title, onBack, children }) {
  return (
    <header className="archive-heading">
      {onBack && (
        <button type="button" aria-label="返回" onClick={onBack}>
          <svg aria-hidden="true">
            <use href="#i-chevron" />
          </svg>
        </button>
      )}
      <h2>{title}</h2>
      {children}
    </header>
  );
}
function FileControl({
  label,
  multiple = false,
  busy = false,
  onFiles,
  accept = "image/jpeg,image/png,image/webp",
}) {
  return (
    <label className="archive-file-button">
      {label}
      <input
        type="file"
        aria-label={label}
        accept={accept}
        multiple={multiple}
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files || []);
          event.currentTarget.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </label>
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
  const spec = DOCUMENT_TYPES.find((t) => t.id === type);
  const doc = data?.documents.find((d) => d.type === type && d.id === itemId);
  const photo = member?.photos.find((p) => p.id === itemId);
  const deleting =
    space === "documents" &&
    ["delete-front", "delete-back", "delete-document"].includes(sheet);
  const deletingPhoto = space === "family" && sheet === "delete-photo";
  const memberListOpen = space === "family" && !!memberId && !itemId && !sheet;
  const deleteTrigger = useRef(null);
  const fields = { member: memberId, doctype: type, item: itemId };
  const base = archivePath(space, fields);
  const root = archivePath(space);
  const listPath = archivePath(space, { member: memberId, doctype: type });
  const detailTrigger = useRef(null);
  const previousDocument = useRef(null);
  useEffect(() => {
    const previous = previousDocument.current;
    previousDocument.current =
      space === "documents" && itemId ? { id: itemId, type } : null;
    if (!previous || itemId || space !== "documents") return;
    const frame = requestAnimationFrame(() => {
      const target =
        Array.from(
          panelRef.current?.querySelectorAll("[data-document-id]") || [],
        ).find((node) => node.dataset.documentId === previous.id) ||
        panelRef.current?.querySelector(
          '[data-document-type="' + previous.type + '"]',
        );
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [space, itemId, type]);
  const zoom = useArchiveZoom(
    itemId ? [owner, space, memberId || type, itemId].join(":") : "",
  );
  useEffect(() => {
    if ((!itemId && !sheet && !memberId) || !data || !owner) return;
    const ui = getStore("albumSpacesUi");
    ui.opened = true;
    return () => {
      ui.opened = false;
    };
  }, [itemId, sheet, memberId, !!data, owner]);
  const memberTrigger = useRef(null);
  const memberBody = useRef(null);
  const memberScroll = useRef(new Map());
  const lastOpenedPhoto = useRef(null);
  useLayoutEffect(() => {
    const body = memberBody.current;
    if (!memberListOpen || !body) return;
    body.scrollTop = memberScroll.current.get(memberId) || 0;
    return () => {
      memberScroll.current.set(memberId, body.scrollTop);
    };
  }, [memberListOpen, memberId, !!data]);
  const panelRef = useRef(null);
  const addPhotoButton = useRef(null);
  const scrollPositions = useRef(new Map());
  const scrollKey = space === "documents" ? root : listPath;
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = scrollPositions.current.get(scrollKey) || 0;
    return () => {
      scrollPositions.current.set(scrollKey, panel.scrollTop);
    };
  }, [scrollKey, !!data]);
  const go = (params) => navigateArchive(archivePath(space, params));
  const openSheet = (name) => {
    setError("");
    go({ ...fields, sheet: name });
  };
  const closeSheet = () => {
    setError("");
    backInArchive(base);
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
    backInArchive(archivePath(space, { member: memberId, doctype: type }));
  const save = async (prepare, after) => {
    if (!owner || writing.current) return;
    writing.current = true;
    reading.current++;
    setBusy(true);
    setError("");
    const source = location.search;
    try {
      const mutate = await prepare();
      if (!mounted.current || location.search !== source) return;
      const saved = await updateArchive(owner, mutate);
      if (mounted.current) {
        setData(saved);
        if (location.search === source) after?.(saved);
      }
    } catch (e) {
      if (/证件已变化|图片已不存在/.test(e.message || "")) {
        try {
          const latest = await readArchive(owner);
          if (mounted.current) setData(latest);
        } catch {
          /* Preserve the original failure so the user can retry. */
        }
      }
      if (mounted.current && location.search === source)
        setError(
          e instanceof DOMException
            ? "保存失败，请检查图片和本地存储后重试。"
            : e.message || "未能保存，请重试。",
        );
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const removeDocument = async (snapshot, side) => {
    if (!owner || !snapshot || writing.current) {
      return;
    }
    writing.current = true;
    reading.current++;
    setBusy(true);
    setError("");
    // Confirmed deletes write immediately; they do not pass through async file
    // preparation or depend on the raw URL's query-parameter order.
    const stillConfirming = () => {
      const q = new URLSearchParams(location.search);
      return (
        q.get("page") === "album" &&
        q.get("space") === "documents" &&
        q.get("item") === snapshot.id &&
        q.get("sheet") === sheet
      );
    };
    try {
      const saved = await updateArchive(owner, (state) =>
        deleteDocumentSide(state, snapshot, side),
      );
      if (!mounted.current) return;
      setData(saved);
      if (!stillConfirming()) return;
      if (saved.documents.some((item) => item.id === snapshot.id)) closeSheet();
      else if (
        history.state?.albumDeleteFromList &&
        history.state?.albumSpaceParent === base &&
        history.length > 2
      )
        history.go(-2);
      else navigateArchive(listPath, true);
    } catch (failure) {
      if (!mounted.current || !stillConfirming()) return;
      if (/证件已变化|图片已不存在/.test(failure.message || "")) {
        try {
          setData(await readArchive(owner));
        } catch {
          /* Keep the original conflict visible. */
        }
        if (mounted.current && stillConfirming()) setError(failure.message);
      } else setError("删除未完成，证件已保留，请重试。");
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
  const holderName = (id) =>
    id ? data?.members.find((m) => m.id === id)?.name || "家人" : "本人";
  if (!owner)
    return (
      <section className="archive-panel">
        <Empty>登录后查看{space === "family" ? "家人照片" : "证件照片"}</Empty>
        <button
          className="tool-primary"
          onClick={() => accountRoute("welcome", base)}
        >
          登录 / 注册
        </button>
      </section>
    );
  if (!data)
    return (
      <section className="archive-panel">
        {error ? (
          <>
            {err}
            <button className="account-text" onClick={load}>
              重新读取
            </button>
          </>
        ) : (
          <p role="status">正在读取相册…</p>
        )}
      </section>
    );

  let body;
  if (space === "family") {
    body = (
      <>
        <ArchiveHeading title="家人相册">
          <button onClick={() => openSheet("member")}>添加家人</button>
        </ArchiveHeading>
        {!data.members.length && (
          <Empty>添加第一位家人，为对方建立照片相册。</Empty>
        )}
        {data.members.map((m) => (
          <button
            key={m.id}
            className="archive-row"
            onClick={(event) => {
              memberTrigger.current = event.currentTarget;
              go({ member: m.id });
            }}
          >
            <span className="archive-avatar">
              {m.photos.length ? (
                <ArchiveImage photo={m.photos[0]} />
              ) : (
                Array.from(m.name)[0]
              )}
            </span>
            <span className="archive-row-text">
              <strong>{m.name}</strong>
            </span>
            <span>{m.photos.length} 张</span>
            <Chevron />
          </button>
        ))}
      </>
    );
  } else if (space === "documents") {
    body = (
      <>
        <ArchiveHeading title="按证件类型查看">
          <button onClick={() => openSheet("document")}>添加证件</button>
        </ArchiveHeading>
        {DOCUMENT_TYPES.map((t) => {
          const expanded = type === t.id;
          const docs = data.documents.filter((d) => d.type === t.id);
          return (
            <section key={t.id} className="archive-document-group">
              <button
                type="button"
                key={t.id}
                id={"archive-document-toggle-" + t.id}
                data-document-type={t.id}
                className="archive-row"
                aria-expanded={expanded}
                aria-controls={"archive-documents-" + t.id}
                onClick={() =>
                  navigateArchive(
                    archivePath(space, { doctype: expanded ? null : t.id }),
                    true,
                  )
                }
              >
                <span className="archive-type-icon">
                  <SpecificationIcon kind={t.icon} />
                </span>
                <strong className="archive-row-text">{t.name}</strong>
                <span>{docs.length} 份</span>
                <Chevron />
              </button>
              <div
                id={"archive-documents-" + t.id}
                hidden={!expanded}
                className="archive-document-list"
                role="region"
                aria-labelledby={"archive-document-toggle-" + t.id}
              >
                {expanded &&
                  (!docs.length ? (
                    <Empty>尚未添加{t.name}。</Empty>
                  ) : (
                    docs.map((d) => (
                      <button
                        type="button"
                        className="archive-row"
                        key={d.id}
                        data-document-id={d.id}
                        aria-haspopup="dialog"
                        onClick={(e) => {
                          detailTrigger.current = e.currentTarget;
                          go({ doctype: t.id, item: d.id });
                        }}
                      >
                        <ArchiveImage
                          className="archive-document-thumb"
                          photo={d.front || d.back}
                        />
                        <span className="archive-row-text">
                          <strong>
                            {holderName(d.holderId)} · {t.name}
                          </strong>
                          <small>
                            {Number(!!d.front) + Number(!!d.back)} 张图片
                          </small>
                        </span>
                        <Chevron />
                      </button>
                    ))
                  ))}
              </div>
            </section>
          );
        })}
      </>
    );
  } else
    body = (
      <>
        <ArchiveHeading title="相册" onBack={() => backInArchive(root)} />
        <Empty>当前账号下找不到这项内容。</Empty>
      </>
    );

  return (
    <section
      className="archive-panel"
      ref={panelRef}
      aria-label={space === "family" ? "家人照片" : "证件照片"}
    >
      {body}
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
      {space === "documents" &&
        itemId &&
        !deleting &&
        (zoom.side && (photo || doc?.[zoom.side]) ? (
          <ArchiveZoom onClose={zoom.close}>
            <ArchiveImage
              photo={photo || doc[zoom.side]}
              alt={photo ? "家人照片" : spec.name}
            />
          </ArchiveZoom>
        ) : (
          <SharedSheet
            opened
            title={
              photo
                ? member.name + "的照片"
                : doc
                  ? holderName(doc.holderId) + " · " + spec.name
                  : "照片详情"
            }
            id="archive-detail-title"
            busy={busy}
            onClose={returnFromItem}
            returnFocusRef={detailTrigger}
            footer={
              doc && (
                <button
                  type="button"
                  className="archive-delete-document"
                  data-document-delete="document"
                  disabled={busy}
                  onClick={(event) => requestDelete("document", event)}
                >
                  删除整份证件
                </button>
              )
            }
          >
            {doc ? (
              <>
                {" "}
                {[
                  ["front", spec.front],
                  ["back", spec.back],
                ]
                  .filter(([, label]) => label)
                  .map(([side, label]) => (
                    <section className="archive-side" key={side}>
                      <header className="archive-side-heading">
                        <h3>{label}</h3>
                        {doc[side] && (
                          <div className="archive-side-actions">
                            <button
                              type="button"
                              disabled={busy}
                              data-document-delete={side}
                              aria-label={"删除" + label}
                              onClick={(event) => requestDelete(side, event)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </header>
                      {doc[side] ? (
                        <button
                          type="button"
                          className="archive-detail-enlarge"
                          data-zoom-source={side}
                          aria-label={"放大查看" + label}
                          onClick={() => zoom.open(side)}
                        >
                          <ArchiveImage
                            className="archive-full-image"
                            photo={doc[side]}
                            alt={label}
                          />
                        </button>
                      ) : (
                        <Empty>未添加{label}</Empty>
                      )}
                    </section>
                  ))}
              </>
            ) : (
              <Empty>这条记录已不存在。</Empty>
            )}
            {err}
          </SharedSheet>
        ))}
      {deleting && (
        <DocumentDeleteDialog
          key={owner + itemId + sheet}
          doc={doc}
          spec={spec}
          side={sheet === "delete-document" ? null : sheet.slice(7)}
          busy={busy}
          error={error}
          onClose={closeSheet}
          returnFocusRef={deleteTrigger}
          onDelete={removeDocument}
        />
      )}
      {!sheet && !itemId && err}
      {!sheet && busy && <p role="status">正在保存…</p>}
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
      {((sheet === "member" && space === "family" && !memberId) ||
        (sheet === "document" && space === "documents" && !itemId)) && (
        <ArchiveForm
          key={base + sheet}
          kind={sheet}
          initialType={type}
          members={data.members}
          busy={busy}
          error={err}
          save={save}
          close={closeSheet}
        />
      )}
    </section>
  );
}

function Chevron() {
  return (
    <svg className="archive-chevron" aria-hidden="true">
      <use href="#i-chevron" />
    </svg>
  );
}

function ArchiveForm({ kind, initialType, members, busy, error, save, close }) {
  const family = kind === "member";
  const [name, setName] = useState("");
  const [type, setType] = useState(initialType || "identity"),
    [holder, setHolder] = useState("");
  const [front, setFront] = useState(null),
    [back, setBack] = useState(null);
  const spec = DOCUMENT_TYPES.find((t) => t.id === type) || DOCUMENT_TYPES[0];
  const submit = () =>
    save(async () => {
      if (family) {
        const m = newMember(name);
        return (state) => state.members.push(m);
      }
      const first = await importArchiveImage(front);
      const second = spec.back && back ? await importArchiveImage(back) : null;
      return (state) => addDocument(state, type, holder, first, second);
    }, close);
  return (
    <SharedSheet
      id="album-archive-form"
      opened
      title={family ? "添加家人" : "添加证件"}
      busy={busy}
      onClose={close}
      footer={
        <button
          className="tool-primary"
          disabled={busy || (family ? !name.trim() : !front)}
          onClick={submit}
        >
          {busy ? "正在保存…" : "保存"}
        </button>
      }
    >
      <fieldset className="archive-form" disabled={busy}>
        {family ? (
          <>
            <label>
              称呼
              <input
                maxLength={30}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：妈妈、小雨"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              证件类型
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setFront(null);
                  setBack(null);
                }}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              持有人
              <select
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
              >
                <option value="">本人</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["front", spec.front, front, setFront],
              ["back", spec.back, back, setBack],
            ]
              .filter(([, label]) => label)
              .map(([key, label, file, setFile]) => (
                <div className="archive-form-side" key={key}>
                  <strong>
                    {label}
                    {key === "back" ? "（选填）" : ""}
                  </strong>
                  {file && (
                    <ArchiveImage
                      photo={{ blob: file }}
                      alt={label}
                      className="archive-document-thumb"
                    />
                  )}
                  <FileControl
                    label={file ? "更换" + label : "添加" + label}
                    busy={busy}
                    onFiles={([f]) => setFile(f)}
                  />
                </div>
              ))}
          </>
        )}
      </fieldset>
      {error}
    </SharedSheet>
  );
}

function DocumentDeleteDialog({
  doc,
  spec,
  side,
  busy,
  error,
  onClose,
  onDelete,
  returnFocusRef,
}) {
  const [snapshot] = useState(doc);
  const whole = !side || !snapshot?.[side === "front" ? "back" : "front"];
  return (
    <PhotoDeleteDialog
      title={whole ? "删除整份证件？" : "删除" + spec?.[side] + "？"}
      description={
        !snapshot
          ? "这份证件已不存在。"
          : whole
            ? side
              ? "这是最后一面图片，删除后将移除整份证件。"
              : "删除后将移除这份证件及其中全部图片。"
            : "只删除这一面图片，证件的另一面将继续保留。"
      }
      confirmLabel={whole ? "删除整份证件" : "删除这一面"}
      busy={busy}
      unavailable={!snapshot}
      error={error}
      onClose={onClose}
      onDelete={() => onDelete(snapshot, side)}
      returnFocusRef={returnFocusRef}
      returnFocusSelector={
        '[data-document-delete="' + (side || "document") + '"]'
      }
    />
  );
}
