"use client";

export function FormLabel({ children, required }) {
  return (
    <label className="block text-[11px] font-semibold text-[#475569] mb-1">
      {children}
      {required ? <span className="ml-0.5 text-red-600">*</span> : null}
    </label>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  ...props
}) {
  return (
    <div>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}
      <input
        type={type}
        className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-[13px] text-[#0f172a] outline-none focus:bg-white focus:border-[#93c5fd] focus:ring-2 focus:ring-[#1a76d1]/10"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
      {error ? <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  required,
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
  error,
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );

  return (
    <div>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}
      <select
        className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-[13px] text-[#0f172a] outline-none focus:bg-white focus:border-[#93c5fd] focus:ring-2 focus:ring-[#1a76d1]/10 disabled:opacity-60"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">{placeholder || "Select"}</option>
        {normalized.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

