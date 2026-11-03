import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getControllerScopes,
  getSnapshot,
  getStore,
  subscribe,
} from "../runtime/state.js";
import { resolveWorkbenchContext } from "../workbench/context.js";
import {
  DEMO_SCENARIOS,
  GLOBAL_SCENARIOS,
  scenariosFor,
  createDemoSession,
} from "../workbench/demo-sessions.js";
import { loadPage, loadSource, sourceKey } from "../workbench/documentation.js";
import {
  scrollToDocumentSection,
  restorePageReading,
} from "../workbench/reading-position.js";
import GuideMarkdown from "../workbench/GuideMarkdown.jsx";
import { WorkspaceContext } from "../workbench/WorkspaceContext.jsx";

export default function PrototypeWorkbench({ children }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [, setRouteRevision] = useState(0);
  const [session, setSession] = useState(null),
    [phoneOnly, setPhoneOnly] = useState(false);
  const [feedback, setFeedback] = useState(""),
    [globalOpen, setGlobalOpen] = useState(false);
  const [pageDoc, setPageDoc] = useState(null),
    [pageError, setPageError] = useState(""),
    [pageRetry, setPageRetry] = useState(0);
  const [source, setSource] = useState(null),
    [sourceText, setSourceText] = useState(""),
    [sourceError, setSourceError] = useState(""),
    [sourceRetry, setSourceRetry] = useState(0);
  const active = useRef(null),
    scroll = useRef(null),
    trigger = useRef(null),
    anchor = useRef("");
  const globalMenu = useRef(null),
    globalButton = useRef(null);
  const reading = useRef({
    positions: new Map(),
    guide: null,
    panel: "",
    panelOrigin: null,
    source: null,
    sourceOrigin: 0,
  });
  const scopes = getControllerScopes(),
    search = location.search;
  const base = resolveWorkbenchContext(search, scopes, {
    photoChoice: getStore("photoChoice")?.opened,
  });
  const context = session
    ? resolveWorkbenchContext(search, scopes, {}, session.context())
    : base;
  const scenes = scenariosFor(context),
    currentDoc = pageDoc?.id === context.guide ? pageDoc : null;
  useLayoutEffect(() => {
    const ui = getStore("prototypeWorkspace");
    ui.active = !!session;
    return () => {
      ui.active = false;
    };
  }, [session]);
  const clear = useCallback((message = "") => {
    active.current?.dispose();
    active.current = null;
    setSession(null);
    setFeedback(message);
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected)
        trigger.current.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    const route = () => {
      setRouteRevision((value) => value + 1);
      clear();
    };
    window.addEventListener("popstate", route);
    window.addEventListener("zhipai-route", route);
    return () => {
      window.removeEventListener("popstate", route);
      window.removeEventListener("zhipai-route", route);
      active.current?.dispose();
    };
  }, [clear]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1000px)");
    const resize = () => {
      if (!media.matches) {
        clear();
        setGlobalOpen(false);
      }
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [clear]);
  useEffect(() => {
    if (!globalOpen) return;
    const outside = (event) => {
      if (
        !globalMenu.current?.contains(event.target) &&
        !globalButton.current?.contains(event.target)
      )
        setGlobalOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setGlobalOpen(false);
        globalButton.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [globalOpen]);
  useEffect(() => {
    let valid = true;
    setPageError("");
    loadPage(context.guide)
      .then((doc) => {
        if (valid) setPageDoc({ ...doc, id: context.guide });
      })
      .catch(() => {
        if (valid) setPageError("暂时无法读取本页完整说明，请重试。");
      });
    return () => {
      valid = false;
    };
  }, [context.guide, pageRetry]);
  useEffect(() => {
    setSource(null);
    setSourceError("");
  }, [context.guide, context.panel]);
  useEffect(() => {
    if (!source) return;
    let valid = true;
    setSourceText("");
    setSourceError("");
    loadSource(source)
      .then((text) => {
        if (valid) setSourceText(text);
      })
      .catch(() => {
        if (valid) setSourceError("暂时无法读取这份文档，请重试。");
      });
    return () => {
      valid = false;
    };
  }, [source, sourceRetry]);
  useLayoutEffect(() => {
    const pane = scroll.current,
      memory = reading.current;
    if (!pane) return;
    if (source) {
      if (sourceText) {
        pane.scrollTop = 0;
        if (anchor.current)
          scrollToDocumentSection(pane, "workbench-doc-" + anchor.current);
      }
      return;
    }
    if (!currentDoc) return;
    restorePageReading(pane, memory, context);
  }, [
    currentDoc,
    context.guide,
    context.panel,
    context.section,
    source,
    sourceText,
  ]);
  const openDocument = useCallback(
    (key, target = "") => {
      if (!reading.current.source)
        reading.current.sourceOrigin = scroll.current?.scrollTop || 0;
      reading.current.source = key;
      anchor.current = target;
      if (key === source) {
        if (target)
          scrollToDocumentSection(
            scroll.current,
            "workbench-doc-" + target,
            true,
          );
        else if (scroll.current) scroll.current.scrollTop = 0;
      } else setSource(key);
    },
    [source],
  );
  function choose(id, event) {
    if (base.busy) {
      setFeedback("请先完成或退出手机中正在进行的操作，再使用演示。");
      return;
    }
    active.current?.dispose();
    trigger.current = event.currentTarget;
    const next = createDemoSession(id, clear);
    active.current = next;
    setSession(next);
    setFeedback("");
    setPhoneOnly(false);
  }
  function jump(item) {
    if (
      scrollToDocumentSection(scroll.current, item.id, true) &&
      !context.panel
    )
      reading.current.positions.set(context.guide, scroll.current.scrollTop);
  }
  return (
    <WorkspaceContext.Provider value={{ session }}>
      <div
        className={"prototype-workbench" + (phoneOnly ? " is-phone-only" : "")}
      >
        <header className="workbench-header">
          <div>
            <strong>知拍</strong>
            <span>页面说明与交互原型</span>
          </div>
          <div className="workbench-header-actions">
            {session && (
              <button
                type="button"
                onClick={() => clear("已恢复原页面，演示数据已释放。")}
              >
                恢复默认
              </button>
            )}
            <div className="workbench-global">
              <button
                ref={globalButton}
                type="button"
                aria-expanded={globalOpen}
                aria-controls="workbench-global-scenes"
                onClick={() => setGlobalOpen((value) => !value)}
              >
                全局演示
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
              {globalOpen && (
                <section
                  ref={globalMenu}
                  id="workbench-global-scenes"
                  className="workbench-global-menu"
                  aria-label="全局演示"
                >
                  {GLOBAL_SCENARIOS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      disabled={base.busy && !session}
                      aria-pressed={session?.id === id}
                      onClick={(event) => choose(id, event)}
                    >
                      {DEMO_SCENARIOS[id]}
                    </button>
                  ))}
                  <p>全局机制，独立于当前页面。</p>
                  {session?.kind === "update" && (
                    <div className="workbench-update-results">
                      <span>升级结果</span>
                      {[
                        ["error", "入口打开失败"],
                        ["old", "返回仍为旧版"],
                        ["success", "模拟更新完成"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={session.state.outcome === value}
                          onClick={() => session.apply(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {base.busy && <p>请先完成当前业务，再切入演示。</p>}
                </section>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (session) clear();
                setGlobalOpen(false);
                setPhoneOnly((value) => !value);
              }}
            >
              {phoneOnly ? "显示页面说明" : "仅看原型"}
            </button>
          </div>
        </header>
        <aside
          className="workbench-doc-pane"
          aria-label="当前页面的完整产品说明"
        >
          <header className="workbench-page-heading">
            <h1>
              {context.title}
              {context.state && <span> · {context.state}</span>}
            </h1>
            <div>
              <span title={context.address}>当前地址：{context.address}</span>
              <span>{context.isDemo ? "隔离演示" : "当前页面完整说明"}</span>
            </div>
          </header>
          {scenes.length > 0 && (
            <details className="workbench-scenes" open>
              <summary>
                <strong>本页演示</strong>
                <span>内存样例 · 不写业务记录</span>
              </summary>
              <div className="workbench-scene-buttons">
                {scenes.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={session?.id === id}
                    disabled={base.busy && !session}
                    onClick={(event) => choose(id, event)}
                  >
                    {DEMO_SCENARIOS[id]}
                  </button>
                ))}
              </div>
            </details>
          )}
          {feedback && (
            <p className="workbench-feedback" role="status">
              {feedback}
            </p>
          )}
          {!source && currentDoc && (
            <nav className="workbench-contents" aria-label="本页目录">
              {currentDoc.contents.map((item) => (
                <button key={item.id} type="button" onClick={() => jump(item)}>
                  {item.label}
                </button>
              ))}
            </nav>
          )}
          <div
            ref={scroll}
            className="workbench-document-scroll"
            tabIndex={0}
            aria-label="完整产品文档正文"
            onScroll={() => {
              if (!source && !context.panel && currentDoc)
                reading.current.positions.set(
                  context.guide,
                  scroll.current.scrollTop,
                );
            }}
          >
            {source ? (
              <>
                <div className="workbench-source-heading">
                  <strong>{source}</strong>
                  <button type="button" onClick={() => setSource(null)}>
                    返回本页说明
                  </button>
                </div>
                {sourceError ? (
                  <p role="alert">
                    {sourceError}
                    <button
                      type="button"
                      onClick={() => setSourceRetry((value) => value + 1)}
                    >
                      重试读取
                    </button>
                  </p>
                ) : sourceText ? (
                  <GuideMarkdown
                    text={sourceText}
                    source={source}
                    onDocument={openDocument}
                  />
                ) : (
                  <p role="status">正在读取文档…</p>
                )}
              </>
            ) : pageError ? (
              <p role="alert">
                {pageError}
                <button
                  type="button"
                  onClick={() => setPageRetry((value) => value + 1)}
                >
                  重试读取
                </button>
              </p>
            ) : currentDoc ? (
              <>
                {context.panel && (
                  <p className="workbench-current-state">
                    当前正在查看：{context.state || "当前弹窗"}
                    。对应规则见本页章节，关闭后恢复原阅读位置。
                  </p>
                )}
                <GuideMarkdown
                  text={currentDoc.body}
                  source={"docs/product/pages/" + context.guide + ".md"}
                  onDocument={openDocument}
                />
              </>
            ) : (
              <p role="status">正在读取本页完整说明…</p>
            )}
          </div>
          <footer className="workbench-doc-sources">
            <div>
              <span>依据</span>
              {context.source && (
                <button
                  type="button"
                  onClick={() => openDocument(sourceKey(context.source))}
                >
                  模块产品文档
                </button>
              )}
              <button type="button" onClick={() => openDocument("PRODUCT.md")}>
                PRODUCT.md
              </button>
              <button type="button" onClick={() => openDocument("DESIGN.md")}>
                DESIGN.md
              </button>
            </div>
            <p>文档随Git维护；已确认规则、实际实现及待整改分别标明。</p>
          </footer>
        </aside>
        <section className="workbench-phone-pane" aria-label="可操作的手机原型">
          <header>
            <strong>手机原型</strong>
            <span>
              {session
                ? "当前演示：" + DEMO_SCENARIOS[session.id]
                : "当前页面：" + context.title}
            </span>
          </header>
          <div className="workbench-phone-stage">{children}</div>
          <p className="workbench-phone-caption">
            操作手机，阅读对应页面的完整说明
          </p>
        </section>
      </div>
    </WorkspaceContext.Provider>
  );
}
