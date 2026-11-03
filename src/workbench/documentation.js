const moduleLoaders = import.meta.glob(
  "../../docs/product/*.md",
  {
    query: "?raw",
    import: "default",
  },
);
const globalLoaders = {
  "PRODUCT.md": () => import("../../PRODUCT.md?raw").then((m) => m.default),
  "DESIGN.md": () => import("../../DESIGN.md?raw").then((m) => m.default),
};
const pageLoaders = import.meta.glob("../../docs/product/pages/*.md", {
  query: "?raw",
  import: "default",
});
export const PAGE_IDS = Object.keys(pageLoaders).map((path) =>
  path.split("/").at(-1).replace(/\.md$/, ""),
);
const pageCache = new Map();
export function headingSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
export function pageContents(text) {
  return markdownHeadings(text).filter((heading) => heading.level === 2);
}
export function markdownHeadings(text) {
  const counts = new Map(),
    headings = [];
  let fenced = false,
    frontmatter = text.startsWith("---\n");
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (frontmatter) {
      if (index > 0 && line === "---") frontmatter = false;
      continue;
    }
    if (/^```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    const match = !fenced && line.match(/^(#{1,6})\s+(.+)/);
    if (!match) continue;
    const base = headingSlug(match[2]),
      count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    headings.push({
      label: match[2],
      level: match[1].length,
      id: "workbench-doc-" + base + (count > 1 ? "-" + count : ""),
    });
  }
  return headings;
}
export function parsePageDocument(raw) {
  const title = raw.match(/^# (.+)$/m)?.[1] || "页面说明";
  const body = raw.replace(/^# [^\n]+\n*/, "");
  return { title, body, contents: pageContents(body) };
}
export async function loadPage(id) {
  const loader = pageLoaders["../../docs/product/pages/" + id + ".md"];
  if (!loader) throw new Error("本页的完整说明尚未纳入工作区。");
  if (!pageCache.has(id))
    pageCache.set(
      id,
      loader()
        .then(parsePageDocument)
        .catch((error) => {
          pageCache.delete(id);
          throw error;
        }),
    );
  return pageCache.get(id);
}
export function sourceKey(name) {
  return name === "PRODUCT.md" || name === "DESIGN.md"
    ? name
    : "docs/product/" + name;
}
export function loadSource(key) {
  const loader =
    globalLoaders[key] ||
    moduleLoaders["../../" + key] ||
    pageLoaders["../../" + key];
  return loader
    ? loader()
    : Promise.reject(new Error("这份文档尚未纳入工作区。"));
}
export function resolveDocumentLink(href, base) {
  if (!href || /^(javascript|data|vbscript):/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) return { external: href };
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return { external: href };
  if (href.startsWith("#")) return { anchor: href.slice(1) };
  try {
    const url = new URL(href, "https://workbench.local/" + base);
    if (url.protocol !== "https:") return null;
    if (url.origin !== "https://workbench.local") return { external: url.href };
    const key = decodeURIComponent(url.pathname.slice(1));
    if (
      globalLoaders[key] ||
      moduleLoaders["../../" + key] ||
      pageLoaders["../../" + key]
    )
      return { document: key, anchor: url.hash.slice(1) };
    return { external: url.pathname + url.search + url.hash };
  } catch {
    return null;
  }
}
