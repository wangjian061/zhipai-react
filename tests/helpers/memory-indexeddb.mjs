// Minimal asynchronous IndexedDB transaction contract for persistence tests.
export function database() {
  const stores = new Map();
  const db = {
    objectStoreNames: { contains: (n) => stores.has(n) },
    createObjectStore(n) {
      stores.set(n, new Map());
    },
    transaction(names, mode) {
      const tx = {
        pending: 0,
        aborted: false,
        abort() {
          this.aborted = true;
          queueMicrotask(() => this.onabort?.());
        },
      };
      const snapshots = new Map(
        (Array.isArray(names) ? names : [names]).map((n) => [
          n,
          new Map(stores.get(n)),
        ]),
      );
      const request = (fn) => {
        const r = {};
        tx.pending++;
        queueMicrotask(() => {
          try {
            r.result = fn();
            r.onsuccess?.();
          } catch (e) {
            r.error = e;
            tx.error = e;
            r.onerror?.();
            tx.onerror?.();
          }
          tx.pending--;
          if (!tx.pending) {
            if (mode === "readwrite" && !tx.error && !tx.aborted)
              for (const [n, s] of snapshots) stores.set(n, s);
            if (!tx.aborted) tx.oncomplete?.();
          }
        });
        return r;
      };
      tx.objectStore = (n) => ({
        get: (id) => request(() => structuredClone(snapshots.get(n).get(id))),
        getAll: () =>
          request(() => structuredClone([...snapshots.get(n).values()])),
        put: (record) =>
          request(() =>
            snapshots.get(n).set(record.id, structuredClone(record)),
          ),
        delete: (id) => request(() => snapshots.get(n).delete(id)),
      });
      return tx;
    },
  };
  return {
    open() {
      const r = { result: db };
      queueMicrotask(() => {
        r.onupgradeneeded?.();
        r.onsuccess?.();
      });
      return r;
    },
    stores,
  };
}
