import React, { useState } from "react";
import { getStore } from "../runtime/state.js";
import {
  pendingPurchasedResults,
  savePurchasedElectronic,
} from "../domain/pending-results.js";
import { orderNavigate } from "../domain/order-routing.js";
import "../styles/pending-photo-results.css";

export default function PendingPhotoResults({ type = null, onResume }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const items = pendingPurchasedResults(
    getStore("account")?.session?.phone,
    type,
  );
  if (!items.length) return null;
  const resume = async (item) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (item.type === "electronic") await savePurchasedElectronic(item.id);
      else if (onResume) {
        const record = getStore("toolOrders").items.find(
          (r) => r.id === item.id,
        );
        await onResume(record);
      } else
        orderNavigate(
          "/?" +
            new URLSearchParams({
              page: "tool",
              tool: item.type,
              view: "work",
              resume: item.id,
            }),
        );
    } catch (e) {
      setError(e.message || "暂时无法继续，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pending-photo-results" aria-label="待完成的照片">
      <h2>待完成的照片</h2>
      <p>已购买的服务可继续完成，无需再次付款。</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.ready ? "待保存" : "待处理"}</span>
            </div>
            <button disabled={busy} onClick={() => resume(item)}>
              {item.type === "electronic" ? "保存照片" : "继续完成"}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="pending-photo-error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">正在恢复…</p>}
    </section>
  );
}
