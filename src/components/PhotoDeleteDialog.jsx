import React from "react";
import ConfirmationDialog from "./ConfirmationDialog.jsx";

export default function PhotoDeleteDialog({
  title = "删除这张照片？", description = "删除后将从知拍相册移除。",
  confirmLabel = "删除照片", onDelete, returnFocusSelector = "[data-photo-delete]", ...props
}) {
  return (
    <ConfirmationDialog {...props}
      title={title} description={description} confirmLabel={confirmLabel}
      onConfirm={onDelete} returnFocusSelector={returnFocusSelector} busyLabel="正在删除…" danger />
  );
}
