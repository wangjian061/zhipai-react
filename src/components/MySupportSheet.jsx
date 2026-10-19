import React from "react";
const Icon = ({ name }) => (
  <svg aria-hidden="true">
    <use href={`#i-${name}`} />
  </svg>
);
export default function MySupportSheet({ scope: s }) {
  if (s.panel !== "support" || !s.$store.myUi.opened) return null;
  return (
    <div className="ui-sheet-panel my-support-panel">
      <div className="ui-sheet-body">
        {s.supportEmailConfirm ? (
          <div className="my-support-confirm">
            <span className="my-support-symbol">
              <Icon name="nav-service" />
            </span>
            <h3>是否打开邮箱联系知拍客服？</h3>
            <p>将使用设备上的邮件应用</p>
            <strong>{s.supportEmail}</strong>
          </div>
        ) : (
          <>
            <section className="my-support-contact">
              <span className="my-support-symbol">
                <Icon name="nav-service" />
              </span>
              <div>
                <h3>联系知拍客服</h3>
                <p>通过邮件咨询使用问题</p>
              </div>
              <button
                data-support-contact
                onClick={() => s.requestSupportEmail()}
              >
                联系
                <Icon name="chevron" />
              </button>
            </section>
            <section className="my-support-email" aria-label="客服邮箱">
              <h3>客服邮箱</h3>
              <div>
                <span>{s.supportEmail}</span>
                <button onClick={() => s.copySupportEmail()}>复制</button>
              </div>
              {s.supportCopyManual && (
                <input
                  aria-label="手动复制客服邮箱"
                  readOnly
                  value={s.supportEmail}
                  onClick={(e) => e.target.select()}
                />
              )}
            </section>
          </>
        )}
        {s.supportNotice && (
          <p className="my-support-notice" role="status">
            {s.supportNotice}
          </p>
        )}
      </div>
      {s.supportEmailConfirm ? (
        <div className="ui-sheet-footer">
          <a
            className="my-primary"
            data-support-confirm
            href={s.supportEmailHref}
          >
            打开邮箱
          </a>
          <button
            className="my-secondary"
            onClick={() => s.cancelSupportEmail()}
          >
            取消
          </button>
        </div>
      ) : (
        <div className="my-support-bottom" />
      )}
    </div>
  );
}
