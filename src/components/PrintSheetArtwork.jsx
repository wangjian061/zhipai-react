import React from "react";

export default function PrintSheetArtwork({ studio, layout, image, alt = "" }) {
  return image ? (
    <img className="print-product-photo" src={image} alt={alt} />
  ) : (
    <span
      className="print-sheet-svg"
      dangerouslySetInnerHTML={{ __html: studio.workspaceSheet(layout) }}
    />
  );
}
