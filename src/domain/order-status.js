// Transaction facts are independent of photo processing and print fulfillment.
export const TRANSACTION_STATES = [
  { id: "all", label: "全部" },
  { id: "paid", label: "支付成功" },
  { id: "failed", label: "支付失败" },
  { id: "refunding", label: "退款中" },
  { id: "refunded", label: "已退款" },
];
export const PRINT_FULFILLMENT_STEPS = [
  { id: "producing", label: "制作中", description: "照片正在安排或进行制作。" },
  { id: "shipped", label: "邮寄中", description: "已发货，正在运输途中。" },
  { id: "delivered", label: "待签收", description: "已送达，等待你确认收货。" },
  { id: "received", label: "已签收", description: "本单照片已签收。" },
];
export function paymentResult(status, outcome, at = Date.now()) {
  return {
    status:
      status === "paid"
        ? "paid"
        : status === "verifying"
          ? "verifying"
          : ["failure", "failed"].includes(outcome)
            ? "failed"
            : outcome === "cancel"
              ? "cancelled"
              : "unpaid",
    at,
  };
}
export function transactionState(record, type) {
  const status = record?.status;
  const paid =
    status === "paid" ||
    (type === "print" &&
      ["producing", "printing", "shipped", "delivered", "completed"].includes(
        status,
      ));
  if (paid) {
    if (["refunding", "refunded"].includes(record.refund?.status))
      return record.refund.status;
    return "paid";
  }
  // A pending/closed/unknown record is never inferred to be a failed payment.
  // Only the latest definite gateway failure (or explicit legacy print attempt) qualifies.
  if (
    status === "pending" &&
    (record.paymentResult?.status === "failed" ||
      (type === "print" &&
        !record.paymentResult &&
        ["failure", "failed"].includes(record.attempt)))
  )
    return "failed";
  return null;
}
export function printFulfillment(record) {
  const status =
    record?.fulfillment?.status ||
    {
      paid: "producing",
      producing: "producing",
      printing: "producing",
      shipped: "shipped",
      delivered: "delivered",
      completed: "received",
    }[record?.status];
  return PRINT_FULFILLMENT_STEPS.find((step) => step.id === status) || null;
}
