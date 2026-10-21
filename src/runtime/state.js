// Domain state is observed by React through useSyncExternalStore.
// Only plain records/arrays are observed; browser objects and files keep native identity.
const factories = new Map();
const stores = Object.create(null);
const listeners = new Set();
const watchers = new Set();
const proxies = new WeakMap();
const originals = new WeakMap();
let revision = 0,
  scheduled = false;
let globals = Object.create(null);
let storesStarted = false;
export function registerController(name, factory) {
  factories.set(name, factory);
}
export function registerStore(name, state) {
  stores[name] = observable(state);
}
export function getStore(name) {
  return stores[name];
}
export function setDomainGlobals(values) {
  globals = values;
}
export function getSnapshot() {
  return revision;
}
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function raw(value) {
  return originals.get(value) || value;
}
function markChanged() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    revision++;
    for (const watcher of [...watchers]) {
      const next = watcher.read();
      if (!Object.is(next, watcher.last)) {
        const old = watcher.last;
        watcher.last = next;
        watcher.callback(next, old);
      }
    }
    for (const listener of [...listeners]) listener();
  });
}
export function observable(value, parent = null, special = null) {
  if (!value || typeof value !== "object" || originals.has(value)) return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null)
    return value;
  if (proxies.has(value)) return proxies.get(value);
  const methods = new Map();
  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      if (special && Object.hasOwn(special, key)) return special[key];
      if (!Reflect.has(target, key))
        return parent && key in parent ? parent[key] : globals[key];
      const found = Reflect.get(target, key, receiver);
      // Proxy invariants require locked data properties to retain exact identity.
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      if (descriptor?.configurable === false && descriptor.writable === false)
        return found;
      if (typeof found === "function") {
        if (key === "constructor") return found;
        if (!methods.has(found)) methods.set(found, found.bind(proxy));
        return methods.get(found);
      }
      return observable(found);
    },
    set(target, key, value) {
      if (special && Object.hasOwn(special, key)) {
        special[key] = value;
        return true;
      }
      if (!Reflect.has(target, key) && parent && key in parent) {
        parent[key] = value;
        return true;
      }
      const next = raw(value),
        previous = Reflect.get(target, key);
      const result = Reflect.set(target, key, next);
      if (!Object.is(next, previous)) markChanged();
      return result;
    },
    deleteProperty(target, key) {
      const had = Reflect.has(target, key),
        result = Reflect.deleteProperty(target, key);
      if (had) markChanged();
      return result;
    },
    has(target, key) {
      return (
        (special && Object.hasOwn(special, key)) ||
        Reflect.has(target, key) ||
        (parent && key in parent) ||
        Object.hasOwn(globals, key)
      );
    },
  });
  proxies.set(value, proxy);
  originals.set(proxy, value);
  return proxy;
}
export function nextTick(callback) {
  return new Promise((resolve, reject) => {
    const run = () => {
      try {
        resolve(callback?.());
      } catch (error) {
        reject(error);
      }
    };
    // React subscriptions commit before the following frame.
    queueMicrotask(() =>
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(run)
        : setTimeout(run, 0),
    );
  });
}
export function createController(name, args = [], parent = null) {
  const factory = factories.get(name);
  if (!factory) throw new Error("Unknown controller: " + name);
  const ownRefs = Object.create(null),
    disposers = [];
  const special = {
    $el: null,
    $refs: new Proxy(ownRefs, {
      get: (target, key) => target[key] || parent?.$refs?.[key],
    }),
    $store: stores,
    $nextTick: nextTick,
    $watch(path, callback) {
      const read = () =>
        path.split(".").reduce((value, key) => value?.[key], controller);
      const watcher = { read, callback, last: read() };
      watchers.add(watcher);
      const remove = () => watchers.delete(watcher);
      disposers.push(remove);
      return remove;
    },
  };
  const state = factory(...args);
  const controller = observable(state, parent, special);
  return {
    scope: controller,
    refs: ownRefs,
    start() {
      if (Object.hasOwn(state, "init")) controller.init?.();
    },
    stop() {
      if (Object.hasOwn(state, "destroy")) controller.destroy?.();
      disposers.forEach((remove) => remove());
    },
    setElement(el) {
      special.$el = el;
    },
  };
}
export function withLocals(parent, values) {
  return new Proxy(values, {
    get: (target, key) =>
      Object.hasOwn(target, key) ? target[key] : parent[key],
    set: (target, key, value) =>
      Object.hasOwn(target, key)
        ? Reflect.set(target, key, value)
        : ((parent[key] = value), true),
    has: (target, key) => Object.hasOwn(target, key) || key in parent,
  });
}
export function initializeStores() {
  if (storesStarted) return;
  storesStarted = true;
  for (const store of Object.values(stores)) store.init?.();
}
export function controllerNames() {
  return [...factories.keys()];
}
export function storeNames() {
  return Object.keys(stores);
}
// IndexedDB structured-clones plain snapshots, never reactive proxies.
export function storageValue(value, seen = new WeakMap()) {
  value = raw(value);
  if (!value || typeof value !== "object") return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null)
    return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const [key, entry] of Object.entries(value))
    copy[key] = storageValue(entry, seen);
  return copy;
}
