import React from "react";
function Icon({ name }) {
  return (
    <svg aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
export default function SharePage({ scope: s }) {
  if (s.myView !== "share") return null;
  const busy = s.posterLoading || !s.posterBlob || s.saving || s.sharing;
  return (
    <div className="share-page">
      <header className="share-header">
        <button onClick={() => s.backToMy()} aria-label="返回上一页">
          <Icon name="chevron-left" />
        </button>
        <h1>{s.shareEntry ? `分享${s.shareEntry.title}` : "分享知拍"}</h1>
      </header>
      <main className="share-preview-area">
        {s.posterMarkup && (
          <div
            className="share-poster"
            role="img"
            aria-label="分享海报，包含可扫描的访问二维码"
            dangerouslySetInnerHTML={{ __html: s.posterMarkup }}
          />
        )}
        {s.posterLoading && (
          <p className="share-loading" role="status">
            正在准备分享图片…
          </p>
        )}
        {s.posterError && (
          <div className="share-poster-state" role="alert">
            <p>{s.posterError}</p>
            <button onClick={() => s.loadShareContext()}>重新加载</button>
          </div>
        )}
        {!s.posterError && !s.posterLoading && (
          <p className="share-caption">把知拍分享给朋友，扫码即可体验</p>
        )}
      </main>
      <footer className="share-actions">
        <button
          className="share-save"
          disabled={busy}
          onClick={() => s.savePoster()}
        >
          <Icon name="download" />
          {s.saving ? "正在保存…" : "保存分享图片"}
        </button>
        <div className="share-secondary-actions">
          <button disabled={busy} onClick={() => s.systemShare()}>
            <Icon name="share" />
            {s.sharing ? "正在分享…" : "更多分享"}
          </button>
          <button onClick={() => s.copyLink()}>
            <Icon name="link" />
            复制链接
          </button>
        </div>
        {s.notice && (
          <p className="share-message" role="status">
            {s.notice}
          </p>
        )}
        {s.copyManual && (
          <input
            className="share-manual-link"
            aria-label="手动复制分享链接"
            readOnly
            value={s.shareUrl}
            onClick={(e) => e.target.select()}
          />
        )}
      </footer>
    </div>
  );
}
