import { useEffect } from "react";
import { decodePhotoBlob } from "../domain/album.js";

export default function CollectionDevelopmentExamples({ scope: s }) {
  const owner = s.account.session?.phone;
  const ready = s.recordsStore.ready;
  const busy = s.recordsStore.busy;
  const active = s.page === "collection" && s.view === "records";
  useEffect(() => {
    if (!owner || !ready || busy || !active) return;
    const isCurrent = () =>
      s.account.session?.phone === owner &&
      s.page === "collection" &&
      s.view === "records";
    import("../domain/collection-examples.js")
      .then(({ importCollectionExamples }) =>
        importCollectionExamples({
          store: s.recordsStore,
          owner,
          isCurrent,
          loadPhoto: async () => {
            const response = await fetch("assets/print-portrait.png");
            if (!response.ok) throw Error("Example portrait unavailable");
            const blob = await response.blob();
            const image = await decodePhotoBlob(blob);
            return {
              blob,
              width: image.naturalWidth,
              height: image.naturalHeight,
              type: blob.type,
              size: blob.size,
              name: "示例证件照.png",
            };
          },
        }),
      )
      .catch(() => {
        if (isCurrent())
          s.showNotice("示例记录未能导入，请刷新重试", "warning", "manual");
      });
  }, [owner, ready, busy, active, s]);
  return null;
}
