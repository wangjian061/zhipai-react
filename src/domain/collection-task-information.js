const DOCUMENT_METHODS = new Set(["id", "document", "passport"]);
const AUTHENTICATION_LABELS = new Map([
  ["student", "学号"],
  ["employee", "工号"],
  ["qr", "学号"],
]);

// Display existing facts without conflating roster identifiers with document numbers.
export function buildCollectionTaskInformation(record, project) {
  const documentMethod = DOCUMENT_METHODS.has(record.method);
  const authenticationLabel = AUTHENTICATION_LABELS.get(record.method);
  const documentNumber = documentMethod && record.number;
  const documentLabel = documentNumber
    ? record.method === "passport"
      ? "护照号"
      : "证件号"
    : record.lastFour
      ? "证件号后四位"
      : record.method === "passport"
        ? "护照号"
        : "证件号";
  const rows = [
    { key: "customer", label: "客服号", value: record.customer || "未生成" },
    { key: "name", label: "姓名", value: record.name || "未提供" },
    {
      key: "document",
      label: documentLabel,
      value: documentNumber || record.lastFour || "未提供",
    },
  ];
  if (!documentMethod && (authenticationLabel || record.number)) {
    rows.push({
      key: "authentication",
      label: authenticationLabel || "认证编号",
      value: record.number || "未提供",
    });
  }
  rows.push(
    { key: "project", label: "项目名称", value: project?.name || "未提供" },
    {
      key: "organization",
      label: "所属机构",
      value: project?.organization || "未提供",
    },
  );
  return rows;
}
