import { getStore } from "../runtime/state.js";
import { accountRoute } from "./account.js";
export function safeOrderPath(value, fallback = "/?page=my") {
  try {
    const u = new URL(value, location.origin);
    return u.origin === location.origin && u.pathname === "/"
      ? u.pathname + u.search
      : fallback;
  } catch {
    return fallback;
  }
}
export function orderNavigate(path, replace = false) {
  history[replace ? "replaceState" : "pushState"]({}, "", safeOrderPath(path));
  window.dispatchEvent(new Event("zhipai-route"));
}
export function openOrderCenter(
  type = "all",
  back = location.pathname + location.search,
) {
  const q = new URLSearchParams({
    page: "orders",
    type,
    back: safeOrderPath(back),
  });
  orderNavigate("/?" + q);
}
export function requireOrderAccount() {
  const owner = getStore("account")?.session?.phone;
  if (!owner) accountRoute("welcome", location.pathname + location.search);
  return owner || null;
}
export function returnToOrderCenter() {
  const path = new URLSearchParams(location.search).get("orderBack");
  if (!path) return false;
  const safe = safeOrderPath(path, "");
  if (
    !safe ||
    new URL(safe, location.origin).searchParams.get("page") !== "orders"
  )
    return false;
  orderNavigate(safe);
  return true;
}

// Canonical detail route. Older print links retain the originating hub filters.
export function printOrderPath(id, fallback = "/?page=my") {
  const current = new URL(location.href);
  const oldBack = safeOrderPath(current.searchParams.get("orderBack"), "");
  const source =
    current.searchParams.get("page") === "orders"
      ? current
      : oldBack
        ? new URL(oldBack, location.origin)
        : null;
  let back = safeOrderPath(fallback);
  const backQuery = new URL(back, location.origin).searchParams;
  if (
    backQuery.get("page") === "orders" ||
    (backQuery.get("page") === "print" &&
      ["order", "result", "orders"].includes(backQuery.get("print")))
  )
    back = "/?page=my";
  const q =
    source?.searchParams.get("page") === "orders"
      ? new URLSearchParams(source.search)
      : new URLSearchParams({
          page: "orders",
          type: "print",
          status: "all",
          back,
        });
  q.set("id", "print:" + id);
  return "/?" + q;
}
