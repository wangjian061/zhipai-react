import React from "react";
import { resolveDocumentLink, markdownHeadings } from "./documentation.js";

function inline(value, source, onDocument) {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|!?\[[^\]]+\]\([^\s)]+\))/g;
  const nodes = [];
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > start) nodes.push(value.slice(start, match.index));
    const token = match[0],
      key = String(match.index);
    if (token.startsWith("**"))
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`"))
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else {
      const link = token.match(/^!?\[([^\]]+)\]\(([^)]+)\)$/),
        target = resolveDocumentLink(link[2], source);
      if (!target) nodes.push(link[1]);
      else if (target.document)
        nodes.push(
          <button
            className="workbench-inline-link"
            key={key}
            onClick={() => onDocument(target.document, target.anchor)}
          >
            {link[1]}
          </button>,
        );
      else if (target.anchor)
        nodes.push(
          <button
            className="workbench-inline-link"
            key={key}
            onClick={() =>
              globalThis.document
                ?.getElementById("workbench-doc-" + target.anchor)
                ?.scrollIntoView({ block: "start" })
            }
          >
            {link[1]}
          </button>,
        );
      else
        nodes.push(
          <a key={key} href={target.external} target="_blank" rel="noreferrer">
            {token.startsWith("!") ? "查看图片：" : ""}
            {link[1]}
          </a>,
        );
    }
    start = match.index + token.length;
  }
  if (start < value.length) nodes.push(value.slice(start));
  return nodes;
}
function GuideMarkdown({
  text = "",
  source = "docs/product/prototype-page-guide.md",
  onDocument = () => {},
}) {
  const lines = text.split(/\r?\n/),
    blocks = [];
  let i = 0;
  // React text nodes are intentional: never execute or inject HTML from repository documents.
  const content = (s) => inline(s, source, onDocument);
  const headings = markdownHeadings(text);
  let headingIndex = 0;
  if (lines[0] === "---") {
    i = lines.indexOf("---", 1);
    i = i < 0 ? lines.length : i + 1;
  }
  while (i < lines.length) {
    const line = lines[i],
      key = i;
    if (!line.trim() || /^<!--/.test(line)) {
      i++;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const Tag = "h" + Math.min(h[1].length + 1, 6),
        id = headings[headingIndex++].id;
      blocks.push(
        <Tag key={key} id={id}>
          {content(h[2])}
        </Tag>,
      );
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1] || "")) {
      const cells = (s) =>
        s
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((s) => s.trim());
      const head = cells(line),
        rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i]))
        rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key} className="workbench-table">
          <table>
            <thead>
              <tr>
                {head.map((cell, n) => (
                  <th key={n}>{content(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, n) => (
                <tr key={n}>
                  {row.map((cell, j) => (
                    <td key={j}>{content(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const list = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
    if (list) {
      const ordered = !list[1],
        items = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
        if (!item || !item[1] !== ordered) break;
        items.push(item[2]);
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={key}>
          {items.map((item, n) => (
            <li key={n}>{content(item)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    if (/^>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>/.test(lines[i]))
        quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key}>{content(quote.join(" "))}</blockquote>,
      );
      continue;
    }
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push(<hr key={key} />);
      i++;
      continue;
    }
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*[-*]\s|\s*\d+\.\s|\s*\||>|<!--)/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    blocks.push(<p key={key}>{content(paragraph.join(" "))}</p>);
  }
  return <div className="workbench-markdown">{blocks}</div>;
}
export default React.memo(GuideMarkdown);
