"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Database, Edit2, Eye, EyeOff, Info, Loader2, Mic2, Plus,
  RefreshCw, Search, Settings2, ToggleLeft, ToggleRight, Cpu, X,
  Globe, KeyRound, FileText,
} from "lucide-react";
import CryptoJS from "crypto-js";
// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TABLE_COLS = [
  { key: "#", label: "#", w: "w-12" },
  { key: "RuleName", label: "STT Rule Name", w: "w-48" },
  { key: "STTEngine", label: "STT Engine", w: "w-44" },
  { key: "ApiKey", label: "API Key", w: "w-44" },
  { key: "Language", label: "Language", w: "w-36" },
  { key: "Status", label: "Status", w: "w-24" },
  { key: "actions", label: "Actions", w: "w-20" },
];

const INITIAL_FORM = {
  id: null,
  ruleName: "",
  sttEngine: "",
  apiKey: "",
  language: "",     // stores l.Id as string
  ruleEnabled: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────


const getUserId = () => {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return user?.userId || null;
  } catch { return null; }
};

const makeHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  loggedInUserId: getUserId(),
});

const maskApiKey = (key) => {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
};

// API shape: [{ Id: number, Language: string }]
// Resolve a stored Id value → display label
const resolveLangLabel = (languageList, val) => {
  if (!val) return "—";
  const match = languageList.find((l) => String(l.Id) === String(val));
  return match?.Language ?? String(val);
};

