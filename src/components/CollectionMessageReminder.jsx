import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  getControllerScopes,
  getSnapshot,
  getStore,
  subscribe,
} from "../runtime/state.js";
import { resolveWorkbenchContext } from "../workbench/context.js";
export default function CollectionMessageReminder() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const store = getStore("collectionMessages");
  const scopes = getControllerScopes();
  const s = scopes.collectionFlow;
  const context = resolveWorkbenchContext(location.search, scopes);
  const [visible, setVisible] = useState(null);
  const paused =
    context.busy ||
    !!context.panel ||
    ["camera", "scan", "account"].includes(context.page) ||
    getStore("prototypeWorkspace")?.active;
  const queued = store?.reminders?.length;
  useEffect(() => {
    if (!queued) return;
    const messages = store.reminders.splice(0);
    const n = messages.at(-1);
    if (
      paused ||
      document.hidden ||
      (context.page === "collection" &&
        s?.current?.id === n.recordId &&
        s.isRecordView)
    )
      return;
    setVisible({ ...n, owner: store.owner });
  }, [queued, store, paused, context.page, s]);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(timer);
  }, [visible]);
  if (!visible || paused || store.owner !== visible.owner) return null;
  return (
    <div className="collection-live-reminder" role="status">
      <button
        type="button"
        onClick={() => {
          s?.openNotification(visible);
          setVisible(null);
        }}
      >
        <strong>{visible.title}</strong>
        <small>点击查看采集任务最新进度</small>
      </button>
      <button
        type="button"
        aria-label="关闭提醒"
        onClick={() => setVisible(null)}
      >
        <svg aria-hidden="true">
          <use href="#i-close" />
        </svg>
      </button>
    </div>
  );
}
