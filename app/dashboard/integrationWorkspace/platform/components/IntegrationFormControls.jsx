"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

const BRAND_PRIMARY = "#1a76d1";
const BRAND_HOVER = "#2C2D3F";

export function Label({ children, required }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-600">
      {children}
      {required ? <span className="ml-0.5 text-red-400">*</span> : null}
    </label>
  );
}

function FieldWrap({ icon, suffix, children }) {
  return (
    <div className={`relative ${icon ? "[&>input]:pl-9 [&>select]:pl-9" : ""} ${suffix ? "[&>input]:pr-9" : ""}`}>
      {icon ? (
        <span className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
      ) : null}
      {children}
      {suffix ? (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-blue-600">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Input({
  label,
  required,
  placeholder,
  value,
  type = "text",
  icon,
  suffix,
  hint,
  error,
  onChange,
  className = "",
  ...props
}) {
  return (
    <div>
      {label ? <Label required={required}>{label}</Label> : null}
      <FieldWrap icon={icon} suffix={suffix}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
          className={`w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[#1a76d1] focus:ring-2 focus:ring-[#1a76d1]/15 ${className}`}
        />
      </FieldWrap>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

export function Select({
  label,
  required,
  placeholder,
  options = [],
  value,
  onChange,
  icon,
  hint,
  error,
  disabled = false,
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const hasValue = String(value ?? "").trim() !== "";

  return (
    <div>
      {label ? <Label required={required}>{label}</Label> : null}
      <div
        className={`relative overflow-hidden rounded-xl border transition-all ${
          hasValue
            ? "border-[#c9d9ee] bg-white shadow-[0_6px_18px_rgba(17,39,82,0.05)]"
            : "border-[#d9e2f0] bg-[#fbfcff]"
        } ${disabled ? "bg-gray-50" : ""}`}
      >
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        ) : null}
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none border-0 bg-transparent py-3 text-sm outline-none transition-all focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-400 ${
            icon ? "pl-9" : "pl-3.5"
          } ${hasValue ? "pr-10 text-[#162033]" : "pr-10 text-gray-400"} hover:bg-transparent`}
        >
          <option value="" disabled>
            {placeholder || "Select..."}
          </option>
          {normalizedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center border-l border-[#e7edf6] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f7fd_100%)]">
          <ChevronDown className={`h-3.5 w-3.5 transition-colors ${hasValue ? "text-[#1a76d1]" : "text-gray-400"}`} />
        </div>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

export function MultiSelect({
  label,
  required,
  placeholder,
  options = [],
  value = [],
  onChange,
  hint,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  const toggleOption = (option) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }
    onChange([...value, option]);
  };

  const handleSelectAll = () => onChange(filteredOptions);
  const handleClearAll = () => onChange([]);

  const handleRemove = (item, event) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== item));
  };

  return (
    <div ref={rootRef}>
      {label ? <Label required={required}>{label}</Label> : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex w-full items-start justify-between rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2 text-left text-sm outline-none transition-all hover:border-[#b8c9e4] focus:border-[#1a76d1] focus:ring-2 focus:ring-[#1a76d1]/15 ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <div className="min-h-[20px] flex-1">
          {value.length ? (
            <span className="pt-0.5 text-gray-700" style={{ color: BRAND_PRIMARY }}>
              {value.length} column{value.length > 1 ? "s" : ""} selected
            </span>
          ) : (
            <span className="pt-0.5 text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: open ? BRAND_PRIMARY : "#9ca3af" }}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-[#d9e2f0] bg-white p-2 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Select Columns</span>
            <span className="text-[11px] font-semibold" style={{ color: BRAND_PRIMARY }}>
              {value.length} chosen
            </span>
          </div>

          <div className="mb-2 px-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search selected or available columns..."
                className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2 px-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors"
              style={{ background: BRAND_PRIMARY }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BRAND_HOVER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = BRAND_PRIMARY;
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-56 overflow-auto">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const checked = value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors"
                    style={
                      checked
                        ? { background: "rgba(26,118,209,0.08)", color: BRAND_PRIMARY }
                        : { color: "#374151" }
                    }
                    onMouseEnter={(e) => {
                      if (!checked) {
                        e.currentTarget.style.background = BRAND_HOVER;
                        e.currentTarget.style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!checked) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#374151";
                      }
                    }}
                  >
                    <span className="pr-3">{option}</span>
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded border text-[10px]"
                      style={
                        checked
                          ? { borderColor: BRAND_PRIMARY, background: BRAND_PRIMARY, color: "#fff" }
                          : { borderColor: "#d1d5db", background: "#fff", color: "transparent" }
                      }
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-gray-400">No options found</p>
            )}
          </div>
        </div>
      ) : null}

      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
      {value.length ? (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium" style={{ color: BRAND_PRIMARY }}>
              {value.length} selected
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-gray-500 transition-colors hover:text-[#2C2D3F]"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {value.map((item) => (
              <button
                key={item}
                type="button"
                onClick={(event) => handleRemove(item, event)}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white"
                style={{
                  borderColor: "rgba(26,118,209,0.18)",
                  background: "#ffffff",
                  color: BRAND_PRIMARY,
                }}
              >
                <span className="max-w-[140px] truncate">{item}</span>
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SectionHeader({ icon: Icon, tag, title }) {
  return (
    <div className="mb-2 flex items-center gap-3 border-b border-gray-100 pb-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{tag}</p>
        <p className="text-[13px] font-semibold leading-tight text-gray-900">{title}</p>
      </div>
      <div className="ml-1 h-px flex-1 bg-gray-100" />
    </div>
  );
}

