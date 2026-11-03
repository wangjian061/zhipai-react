// Restrict document movement to the left pane; never move the phone or URL.
export function scrollToDocumentSection(container, id, focus = false) {
  if (!container || !id) return false;
  const target = [...container.querySelectorAll("[id]")].find(
    (node) => node.id === id,
  );
  if (!target) return false;
  container.scrollTop +=
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top -
    16;
  if (focus) {
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }
  return true;
}
import { headingSlug } from "./documentation.js";

export function restorePageReading(pane, memory, context) {
  const changedPage = memory.guide !== context.guide;
  if (changedPage) {
    pane.scrollTop = memory.positions.get(context.guide) || 0;
    memory.panelOrigin = context.panel ? pane.scrollTop : null;
  } else if (memory.source) pane.scrollTop = memory.sourceOrigin;
  if (context.panel && (changedPage || memory.panel !== context.panel)) {
    if (!memory.panel) memory.panelOrigin = pane.scrollTop;
    scrollToDocumentSection(
      pane,
      "workbench-doc-" + headingSlug(context.section),
    );
  } else if (!context.panel && memory.panel && !changedPage) {
    pane.scrollTop =
      memory.panelOrigin ?? memory.positions.get(context.guide) ?? 0;
    memory.panelOrigin = null;
  }
  memory.guide = context.guide;
  memory.panel = context.panel;
  memory.source = null;
}