// ─── Small shared UI ──────────────────────────────────────────────────────────

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 rounded-md bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${enabled
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : "text-red-400 bg-red-400/10 border-red-400/30"
      }`}>
      {enabled ? <><ToggleRight size={12} />Active</> : <><ToggleLeft size={12} />Inactive</>}
    </span>
  );
}

function EngineBadge({ name }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] border-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)]">
      <Cpu size={10} />{name || "—"}
    </span>
  );
}

function LanguageBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-violet-600 bg-violet-500/10 border-violet-500/30">
      <Globe size={10} />{label || "—"}
    </span>
  );
}

// ─── Reusable form primitives ─────────────────────────────────────────────────

function Section({ icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
        <div className="w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="m-0 text-[13px] font-bold text-foreground">{title}</p>
          {subtitle && <p className="m-0 text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="m-0 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TextControl({ value, onChange, placeholder, type = "text", icon, readOnly, className = "" }) {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full h-9 ${icon ? "pl-8" : "pl-3"} pr-3 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 placeholder:text-[var(--brand-placeholder)] ${readOnly ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      />
    </div>
  );
}

function SelectControl({ value, onChange, disabled, icon, children }) {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none z-10">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full h-9 ${icon ? "pl-8" : "pl-3"} pr-8 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none appearance-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2010%2010%22%3E%3Cpath%20d%3D%22M2%203.5l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center] ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40 ${checked ? "bg-[var(--brand-primary)]" : "bg-[var(--brand-input-border)]"
          }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      <div>
        <p className="m-0 text-xs font-semibold text-foreground">{label}</p>
        {hint && <p className="m-0 text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function ApiKeyField({ value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center">
      <span className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none">
        <KeyRound size={15} />
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="Enter API key…"
        className="w-full h-9 pl-8 pr-10 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 placeholder:text-[var(--brand-placeholder)]"
      />
      <button
        type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 text-muted-foreground bg-transparent border-none cursor-pointer p-0 hover:text-foreground transition-colors"
        aria-label={show ? "Hide API key" : "Show API key"}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ totalItems, pageSize, pageNumber, onPage, onSize }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasPrev = pageNumber > 1;
  const hasNext = pageNumber < totalPages;

  const pages = useMemo(() => {
    if (totalPages <= 0) return [];
    const set = new Set(
      [1, totalPages, pageNumber - 1, pageNumber, pageNumber + 1].filter(
        (p) => p >= 1 && p <= totalPages
      )
    );
    const sorted = [...set].sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push(`dot-${i}`);
      out.push(p);
    });
    return out;
  }, [pageNumber, totalPages]);

  if (totalItems === 0) return null;

  const start = (pageNumber - 1) * pageSize + 1;
  const end = Math.min(pageNumber * pageSize, totalItems);

  const NavBtn = ({ onClick, disabled, label, children }) => (
    <button
      onClick={onClick} disabled={disabled} aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--brand-input-border)] bg-card text-foreground text-xs font-semibold transition-all duration-150 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_2%,transparent)] gap-3">
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Showing <strong className="text-foreground font-semibold">{start}–{end}</strong> of{" "}
          <strong className="text-foreground font-semibold">{totalItems}</strong>
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onSize(Number(e.target.value))}
            aria-label="Records per page"
            className="h-7 pl-2 pr-6 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs font-semibold text-foreground cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2010%2010%22%3E%3Cpath%20d%3D%22M2%203.5l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)] transition-colors"
          >
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 shrink-0 ml-auto" aria-label="Pagination">
          <NavBtn onClick={() => onPage(1)} disabled={!hasPrev} label="First page"><ChevronsLeft size={13} /></NavBtn>
          <NavBtn onClick={() => onPage(pageNumber - 1)} disabled={!hasPrev} label="Previous page"><ChevronLeft size={13} /></NavBtn>
          <div className="flex items-center gap-1 mx-0.5">
            {pages.map((p) =>
              String(p).startsWith("dot") ? (
                <span key={p} className="w-7 h-8 flex items-center justify-center text-xs text-muted-foreground font-semibold select-none">…</span>
              ) : (
                <button
                  key={p} onClick={() => onPage(p)} aria-label={`Page ${p}`}
                  aria-current={p === pageNumber ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 ${p === pageNumber
                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_2px_6px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)] cursor-default pointer-events-none"
                    : "bg-card border-[var(--brand-input-border)] text-foreground hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] active:scale-95 cursor-pointer"
                    }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <NavBtn onClick={() => onPage(pageNumber + 1)} disabled={!hasNext} label="Next page"><ChevronRight size={13} /></NavBtn>
          <NavBtn onClick={() => onPage(totalPages)} disabled={!hasNext} label="Last page"><ChevronsRight size={13} /></NavBtn>
        </nav>
      )}
    </div>
  );
}

// ─── View (Detail) Modal ──────────────────────────────────────────────────────

function ViewModal({ rule, onClose, languageList }) {
  if (!rule) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-[var(--brand-input-border)] shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center">
              <FileText size={14} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="m-0 text-sm font-bold text-foreground">STT Rule Details</p>
              <p className="m-0 text-[11px] text-muted-foreground">Read-only view</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--brand-input-border)] text-muted-foreground bg-transparent cursor-pointer hover:text-foreground hover:border-[var(--brand-primary)] transition-colors">
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <DetailRow label="STT Rule Name" value={rule.ruleName || "—"} />
          <DetailRow label="STT Engine" value={<EngineBadge name={rule.sttEngine || "—"} />} />
          <DetailRow
            label="API Key"
            value={
              <span className="font-mono text-xs tracking-wider text-muted-foreground">
                {maskApiKey(rule.apiKey)}
              </span>
            }
          />
          <DetailRow label="Language" value={<LanguageBadge label={resolveLangLabel(languageList, rule.language)} />} />
          <DetailRow label="Status" value={<StatusBadge enabled={!!(rule.RuleEnabled ?? rule.ruleEnabled ?? 0)} />} />
        </div>

        <div className="px-5 pb-4 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-sm font-semibold text-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--brand-input-border)] last:border-0">
      <span className="text-xs font-semibold text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

// ─── Form Page ────────────────────────────────────────────────────────────────

function FormPage({
  form, setForm, update, onSubmit, onCancel,
  saving, status, isEdit,
  languageList, languageLoading, languageError,
  providers, providersLoading,  // ← ADDED
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">

      {/* Header */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] text-xs font-semibold text-muted-foreground bg-transparent cursor-pointer hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors">
            <ChevronLeft size={13} /> Back
          </button>
          <div className="w-px h-6 bg-[var(--brand-input-border)]" />
          <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
            {isEdit ? <Edit2 size={14} className="text-[var(--brand-primary)]" /> : <Plus size={14} className="text-[var(--brand-primary)]" />}
          </div>
          <div>
            <p className="m-0 text-sm font-bold text-foreground">
              {isEdit ? "Edit STT Rule" : "Add STT Rule"}
            </p>
            <p className="m-0 text-[11px] text-muted-foreground mt-px">
              {isEdit
                ? "Update the existing Speech-to-Text rule."
                : "Create a new STT rule with engine, API key, and language configuration."}
            </p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {status.type !== "idle" && (
        <div className={`flex items-start gap-2.5 mb-3 rounded-xl px-3.5 py-2.5 text-xs border ${status.type === "success"
          ? "border-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--brand-secondary)_8%,transparent)] text-[var(--brand-secondary)]"
          : "border-[var(--brand-error-border)] bg-[var(--brand-error-bg)] text-[var(--brand-error-text)]"
          }`}>
          {status.type === "success"
            ? <CheckCircle2 size={14} className="mt-px shrink-0" />
            : <Info size={14} className="mt-px shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Section
          icon={<Settings2 size={16} className="text-[var(--brand-secondary)]" />}
          title="STT Rule Configuration"
          subtitle="Configure the Speech-to-Text engine, credentials, and language settings."
        >
          <div className="grid gap-4 md:grid-cols-2">

            {/* Rule Name — full width */}
            <div className="md:col-span-2">
              <Field label="STT Rule Name" required hint="A descriptive name to identify this STT rule.">
                <TextControl
                  value={form.ruleName}
                  onChange={update("ruleName")}
                  placeholder="e.g. English_Google_STT_Rule"
                  icon={<FileText size={15} />}
                />
              </Field>
            </div>

            <Field
              label="STT Engine"
              required
              hint={providersLoading ? "Loading engines…" : `${providers.length} engine(s) available`}
            >
              <SelectControl
                value={form.sttEngine}
                onChange={update("sttEngine")}
                disabled={providersLoading || !providers.length}
                icon={<Cpu size={15} />}
              >
                <option value="">
                  {providersLoading ? "Loading…" : "— Select STT Engine —"}
                </option>
                {providers.map((p) => (
                  <option key={p.Id} value={p.Id}>  {p.Provider_name ?? p.providerName ?? p.name ?? "Unnamed"}</option>
                ))}
              </SelectControl>
            </Field>

            {/* Language — dropdown from /api/integrationWorkspace/languageDDL */}
            <Field
              label="Language"
              required
              hint={
                languageLoading ? "Loading languages…"
                  : languageError ? "Failed to load languages."
                    : `${languageList.length} language(s) available`
              }
            >
              <SelectControl
                value={form.language}
                onChange={update("language")}
                disabled={languageLoading || languageError || !languageList.length}
                icon={<Globe size={15} />}
              >
                <option value="">
                  {languageLoading ? "Loading…" : languageError ? "Unavailable" : "— Select Language —"}
                </option>
                {languageList.map((l) => (
                  <option key={l.Id} value={l.Id}>{l.Language}</option>
                ))}
              </SelectControl>
            </Field>

            {/* API Key — full width, show/hide */}
            <div className="md:col-span-2">
              <Field label="API Key" required hint="The authentication key for the selected STT engine. Stored securely.">
                <ApiKeyField value={form.apiKey} onChange={update("apiKey")} />
              </Field>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center md:col-span-2">
              <Toggle
                checked={form.ruleEnabled}
                onChange={(v) => setForm((p) => ({ ...p, ruleEnabled: v }))}
                label="Rule Enabled"
                hint="Disable to keep this rule saved but inactive."
              />
            </div>

          </div>
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--brand-input-border)] mt-2">
          <button type="button" onClick={onCancel} disabled={saving}
            className="px-5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-sm font-semibold text-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-lg border-none text-sm font-semibold text-white bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] transition-opacity ${saving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:opacity-90"
              }`}>
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : isEdit
                ? <><Edit2 size={13} /> Update Rule</>
                : <><Mic2 size={13} /> Save Rule</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function STTRulesPage() {
  const [view, setView] = useState("list");

  const [allRules, setAllRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [viewingRule, setViewingRule] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  // Language DDL
  const [languageList, setLanguageList] = useState([]);
  const [languageLoading, setLanguageLoading] = useState(true);
  const [languageError, setLanguageError] = useState(false);

  // ── ADDED: Providers (STT Engine) DDL ──────────────────────────────────────
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const abortRef = useRef({});

  // ── Load all STT rules ──────────────────────────────────────────────────────
  const loadRules = useCallback(() => {
    abortRef.current["rules"]?.abort();
    abortRef.current["rules"] = new AbortController();
    setRulesLoading(true);
    setRulesError(null);

   return fetch("/api/integrationWorkspace/Transcription", {
      headers: makeHeaders(),
      cache: "no-store",
      signal: abortRef.current["rules"].signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success === false) throw new Error(json?.message || "Failed to load rules");
        setAllRules(Array.isArray(json.data) ? json.data : []);
      })
      .catch((e) => { if (e.name !== "AbortError") setRulesError(e.message); })
      .finally(() => setRulesLoading(false));
  }, []);

  // Fetch language DDL once on mount
  useEffect(() => {
    const currentAborts = abortRef.current;
    loadRules();

    const fetchLanguages = async () => {
      try {
        const response = await fetch("/api/integrationWorkspace/languageDDL", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result.languageList) && result.languageList.length > 0) {
          setLanguageList(result.languageList);
        } else {
          setLanguageError(true);
        }
      } catch (err) {
        console.error("Language fetch failed:", err.message);
        setLanguageError(true);
      } finally {
        setLanguageLoading(false);
      }
    };
    fetchLanguages();

    // ── ADDED: fetch providers DDL ─────────────────────────────────────────
    const fetchProviders = async () => {
      try {
        const res = await fetch("/api/integrationWorkspace/sdkproviderDDL", {
          method: "GET",
          headers: makeHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        setProviders(Array.isArray(json.providerList) ? json.providerList : []);
      } catch {
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };
    fetchProviders();

    return () => Object.values(currentAborts).forEach((c) => c.abort());
  }, [loadRules]);

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRules;
    return allRules.filter((row) => {
      const name = String(row.ruleName ?? "").toLowerCase();
      const engine = String(row.sttEngine ?? "").toLowerCase();
      const lang = resolveLangLabel(languageList, row.language).toLowerCase();
      return name.includes(q) || engine.includes(q) || lang.includes(q);
    });
  }, [allRules, searchQuery, languageList]);

  // ── Client-side pagination ─────────────────────────────────────────────────
  const pagedRules = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, pageNumber, pageSize]);

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleSearchInput = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPageNumber(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setPageNumber(1);
  }, []);

  const update = useCallback((key) => (evOrVal) => {
    setForm((p) => ({
      ...p,
      [key]: evOrVal?.target !== undefined ? evOrVal.target.value : evOrVal,
    }));
    setStatus({ type: "idle", message: "" });
  }, []);

  const openAdd = useCallback(() => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setStatus({ type: "idle", message: "" });
    setView("form");
  }, []);

  const goBack = useCallback(() => {
    setView("list");
    setEditingId(null);
    setStatus({ type: "idle", message: "" });
  }, []);

  const openEdit = useCallback((row) => {
    setForm({
      id: row.Id ?? row.id ?? null,
      ruleName: row.ruleName ?? "",
      sttEngine: row.sttEngineId != null ? String(row.sttEngineId) : "",
      apiKey: row.apiKey ?? "",
      language: row.language != null ? String(row.language) : "",
      ruleEnabled: !!(row.RuleEnabled ?? row.ruleEnabled ?? 0),
    });
    setEditingId(row.Id ?? row.id ?? null);
    setStatus({ type: "idle", message: "" });
    setView("form");
  }, []);

  const openView = useCallback((row) => setViewingRule(row), []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!String(form.ruleName ?? "").trim()) return "STT Rule Name is required.";
    if (!String(form.sttEngine ?? "").trim()) return "STT Engine is required.";
    if (!String(form.apiKey ?? "").trim()) return "API Key is required.";
    if (!form.language) return "Language is required.";
    return null;
  }, [form]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setStatus({ type: "error", message: err }); return; }

    setSaving(true);
    try {
      const isEditMode = editingId !== null;
      const userId = getUserId();
      if (!userId) {
        setStatus({ type: "error", message: "Session expired. Please log in again." });
        setSaving(false);
        return;
      }


      const payload = {
        ...(isEditMode && { id: editingId }),
        ruleName: form.ruleName.trim(),
        sttEngine: form.sttEngine.trim(),
        apiKey: form.apiKey.trim(),
        languageId: Number(form.language),
        ruleEnabled: form.ruleEnabled,
        createdBy: userId,
        updatedBy: userId,
      };

      const res = await fetch(
        isEditMode
          ? "/api/integrationWorkspace/Transcription/updateSTTRule"
          : "/api/integrationWorkspace/Transcription/saveSTTRule",
        { method: isEditMode ? "PUT" : "POST", headers: makeHeaders(), body: JSON.stringify(payload) }
      );
      const json = await res.json();

      if (res.ok && json?.success) {
        setStatus({ type: "success", message: json.message || "Saved successfully." });
        // loadRules();
        // setTimeout(goBack, 1500);
        await loadRules();
        goBack();
      } else {
        throw new Error(json?.message || "Failed to save.");
      }
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, validate, loadRules, goBack]);

  // ── Form view ──────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <FormPage
        form={form} setForm={setForm} update={update}
        onSubmit={handleSubmit} onCancel={goBack}
        saving={saving} status={status}
        isEdit={editingId !== null}
        languageList={languageList}
        languageLoading={languageLoading}
        languageError={languageError}
        providers={providers}
        providersLoading={providersLoading}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <>
      {viewingRule && (
        <ViewModal
          rule={viewingRule}
          onClose={() => setViewingRule(null)}
          languageList={languageList}
        />
      )}

      <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">

        {/* Page header */}
        <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-5 py-3.5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
                <Mic2 size={17} className="text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="m-0 text-sm font-bold text-foreground">STT Rules</p>
                <p className="m-0 text-xs text-muted-foreground mt-0.5">
                  Manage Speech-to-Text rules with engine, API credentials, and language settings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadRules} disabled={rulesLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-xs font-semibold text-muted-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={rulesLoading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-none text-sm font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] shadow-[0_2px_10px_rgba(26,58,110,0.25)] hover:opacity-90 transition-opacity">
                <Plus size={14} /> Add Rule
              </button>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 px-5 py-3 border-b border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[var(--brand-primary)]" />
              <span className="text-[13px] font-bold text-foreground">All STT Rules</span>
              {!rulesLoading && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary)]">
                  {filteredRules.length}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none" />
              <input
                type="text" value={searchQuery} onChange={handleSearchInput}
                placeholder="Search rule name, engine, language…"
                className="h-8 pl-8 pr-8 w-64 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch}
                  className="absolute right-2 flex text-[var(--brand-placeholder)] bg-transparent border-none cursor-pointer p-0 hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {rulesError ? (
            <div className="flex items-center justify-center gap-2 p-5 text-[var(--brand-error-text)] text-[13px]">
              <Info size={14} /> {rulesError}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]">
                      {TABLE_COLS.map((col) => (
                        <th key={col.key}
                          className={`${col.w} px-4 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase text-[var(--brand-primary)] whitespace-nowrap border-b border-[var(--brand-input-border)]`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rulesLoading ? (
                      Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                        <SkeletonRow key={i} cols={TABLE_COLS.length} />
                      ))
                    ) : pagedRules.length === 0 ? (
                      <tr>
                        <td colSpan={TABLE_COLS.length} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2.5">
                            {searchQuery ? (
                              <>
                                <Search size={32} className="opacity-20" />
                                <p className="m-0 text-sm font-semibold">{`No results for "${searchQuery}"`}</p>
                                <button onClick={clearSearch} className="text-xs text-[var(--brand-primary)] bg-transparent border-none cursor-pointer underline">
                                  Clear search
                                </button>
                              </>
                            ) : (
                              <>
                                <Mic2 size={32} className="opacity-20" />
                                <p className="m-0 text-sm font-semibold">No STT rules yet</p>
                                <button onClick={openAdd}
                                  className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg border-none text-xs font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)]">
                                  <Plus size={13} /> Add Rule
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedRules.map((row, idx) => (
                        <tr key={row.Id ?? row.id ?? idx}
                          className="border-b border-[var(--brand-input-border)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--brand-primary)_3%,transparent)]">

                          <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">
                            {(pageNumber - 1) * pageSize + idx + 1}
                          </td>

                          <td className="px-4 py-3 font-semibold text-foreground">
                            {row.ruleName ?? "—"}
                          </td>

                          <td className="px-4 py-3">
                            <EngineBadge name={row.sttEngine || "—"} />
                          </td>

                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground tracking-wider">
                            {maskApiKey(row.apiKey)}
                          </td>

                          <td className="px-4 py-3">
                            <LanguageBadge label={resolveLangLabel(languageList, row.language)} />
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge enabled={!!(row.RuleEnabled ?? row.ruleEnabled ?? 0)} />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openView(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] text-muted-foreground text-[11px] font-semibold cursor-pointer hover:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] hover:text-[var(--brand-primary)] transition-colors"
                                title="View details">
                                <Eye size={11} />
                              </button>
                              <button onClick={() => openEdit(row)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)] text-[var(--brand-primary)] text-[11px] font-semibold cursor-pointer hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] transition-colors">
                                <Edit2 size={11} /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!rulesLoading && filteredRules.length > 0 && (
                <Pagination
                  totalItems={filteredRules.length}
                  pageSize={pageSize}
                  pageNumber={pageNumber}
                  onPage={(p) => setPageNumber(p)}
                  onSize={(s) => { setPageSize(s); setPageNumber(1); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}