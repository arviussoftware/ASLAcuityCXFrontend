"use client";

export const baseControlClassName =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-muted-foreground/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15";

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <div className="flex w-full items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${disabled ? "cursor-not-allowed" : ""} ${
          checked
            ? "border-emerald-500/60 bg-emerald-500"
            : "border-slate-200 bg-slate-200"
        }`}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextControl({ value, onChange, placeholder, icon, type = "text", className = "", ...props }) {
  if (!icon) {
    return (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${baseControlClassName} ${className}`}
        {...props}
      />
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${baseControlClassName} pl-10 ${className}`}
        {...props}
      />
    </div>
  );
}

export function SelectControl({ value, onChange, icon, children, className = "" }) {
  if (!icon) {
    return (
      <select value={value} onChange={onChange} className={`${baseControlClassName} ${className}`}>
        {children}
      </select>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
        {icon}
      </span>
      <select
        value={value}
        onChange={onChange}
        className={`${baseControlClassName} appearance-none pl-10 pr-8 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

export function Section({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-[var(--brand-primary)]">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function PageHeader({ icon, title, description, badge }) {
  return (
    <div className="mb-2 rounded-2xl border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-[var(--brand-primary)]">
            {icon}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        {badge ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {badge}
          </div>
        ) : null}
      </div>
    </div>
  );
}
