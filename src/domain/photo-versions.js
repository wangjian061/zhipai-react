// Personal production variants. Amounts are integer fen; neither is preselected.
export const PHOTO_VERSIONS = Object.freeze([
  Object.freeze({
    id: "ordinary",
    name: "普通证件照",
    shortName: "普通版",
    amount: 198,
  }),
  Object.freeze({
    id: "retouched",
    name: "精修证件照",
    shortName: "精修版",
    amount: 980,
  }),
]);

export function photoVersion(id) {
  return PHOTO_VERSIONS.find((version) => version.id === id) || null;
}

export function versionPrice(id) {
  const version = photoVersion(id);
  return version ? (version.amount / 100).toFixed(2) : "";
}

export function versionIsProtected(draft) {
  return (
    !!draft?.savedId || ["paid", "verifying"].includes(draft?.order?.status)
  );
}

export function failedVersion(reason) {
  return {
    status: "failed",
    blob: null,
    reason: reason || "本版本暂未完成，请重试。",
  };
}

export async function makePhotoVersions(
  blob,
  settings,
  render,
  outcome = "success",
) {
  const entries = await Promise.all(
    PHOTO_VERSIONS.map(async (version) => {
      if (
        (outcome === "ordinary_only" && version.id === "retouched") ||
        (outcome === "retouched_only" && version.id === "ordinary")
      ) {
        return [
          version.id,
          failedVersion("本版本未能完成制作，可重试或选择已完成的版本。"),
        ];
      }
      try {
        const output = await render(blob, { ...settings, finish: version.id });
        if (!output?.size) throw Error("empty output");
        return [
          version.id,
          {
            status: "ready",
            blob: output,
            reason: "",
            width: settings.outputWidth,
            height: settings.outputHeight,
          },
        ];
      } catch (_) {
        return [version.id, failedVersion("本版本制作暂未完成，请重试。")];
      }
    }),
  );
  return Object.fromEntries(entries);
}
