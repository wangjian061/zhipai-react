import React from "react";
import { SHIPPING_ADDRESS_FIELDS } from "../domain/shipping-address.js";
export default function ShippingAddressFields({
  fields,
  disabled,
  onChange,
  className = "",
}) {
  return (
    <div className={"print-fields " + className}>
      {SHIPPING_ADDRESS_FIELDS.map(
        ({ key, label, multiline, optional, ...props }) => {
          const Input = multiline ? "textarea" : "input";
          return (
            <label
              key={key}
              className={multiline ? "print-street-field" : undefined}
            >
              <span>{label}</span>
              <Input
                {...props}
                required={!optional}
                disabled={disabled}
                value={fields[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
              />
            </label>
          );
        },
      )}
      <label className="print-default-field">
        <span>设为默认地址</span>
        <input
          type="checkbox"
          checked={!!fields.default}
          disabled={disabled}
          onChange={(e) => onChange("default", e.target.checked)}
        />
      </label>
    </div>
  );
}
