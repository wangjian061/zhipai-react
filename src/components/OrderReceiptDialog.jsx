import React, { useEffect } from "react";
import ConfirmationDialog from "./ConfirmationDialog.jsx";

export default function OrderReceiptDialog({ s }) {
  const opened = s.sheet === "receipt" && s.page === "orders";
  const order = s.current;
  useEffect(() => {
    if (
      s.sheet &&
      !s.paymentBusy &&
      (!order || !s.owner || s.page !== "orders" || !s.canConfirmReceipt)
    )
      s.closePayment();
  }, [
    order?.key,
    s.owner,
    s.page,
    s.paymentBusy,
    s.sheet,
    s.canConfirmReceipt,
  ]);
  if (!opened || !order || !s.owner) return null;
  return (
    <ConfirmationDialog
      target="#orders-modal-layer"
      title={order.type === "print" ? "确认已收到照片？" : "确认已收到商品？"}
      description="确认后，本订单将标记为已签收。"
      dismissLabel="暂不确认"
      confirmLabel="确认收货"
      busyLabel="正在确认…"
      busy={s.paymentBusy}
      unavailable={!s.online}
      error={s.online ? s.paymentError : "网络不可用，请恢复连接后重试。"}
      onClose={() => s.closePayment()}
      onConfirm={() => s.confirmReceipt()}
    />
  );
}
