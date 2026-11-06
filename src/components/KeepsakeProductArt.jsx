import React from "react";
import {
  sampleArt,
  stampViewImage,
  STAMP_VIEWS,
} from "../domain/keepsake-templates.js";

// A display-only product sample. The editor and orders always use the selected file.
export default function KeepsakeProductArt({ template, stampView = "inner" }) {
  const postcard = template.kind === "postcard";
  return (
    <span
      className={`keepsake-product-art ${postcard ? "is-postcard" : "is-stamp"}`}
    >
      <img
        src={postcard ? sampleArt(template) : stampViewImage(stampView)}
        alt={
          postcard
            ? `${template.name}明信片款式`
            : `致青春纪念邮折 · ${STAMP_VIEWS.find(([key]) => key === stampView)?.[1] || "内页"}`
        }
      />
    </span>
  );
}
