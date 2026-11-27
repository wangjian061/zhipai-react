import React from "react";

function addressLine(address) {
  return [address.region, address.street].filter(Boolean).join(" ");
}

export function PrintAddressEntry({ address, onOpen, disabled, readOnly, buttonRef, error }) {
  return <button type="button" ref={buttonRef} className="print-address-entry"
    disabled={disabled || readOnly} onClick={onOpen}>
    <span className="print-address-symbol" aria-hidden="true"><svg><use href="#i-nav-user" /></svg></span>
    <span className="print-address-copy">
      {address ? <>
        <span className="sr-only">收货地址</span>
        <strong><span>{address.name}</span><span>{address.phone}</span></strong>
        <span className="print-address-line">{addressLine(address)}</span>
      </> : <>
        <strong>添加收货地址</strong>
        <span className="print-address-line">照片将寄送到这个地址</span>
      </>}
      {error && <span className="ui-field-error" role="alert">{error}</span>}
    </span>
    {!readOnly && <svg className="print-row-chevron" aria-hidden="true"><use href="#i-chevron" /></svg>}
  </button>;
}

export default function PrintAddressBook({ addresses, selectedId, ready, disabled, onSelect, onEdit }) {
  return <div className="print-screen">
    <div className="print-body">
      {ready && !addresses.length && <div className="print-empty">
        <svg aria-hidden="true"><use href="#i-nav-user" /></svg>
        <h2>添加一个收货地址</h2>
        <p>收件人、联系电话和详细地址都需要填写。</p>
      </div>}
      {addresses.map(address => <section className="print-card print-address-card" key={address.id ?? "draft"}>
        <button type="button" className="print-address-select" aria-pressed={selectedId === address.id}
          disabled={disabled} onClick={() => onSelect(address.id)}>
          <span aria-hidden="true" className={selectedId === address.id ? "print-radio checked" : "print-radio"} />
          <span className="print-address-copy">
            <strong>{address.name} {address.phone}{address.default && <small>默认</small>}</strong>
            <span className="print-address-line">{addressLine(address)}</span>
          </span>
        </button>
        <button type="button" className="print-address-edit" aria-label={`编辑${address.name}的收货地址`}
          disabled={disabled} onClick={() => onEdit(address.id)}>编辑</button>
      </section>)}
    </div>
    <footer className="print-footer">
      <button type="button" className="print-primary" disabled={disabled} onClick={() => onEdit()}>添加新地址</button>
    </footer>
  </div>;
}
