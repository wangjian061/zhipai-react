import {
  collectionStatusKey,
  collectionStatusInfo,
} from "./collection-status.js";

const results = new Set([
  "processing_failed",
  "rejected",
  "complete",
  "uploaded",
  "upload_failed",
]);
export function shouldPushCollectionResult(status, requiresUpload) {
  return results.has(status) && !(status === "complete" && requiresUpload);
}
// Local prototype adapter. Production supplies stable event IDs and authorized recipients.
export function createMessageHistory(storage = globalThis.localStorage) {
  return {
    owner: "",
    items: [],
    observed: {},
    ready: false,
    error: "",
    storageKey: "",
    reminders: [],
    writeFailed: false,
    sync(owner, records, projects, announcements = []) {
      const changedOwner = owner !== this.owner || !this.ready;
      if (changedOwner) {
        this.owner = owner;
        this.items = [];
        this.observed = {};
        this.reminders = [];
        this.error = "";
        this.writeFailed = false;
        this.storageKey =
          "zhipai-notifications-v1:" + encodeURIComponent(owner);
        if (owner) {
          try {
            const saved = JSON.parse(
              storage?.getItem(this.storageKey) || "null",
            );
            if (saved) {
              if (
                !Array.isArray(saved.items) ||
                !saved.observed ||
                typeof saved.observed !== "object"
              )
                throw Error("invalid history");
              this.items = saved.items;
              this.observed = saved.observed;
            }
          } catch (_) {
            this.error = "暂时无法读取通知，已有消息不会因此被删除。";
          }
        }
        this.ready = true;
      }
      if (!owner || (this.error && !this.writeFailed)) return;
      for (const notice of announcements) {
        if (!notice.body?.trim()) continue;
        if (notice.recipients && !notice.recipients.includes(owner)) continue;
        const id = notice.type + ":" + notice.id;
        if (!this.items.some((item) => item.id === id))
          this.items.push({ ...notice, id, read: false });
      }
      for (const record of records) {
        const status = collectionStatusKey(record.status);
        const signature = [
          status,
          record.submittedAt || "",
          record.photoSession || record.sessionId || "",
        ].join(":");
        const previous = this.observed[record.id];
        if (previous === signature) continue;
        this.observed[record.id] = signature;
        this.reminders = this.reminders.filter(
          (item) => item.recordId !== record.id,
        );
        if (!results.has(status)) continue;
        const project = projects.find((p) => p.id === record.projectId);
        if (!project) continue;
        const timestamp = record.updatedAt || record.createdAt || Date.now();
        const id =
          "collection:" + record.id + ":" + signature + ":" + timestamp;
        if (this.items.some((item) => item.id === id)) continue;
        // Cancel only queued reminders; never rewrite earlier messages.
        this.reminders = this.reminders.filter(
          (item) => item.recordId !== record.id,
        );
        const notice = {
          id,
          type: "collection",
          recordId: record.id,
          projectId: project.id,
          projectName: project.name,
          title: collectionStatusInfo(status).label,
          text: "采集结果已更新，点击查看任务最新进度。",
          status,
          timestamp,
          read: false,
          important: shouldPushCollectionResult(
            status,
            !!project.requiresUpload,
          ),
        };
        this.items.push(notice);
        if (!changedOwner && previous && notice.important)
          this.reminders.push(notice);
      }
      this.persist();
    },
    persist() {
      try {
        storage?.setItem(
          this.storageKey,
          JSON.stringify({ items: this.items, observed: this.observed }),
        );
        this.writeFailed = false;
        this.error = "";
        return true;
      } catch (_) {
        this.writeFailed = true;
        this.error = "通知保存失败，请重新读取后重试。";
        return false;
      }
    },
    markRead(id) {
      const notice = this.items.find((item) => item.id === id);
      if (!notice || notice.read || this.error) return;
      notice.read = true;
      if (!this.persist()) notice.read = false;
    },
    retry() {
      this.error = "";
      if (this.writeFailed) this.persist();
      else this.ready = false;
    },
  };
}
