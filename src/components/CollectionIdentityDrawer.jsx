import React, { useCallback, useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

const methodNames = {
  id: "身份证号",
  student: "学号",
  employee: "工号",
  passport: "护照号",
  document: "证件号",
  qr: "学号",
};
const methodTitles = {
  student: "学号认证",
  employee: "工号认证",
  passport: "护照认证",
  document: "证件号认证",
};
const subtitles = {
  identity: "上传本人身份证，核对采集身份",
  verify: "核对姓名与证件号码",
  alternate: "填写采集名单中登记的信息",
  employee: "填写姓名与采集通知中的工号",
  qr: "使用本人学信网图像采集码",
  qrCheck: "核对采集码对应的本人信息",
};
function BlockHeading({ title, hint }) {
  return (
    <header className="collection-auth-block-heading">
      <h3>{title}</h3>
      {hint && <span>{hint}</span>}
    </header>
  );
}
function IdentityUpload({ scope: s }) {
  return (
    <section
      className={
        "collection-auth-block" + (s.panel === "verify" ? " is-reviewed" : "")
      }
    >
      <BlockHeading
        title="认证资料"
        hint={s.panel === "verify" ? "点击照片可更换" : "身份证两面"}
      />
      <div className="collection-auth-documents">
        {["front", "back"].map((side) => (
          <div
            key={side}
            className={
              "collection-auth-document" + (s.idURLs[side] ? " uploaded" : "")
            }
          >
            <button
              type="button"
              className="collection-auth-document-picture"
              disabled={s.busy}
              onClick={() =>
                s.$refs[side === "front" ? "idFront" : "idBack"]?.click()
              }
              aria-label={
                (s.idURLs[side] ? "更换" : "上传") +
                (side === "front" ? "身份证人像面" : "身份证国徽面")
              }
            >
              {s.idURLs[side] ? (
                <img
                  src={s.idURLs[side]}
                  alt={side === "front" ? "身份证人像面" : "身份证国徽面"}
                />
              ) : (
                <span
                  className="collection-auth-document-guide"
                  aria-hidden="true"
                >
                  <img
                    className="collection-auth-document-art"
                    src={`assets/collection-id-${side}.svg`}
                    alt=""
                    width="120"
                    height="76"
                  />
                  <span className="collection-auth-guide-add">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 6v12M6 12h12" />
                    </svg>
                  </span>
                </span>
              )}
            </button>
            <span className="collection-auth-document-label">
              {side === "front" ? "人像面" : "国徽面"}
              <small>{s.idURLs[side] ? "已上传" : "待上传"}</small>
            </span>
            <input
              ref={(el) => {
                s.$refs[side === "front" ? "idFront" : "idBack"] = el;
              }}
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              aria-label={
                "上传身份证" + (side === "front" ? "人像面" : "国徽面")
              }
              disabled={s.busy}
              onChange={(event) => s.uploadIdentity(event, side)}
            />
          </div>
        ))}
      </div>
      {s.panel === "identity" && (
        <p className="collection-auth-privacy">证件照片仅用于本次身份核对</p>
      )}
    </section>
  );
}
function PersonalInformation({ scope: s }) {
  const numberLabel = methodNames[s.method] || "编号";
  return (
    <form
      id="collection-auth-form"
      className="collection-auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        s.matchIdentity();
      }}
    >
      {s.panel === "alternate" && (
        <fieldset className="collection-auth-block collection-auth-method-block">
          <legend>认证方式</legend>
          <div className="collection-auth-method-options">
            {s.identityMethods.map((method) => (
              <label
                key={method}
                className={
                  "collection-auth-method-option" +
                  (s.method === method ? " selected" : "")
                }
              >
                <input
                  type="radio"
                  name="collection-auth-method"
                  value={method}
                  checked={s.method === method}
                  disabled={s.busy}
                  onChange={() => {
                    s.method = method;
                  }}
                />
                <span>{methodTitles[method] || methodNames[method]}</span>
                <CollectionIcon name="check" />
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <section className="collection-auth-block collection-auth-personal">
        <BlockHeading title="个人信息" />
        <label className="collection-auth-field">
          <span>姓名</span>
          <div className="collection-auth-input">
            <input
              name="collection-person-name"
              maxLength={30}
              placeholder="请输入本人姓名"
              autoComplete="name"
              disabled={s.busy}
              required
              value={s.identity.name}
              onChange={(event) => {
                s.identity.name = event.target.value;
              }}
            />
          </div>
        </label>
        <label className="collection-auth-field">
          <span>{numberLabel}</span>
          <div className="collection-auth-input">
            <input
              name="collection-person-number"
              type={s.method === "id" && s.maskIdentity ? "password" : "text"}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              placeholder={"请输入" + numberLabel}
              disabled={s.busy}
              required
              value={s.identity.number}
              onChange={(event) => {
                s.identity.number = event.target.value;
              }}
            />
            {s.method === "id" && (
              <button
                type="button"
                disabled={s.busy}
                aria-label={s.maskIdentity ? "显示证件号" : "隐藏证件号"}
                aria-pressed={!s.maskIdentity}
                onClick={() => {
                  s.maskIdentity = !s.maskIdentity;
                }}
              >
                <CollectionIcon name="eye" />
              </button>
            )}
          </div>
        </label>
        {s.panel === "qrCheck" && (
          <label className="collection-auth-field">
            <span>证件号后四位</span>
            <div className="collection-auth-input">
              <input
                name="collection-person-last-four"
                inputMode="numeric"
                maxLength={4}
                placeholder="仅填写后四位"
                disabled={s.busy}
                value={s.identity.lastFour}
                onChange={(event) => {
                  s.identity.lastFour = event.target.value;
                }}
              />
            </div>
          </label>
        )}
      </section>
    </form>
  );
}
export default function CollectionIdentityDrawer({ scope: s }) {
  const dialog = useRef(null),
    body = useRef(null);
  const attach = useCallback(
    (el) => {
      dialog.current = el;
      if (el) s.$refs.collectionDialog = el;
    },
    [s],
  );
  useLayoutEffect(() => {
    if (!s.isAuthPanel) return;
    const node = dialog.current;
    if (node) s.$refs.collectionDialog = node;
    node?.querySelector("button")?.focus({ preventScroll: true });
    if (body.current) body.current.scrollTop = 0;
    return () => {
      if (s.$refs.collectionDialog === node) delete s.$refs.collectionDialog;
    };
  }, [s, s.panel]);
  useLayoutEffect(() => {
    if (s.error && body.current) body.current.scrollTop = 0;
  }, [s.error]);
  if (!s.isAuthPanel) return null;
  const hasForm = ["verify", "alternate", "employee", "qrCheck"].includes(
    s.panel,
  );
  return (
    <section
      className="collection-drawer collection-auth-drawer"
      data-panel={s.panel}
      ref={attach}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-auth-title"
      aria-describedby="collection-auth-subtitle"
    >
      <header className="collection-auth-header">
        <div>
          <h2 id="collection-auth-title">{s.panelTitle}</h2>
          <p id="collection-auth-subtitle">{subtitles[s.panel]}</p>
        </div>
        <button
          type="button"
          disabled={s.busy}
          onClick={() => s.closePanel()}
          aria-label="关闭"
        >
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="collection-auth-body" ref={body}>
        <div className="collection-auth-project-context">
          <span>{s.project.organization}</span>
          <strong>{s.project.name}</strong>
        </div>
        {s.error && (
          <p className="collection-auth-error" role="alert">
            {s.error}
          </p>
        )}
        {["identity", "verify"].includes(s.panel) && (
          <IdentityUpload scope={s} />
        )}
        {s.panel === "qrCheck" && s.qrRead && (
          <section className="collection-auth-proof">
            <CollectionIcon name="check" />
            <span>{s.qrPrototype ? "演示采集码已识别" : "采集码已识别"}</span>
            {s.qrURL && <img src={s.qrURL} alt="已识别的图像采集码" />}
          </section>
        )}
        {hasForm && <PersonalInformation scope={s} />}
        {s.panel === "qr" && (
          <section className="collection-auth-block">
            <BlockHeading title="认证资料" hint="学信网图像采集码" />
            <div className="collection-auth-qr-guide">
              <CollectionIcon name="scan" />
              <strong>上传或扫描采集码</strong>
              <p>JPG、PNG 或 WebP，15 MB以内</p>
            </div>
          </section>
        )}
        <input
          ref={(el) => {
            s.$refs.collectionQr = el;
          }}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          aria-label="上传采集码"
          disabled={s.busy}
          onChange={(event) => s.uploadQR(event)}
        />
      </div>
      <footer className="collection-auth-footer">
        {s.panel === "identity" && (
          <>
            <button
              className="collection-primary"
              type="button"
              disabled={s.busy || !s.idSides.front || !s.idSides.back}
              onClick={() => s.reviewIdentity()}
            >
              核对身份信息
              <CollectionIcon name="arrow" />
            </button>
            {s.identityMethods.length > 0 && (
              <button
                className="collection-auth-secondary"
                type="button"
                disabled={s.busy}
                onClick={() => s.alternate()}
              >
                其他认证方式
                <CollectionIcon name="chevron" />
              </button>
            )}
          </>
        )}
        {hasForm && (
          <>
            <button
              className="collection-primary"
              type="submit"
              form="collection-auth-form"
              disabled={
                s.disabled ||
                !s.identity.name.trim() ||
                !s.identity.number.trim()
              }
            >
              {s.busy ? "匹配中…" : "确认并匹配"}
            </button>
            {s.authReturnLabel && (
              <button
                className="collection-auth-secondary"
                type="button"
                disabled={s.disabled}
                onClick={() => s.returnAuthentication()}
              >
                <CollectionIcon name="chevron-left" />
                {s.authReturnLabel}
              </button>
            )}
          </>
        )}
        {s.panel === "qr" && (
          <>
            <button
              className="collection-primary"
              type="button"
              disabled={s.busy}
              onClick={() => s.$refs.collectionQr?.click()}
            >
              <CollectionIcon name="nav-album" />
              上传采集码
            </button>
            <div className="collection-auth-footer-options">
              <button
                className="collection-auth-secondary"
                type="button"
                disabled={s.disabled}
                onClick={() => s.scanCode()}
              >
                <CollectionIcon name="scan" />
                使用相机扫码
              </button>
              {s.identityMethods.length > 0 && (
                <button
                  className="collection-auth-secondary"
                  type="button"
                  disabled={s.busy}
                  onClick={() => s.alternate()}
                >
                  其他认证方式
                  <CollectionIcon name="chevron" />
                </button>
              )}
            </div>
          </>
        )}
      </footer>
    </section>
  );
}
