// Mark only known in-app transitions. history.length alone may include external pages.
function localPath(value) {
  try {
    const u = new URL(value, location.origin);
    if (u.origin !== location.origin || u.pathname !== "/") return "";
    return u.pathname + u.search;
  } catch {
    return "";
  }
}
function category(path, view = "projects") {
  const q = new URL(path, location.origin).searchParams;
  return q.get("page") === "collection" &&
    q.get("view") === view &&
    ["graduate", "enrollment", "association"].includes(q.get("category"))
    ? q.get("category")
    : "";
}
export function collectionHistoryState(
  target,
  source = location.href,
  previous = history.state,
  replace = false,
) {
  const to = localPath(target),
    from = localPath(source);
  if (!to || !from || to === from) return replace ? previous || {} : {};
  const q = new URL(to, location.origin).searchParams;
  const sourceQuery = new URL(from, location.origin).searchParams;
  if (
    q.get("page") === "collection" &&
    q.get("view") === "projects" &&
    (q.get("search") === "1" || q.get("category") === "all")
  ) {
    const source = replace ? previous?.collectionSearchBack?.source : from;
    return source ? { collectionSearchBack: { source, target: to } } : {};
  }
  if (category(to, "records")) {
    if (!replace && category(from) === category(to, "records"))
      return { collectionRecordsBack: { source: from, target: to } };
    const retained =
      replace &&
      category(from, "records") === category(to, "records") &&
      previous?.collectionRecordsBack;
    return retained
      ? { collectionRecordsBack: { source: retained.source, target: to } }
      : {};
  }
  if (
    q.get("page") === "collection" &&
    ["detail", "complete"].includes(q.get("view")) &&
    ((q.get("from") === "project" &&
      sourceQuery.get("page") === "collection" &&
      sourceQuery.get("view") === "project" &&
      sourceQuery.get("project") === q.get("project")) ||
      (q.get("from") === "records" &&
        category(from, "records") &&
        category(from, "records") === q.get("category")))
  )
    return { collectionTaskBack: { source: from, target: to } };
  if (category(to)) {
    if (replace) {
      const retained =
        category(to) === category(from) && previous?.collectionCategoryBack;
      return retained
        ? { collectionCategoryBack: { source: retained.source, target: to } }
        : {};
    }
    return { collectionCategoryBack: { source: from, target: to } };
  }

  if (
    q.get("page") === "collection" &&
    q.get("view") === "project" &&
    (category(from) ||
      (sourceQuery.get("page") === "collection" &&
        sourceQuery.get("view") === "projects"))
  )
    return replace
      ? {}
      : { collectionProjectBack: { source: from, target: to } };
  return {};
}
export function returnCollectionHistory(kind) {
  const key = {
    project: "collectionProjectBack",
    task: "collectionTaskBack",
    search: "collectionSearchBack",
    category: "collectionCategoryBack",
    records: "collectionRecordsBack",
  }[kind];
  const mark = history.state?.[key],
    current = localPath(location.href),
    source = localPath(mark?.source);
  if (
    !mark ||
    mark.target !== current ||
    !source ||
    source === current ||
    !(history.length > 1) ||
    typeof history.back !== "function"
  )
    return false;
  if (
    kind === "project" &&
    new URL(source, location.origin).searchParams.get("view") !== "projects"
  )
    return false;
  const sourceQuery = new URL(source, location.origin).searchParams;
  const currentQuery = new URL(current, location.origin).searchParams;
  if (
    sourceQuery.get("page") === "collection" &&
    ([null, "home"].includes(sourceQuery.get("view")) ||
      (sourceQuery.get("view") === "records" && !category(source, "records")))
  )
    return false;
  if (kind === "records" && category(source) !== category(current, "records"))
    return false;
  if (kind === "task") {
    const fromProject =
      currentQuery.get("from") === "project" &&
      sourceQuery.get("page") === "collection" &&
      sourceQuery.get("view") === "project" &&
      sourceQuery.get("project") === currentQuery.get("project");
    const fromRecords =
      currentQuery.get("from") === "records" &&
      category(source, "records") &&
      category(source, "records") === currentQuery.get("category");
    if (!fromProject && !fromRecords) return false;
  }
  history.back();
  return true;
}
