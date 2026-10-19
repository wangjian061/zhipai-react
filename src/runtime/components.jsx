import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  createController,
  getSnapshot,
  subscribe,
  withLocals,
} from "./state.js";
const ControllerContext = createContext(null);
export function Controller({ name, args = [], children }) {
  const parent = useContext(ControllerContext),
    instance = useRef(null);
  if (!instance.current)
    instance.current = createController(name, args, parent?.scope);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useLayoutEffect(() => {
    instance.current.start();
    return () => instance.current.stop();
  }, []);
  return (
    <ControllerContext.Provider value={instance.current}>
      {children(instance.current.scope)}
    </ControllerContext.Provider>
  );
}
export function Repeat({ scope, items, names, children, keyFor }) {
  const pairs =
    typeof items === "number"
      ? Array.from({ length: Math.max(0, items) }, (_, i) => [i, i + 1])
      : Array.isArray(items)
        ? items.map((value, index) => [index, value])
        : Object.entries(items || {});
  return pairs.map(([index, value], position) => {
    const local = withLocals(scope, {
      [names[0]]: value,
      ...(names[1] ? { [names[1]]: index } : {}),
      ...(names[2] ? { [names[2]]: position } : {}),
    });
    return (
      <React.Fragment key={keyFor ? keyFor(local) : index}>
        {children(local)}
      </React.Fragment>
    );
  });
}
export function Portal({ target, children }) {
  const [host, setHost] = useState(null);
  useLayoutEffect(() => {
    setHost(document.querySelector(target));
  }, [target]);
  return host ? createPortal(children, host) : null;
}
function styleRecord(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  return Object.fromEntries(
    value
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf(":");
        const key = part.slice(0, i).trim();
        return [
          key.startsWith("--")
            ? key
            : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
          part.slice(i + 1).trim(),
        ];
      }),
  );
}
function classes(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(classes).filter(Boolean).join(" ");
  return Object.entries(value)
    .filter(([, on]) => on)
    .map(([key]) => key)
    .join(" ");
}
export function View(input) {
  const {
    as: tag = "div",
    scope,
    scopeRoot = false,
    refName,
    show: requestedShow,
    dynamicClass,
    baseStyle,
    dynamicStyle,
    events = [],
    model,
    html,
    text,
    children,
    transition,
    ...props
  } = input;
  const show = Object.hasOwn(input, "show") ? Boolean(requestedShow) : true;
  const context = useContext(ControllerContext),
    el = useRef(null),
    current = useRef(null);
  current.current = { scope, events, model };
  const staticClass = props.className || "";
  props.className =
    [staticClass, classes(dynamicClass)].filter(Boolean).join(" ") || undefined;
  props.style = {
    ...styleRecord(baseStyle),
    ...styleRecord(dynamicStyle),
    ...(!show ? { display: "none" } : {}),
  };
  useLayoutEffect(() => {
    if (scopeRoot) context.setElement(el.current);
    if (refName) context.refs[refName] = el.current;
    const node = el.current;
    if (!node) return;
    const handlers = new Map();
    for (const event of events) {
      if (!handlers.has(event.type)) handlers.set(event.type, []);
      handlers.get(event.type).push(event);
    }
    if (model) {
      const type =
        model.lazy ||
        ["checkbox", "radio", "select"].includes(node.type) ||
        tag === "select"
          ? "change"
          : "input";
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).unshift({ type, model: true });
    }
    const clean = [];
    for (const [type] of handlers) {
      const fn = (event) => {
        // The latest React render owns each expression; listeners stay attached to the DOM node.
        const config = current.current;
        const list = [...config.events.filter((item) => item.type === type)];
        const m = config.model;
        const modelType =
          m?.lazy ||
          ["checkbox", "radio", "select"].includes(node.type) ||
          tag === "select"
            ? "change"
            : "input";
        if (m && type === modelType) {
          let value = node.type === "checkbox" ? node.checked : node.value;
          if (node.type === "radio" && !node.checked) return;
          if (m.number && value !== "") value = Number(value);
          m.write(config.scope, value);
        }
        for (const item of list) {
          if (item.self && event.target !== node) continue;
          if (item.key && event.key !== item.key) continue;
          if (item.prevent) event.preventDefault();
          if (item.stop) event.stopPropagation();
          item.run(config.scope, event, node);
        }
      };
      node.addEventListener(type, fn, {
        passive: events
          .filter((item) => item.type === type)
          .every((item) => item.passive),
      });
      clean.push(() => node.removeEventListener(type, fn));
    }
    return () => {
      clean.forEach((fn) => fn());
      if (refName && context.refs[refName] === node)
        delete context.refs[refName];
    };
  }, []);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || !model) return;
    const value = model.read(scope);
    if (node.type === "checkbox") node.checked = Boolean(value);
    else if (node.type === "radio") node.checked = String(value) === node.value;
    else if (node.type !== "file" && String(node.value) !== String(value ?? ""))
      node.value = value ?? "";
  });
  const lastShow = useRef(show);
  useLayoutEffect(() => {
    const node = el.current,
      previous = lastShow.current;
    lastShow.current = show;
    if (
      !node ||
      !transition ||
      !show ||
      previous === show ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    if (transition.enter) {
      node.classList.add(transition.enter, transition.start);
      const frame = requestAnimationFrame(() => {
        node.classList.remove(transition.start);
        node.classList.add(transition.end);
      });
      const timer = setTimeout(
        () => node.classList.remove(transition.enter, transition.end),
        300,
      );
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        node.classList.remove(
          transition.enter,
          transition.start,
          transition.end,
        );
      };
    }
    const animation = node.animate?.([{ opacity: 0 }, { opacity: 1 }], {
      duration: transition.duration || 150,
      easing: "ease-out",
    });
    return () => animation?.cancel();
  }, [show]);
  if (html !== undefined)
    props.dangerouslySetInnerHTML = { __html: html || "" };
  return React.createElement(
    tag,
    { ...props, ref: el },
    html !== undefined ? undefined : text !== undefined ? text : children,
  );
}
