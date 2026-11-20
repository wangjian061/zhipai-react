import React, { useId } from "react";
import { SHIPPING_ADDRESS_FIELDS, cleanShippingAddress, shippingAddressIssue } from "../domain/shipping-address.js";
export default function ShippingAddressFields({
  fields,
  disabled,
  onChange,
  error,
  className = "",
}) {
  const errorId = useId();
  const issue = error ? shippingAddressIssue(cleanShippingAddress(fields)) : null;
  const fieldError = issue?.message === error ? issue : null;
  return (
    <div className={"print-fields " + className}>
      {SHIPPING_ADDRESS_FIELDS.map(
        ({ key, label, multiline, optional, ...props }) => {
          const Input = multiline ? "textarea" : "input";
          const invalid = fieldError?.fields.includes(key);
          return (
            <label
              key={key}
              className={multiline ? "print-street-field" : undefined}
            >
              <span>{label}</span>
              <Input
                {...props}
                className="ui-form-control"
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                required={!optional}
                disabled={disabled}
                value={fields[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
              />
              {fieldError?.fields[0] === key && <small id={errorId} role="alert" className="ui-field-error">{fieldError.message}</small>}
            </label>
          );
        },
      )}
      {error && !fieldError && <p className="ui-field-error" role="alert">{error}</p>}
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
