import React, { useEffect, useState } from "react";

// A purchase identifier, intentionally without a click or preview action.
export default function OrderThumbnail({ blob, title }) {
  const [preview, setPreview] = useState(null);
  const [failedURL, setFailedURL] = useState("");
  useEffect(() => {
    if (!(blob instanceof Blob) || !blob.size) return;
    const url = URL.createObjectURL(blob);
    setPreview({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // Never flash a previous order's photo when the data changes.
  const src = preview?.blob === blob ? preview?.url : "";
  return (
    <span className="order-thumbnail">
      {src && src !== failedURL ? (
        <img
          src={src}
          alt={`${title}的订单照片`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedURL(src)}
        />
      ) : (
        <svg viewBox="0 0 24 24" role="img" aria-label="暂无订单照片">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="9" cy="8" r="1.5" />
          <path d="m4 17 5-5 4 4 3-3 4 4" />
        </svg>
      )}
    </span>
  );
}
