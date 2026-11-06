// One address-book contract shared by print and physical keepsakes.
export const SHIPPING_ADDRESS_FIELDS = [
  {
    key: "name",
    label: "收件人",
    maxLength: 30,
    autoComplete: "name",
    placeholder: "收件人姓名",
  },
  {
    key: "phone",
    label: "手机号码",
    maxLength: 11,
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel-national",
    placeholder: "11位手机号码",
  },
  {
    key: "region",
    label: "省市区",
    maxLength: 100,
    autoComplete: "address-level1",
    placeholder: "例如：广东省 深圳市 南山区",
  },
  {
    key: "street",
    label: "详细地址",
    maxLength: 200,
    multiline: true,
    autoComplete: "street-address",
    placeholder: "街道、楼栋及门牌号",
  },
  {
    key: "postal",
    label: "邮政编码",
    maxLength: 6,
    inputMode: "numeric",
    autoComplete: "postal-code",
    placeholder: "选填",
    optional: true,
  },
];
export function cleanShippingAddress(fields, id) {
  const clean = { id, default: !!fields.default };
  for (const { key } of SHIPPING_ADDRESS_FIELDS)
    clean[key] = String(fields[key] || "").trim();
  return clean;
}
export function shippingAddressError(clean) {
  if (!clean.name || clean.name.length > 30)
    return "请填写收件人姓名，最多30字。";
  if (!/^1[3-9]\d{9}$/.test(clean.phone)) return "请填写正确的11位手机号码。";
  if (clean.region.length < 4 || clean.street.length < 5)
    return "请补齐省市区与详细地址。";
  if (clean.postal && !/^\d{6}$/.test(clean.postal))
    return "邮政编码应为6位数字，也可以留空。";
  return "";
}
