"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Clock, Cloud, Database, Download, Edit2, Eye, EyeOff, FileText, FolderOpen,
  HardDrive, Info, KeyRound, Loader2, Plus, RefreshCw,
  Search, Server, Settings2, ToggleLeft, ToggleRight, Trash2, X,
} from "lucide-react";
import CryptoJS from "crypto-js";
import { notFound } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";
import {
  Field, Section, SelectControl, TextControl, Toggle, baseControlClassName,
} from "@/components/workspace/rule-ui";
import InteractionCriteriaFields from "@/components/workspace/interaction-criteria";

// ─── Constants ────────────────────────────────────────────────────────────────
const S3_STORAGE_CLASSES = [
  "STANDARD", "STANDARD_IA", "ONEZONE_IA",
  "INTELLIGENT_TIERING", "GLACIER", "GLACIER_IR", "DEEP_ARCHIVE",
];

const DEST_OPTIONS = [
  { label: "S3", value: "S3" },
  { label: "Local Drive", value: "LOCAL" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const MAX_EXPORT_LIMIT = Number(process.env.NEXT_PUBLIC_MAX_EXPORT_LIMIT || 2000);

const DEST_META = {
  S3: { icon: Cloud, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  SFTP: { icon: Server, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  GCP: { icon: Cloud, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  AZURE: { icon: Cloud, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  LOCAL: { icon: HardDrive, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

const TABLE_COLS = [
  { key: "#", label: "#", w: "w-12" },
  { key: "RuleName", label: "Rule Name", w: "w-44" },
  { key: "ExportPath", label: "Destination", w: "w-28" },
  { key: "InstanceName", label: "Instance", w: "w-36" },
  { key: "StartDateTime", label: "From", w: "w-28" },
  { key: "ToDateTime", label: "To", w: "w-24" },
  { key: "EnableCDR", label: "CDR", w: "w-16" },
  { key: "RuleEnabled", label: "Status", w: "w-24" },
  { key: "CreatedDate", label: "Created", w: "w-24" },
  { key: "actions", label: "Actions", w: "w-20" },
];

const INITIAL_FORM = {
  id: null, platformId: "", ruleName: "", instanceId: "", instanceName: "",
  startDateTime: "", toDateTime: "", exportPath: "", fileName: "", ruleEnabled: true,
  organizationId: "", organizationLabel: "",
  agentId: "", agentName: "", agentLogin: "",
  organizationIds: [],
  agentIds: [],
  orgAgentMappings: [],
  s3FileFormat: "", s3BucketRegion: "", s3BucketName: "",
  s3AccessKey: "", s3SecretKey: "", s3StorageClass: "",
  sftpServerName: "", sftpBaseFolder: "", sftpUserId: "", sftpPassword: "", sftpSshKey: "",
  gcpBucket: "", gcpProjectId: "", gcpServiceKey: "",
  azureAccount: "", azureContainer: "", azureConnection: "",
  destDirectory: "",
  enableCDR: false, cdrFormat: "csv", cdrFileName: "",
  exportMetadataColumn: "",
  ani: "", dnis: "",
  // Interaction criteria defaults: keep dropdowns unselected until user chooses.
  extType: "", extInput: "", extStart: "", extEnd: "",
  durationOp: "", durationValue: "", durationValueMax: "",
  customField: "none", customValue: "",
  scheduleType: "DAILY",
  hourlyInterval: "1",
};

const DEST_RESET_KEYS = [
  "s3FileFormat", "s3BucketRegion", "s3BucketName", "s3AccessKey", "s3SecretKey", "s3StorageClass",
  "sftpServerName", "sftpBaseFolder", "sftpUserId", "sftpPassword", "sftpSshKey",
  "gcpBucket", "gcpProjectId", "gcpServiceKey",
  "azureAccount", "azureContainer", "azureConnection", "destDirectory",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUserId = () => {
  if (typeof window === "undefined") return "1";
  const encryptedUserData = sessionStorage.getItem("user");
  if (!encryptedUserData) return "1";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const user = JSON.parse(decryptedData);
    return String(user?.userId || "1");
  } catch (error) {
    console.error("Error decrypting user data in Export page:", error);
    return "1";
  }
};
const makeHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  loggedInUserId: getUserId(),
});
const fmtDate = (v) => {
  try { const d = new Date(v); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
};
const toFDT = (v) => {
  try { const d = new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 16); }
  catch { return ""; }
};
const r = (row, key, fb = "") => row[key] ?? row[key[0].toLowerCase() + key.slice(1)] ?? fb;
const idOrEmpty = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : "";
};
const normalizeCommaList = (v) => {
  const raw = String(v ?? "");
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.join(",") : "";
};

// ─── Build orgAgentMappings JSON ──────────────────────────────────────────────
const buildOrgAgentMappings = (form) => {
  if (Array.isArray(form.orgAgentMappings) && form.orgAgentMappings.length) {
    return JSON.stringify(form.orgAgentMappings);
  }
  const hasOrgMulti = Array.isArray(form.organizationIds);
  const hasAgentMulti = Array.isArray(form.agentIds);

  const orgIds = (
    hasOrgMulti && form.organizationIds.length ? form.organizationIds
      : !hasOrgMulti && form.organizationId ? [form.organizationId]
          : []
  ).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);

  if (!orgIds.length) return null;

  const agentIds = (
    hasAgentMulti && form.agentIds.length ? form.agentIds
      : !hasAgentMulti && form.agentId ? [form.agentId]
        : []
  ).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);

  if (!agentIds.length) return JSON.stringify(orgIds.map((orgId) => ({ orgId, agentId: null })));

  const mappings = [];
  orgIds.forEach((orgId) => agentIds.forEach((agentId) => mappings.push({ orgId, agentId })));
  return JSON.stringify(mappings);
};

// ─── MetadataColumnMultiPicker ────────────────────────────────────────────────
// Fetches column names from /api/integrationWorkspace/metadataColumns
// Stores selected values as comma-separated string (e.g. "col1,col2")
function MetadataColumnMultiPicker({ label, value, onChange, hint, placeholder }) {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Parse comma-separated string → Set
  const selected = useMemo(
    () => new Set(String(value || "").split(",").map(v => v.trim()).filter(Boolean)),
    [value],
  );

  // Fetch columns once on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/integrationWorkspace/metadataColumns", { headers: makeHeaders() })
      .then(res => res.json())
      .then(json => { if (!cancelled) setColumns(Array.isArray(json.data) ? json.data : []); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Close on Escape / outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMouse = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [open]);

  const filtered = useMemo(
    () => search ? columns.filter(c => c.toLowerCase().includes(search.toLowerCase())) : columns,
    [columns, search],
  );

  const toggle = (col) => {
    const next = new Set(selected);
    next.has(col) ? next.delete(col) : next.add(col);
    onChange([...next].join(","));
  };

  const clearAll = () => onChange("");

  return (
    <Field label={label} hint={hint}>
      <div ref={containerRef} className="relative">

        {/* ── Trigger ── */}
        <div
          onClick={() => !loading && setOpen(o => !o)}
          className={`${baseControlClassName} flex flex-wrap items-center gap-1.5 min-h-9 cursor-pointer pr-8`}
          style={{ borderColor: open ? "var(--brand-primary)" : undefined }}
        >
          {loading ? (
            <span className="text-[var(--brand-placeholder)] text-[13px]">Loading columns…</span>
          ) : selected.size === 0 ? (
            <span className="text-[var(--brand-placeholder)] text-[13px]">{placeholder || "Select column(s)"}</span>
          ) : (
            [...selected].map(col => (
              <span
                key={col}
                onClick={e => { e.stopPropagation(); toggle(col); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer"
                style={{
                  color: "var(--brand-primary)",
                  background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                }}
              >
                {col}<X size={9} />
              </span>
            ))
          )}
          <ChevronRight
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--brand-placeholder)]"
            style={{ transform: `translateY(-50%) rotate(${open ? 90 : 0}deg)`, transition: "transform 0.2s" }}
          />
        </div>

        {/* ── Dropdown ── */}
        {open && !loading && (
          <div
            className="absolute left-0 right-0 z-50 rounded-xl border border-[var(--brand-input-border)] overflow-hidden"
            style={{ top: "calc(100% + 6px)", background: "hsl(var(--background))", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            {/* Search bar */}
            <div
              className="flex items-center gap-2 px-3 py-2 border-b border-[var(--brand-input-border)]"
              style={{ background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)" }}
            >
              <Search size={12} className="text-[var(--brand-placeholder)]" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search columns…"
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-foreground"
              />
              {selected.size > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)", color: "var(--brand-primary)" }}
                >
                  {selected.size} selected
                </span>
              )}
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="flex bg-transparent border-none p-0 cursor-pointer text-[var(--brand-placeholder)]">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1.5" style={{ maxHeight: "220px" }}>
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-[var(--brand-placeholder)]">
                  {search ? "No matching columns." : "No columns available."}
                </div>
              ) : (
                filtered.map(col => {
                  const checked = selected.has(col);
                  return (
                    <div
                      key={col}
                      onClick={() => toggle(col)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-100"
                      style={{ background: checked ? "color-mix(in srgb, var(--brand-primary) 8%, transparent)" : "transparent" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(col)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                        style={{ accentColor: "var(--brand-primary)" }}
                      />
                      <span
                        className="flex-1 text-[12px] truncate"
                        style={{ fontWeight: checked ? 600 : 400, color: checked ? "var(--brand-primary)" : "hsl(var(--foreground))" }}
                      >
                        {col}
                      </span>
                      {checked && <CheckCircle2 size={12} className="shrink-0" style={{ color: "var(--brand-primary)" }} />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {selected.size > 0 && (
              <div
                className="flex justify-end gap-2 px-3 py-1.5 border-t border-[var(--brand-input-border)]"
                style={{ background: "color-mix(in srgb, var(--brand-input-bg) 50%, transparent)" }}
              >
                <button type="button" onClick={() => { clearAll(); setOpen(false); }}
                  className="text-[11px] font-semibold bg-transparent border-none cursor-pointer"
                  style={{ color: "var(--brand-error-text, #e53e3e)" }}>
                  Clear all
                </button>
                <button type="button" onClick={() => setOpen(false)}
                  className="text-[11px] font-semibold px-3 py-0.5 rounded-md cursor-pointer"
                  style={{
                    color: "var(--brand-primary)",
                    background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                  }}>
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

// ─── SubSection ───────────────────────────────────────────────────────────────
function SubSection({ title, icon: Icon, children }) {
  return (
    <div className="md:col-span-2 rounded-xl border border-[var(--brand-input-border)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)]">
        {Icon && <Icon size={12} className="text-[var(--brand-primary)] shrink-0" />}
        <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--brand-primary)]">{title}</span>
      </div>
      <div className="p-4 bg-[color-mix(in_srgb,var(--brand-input-bg)_55%,transparent)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
      </div>
    </div>
  );
}

// ─── PwdField ─────────────────────────────────────────────────────────────────
function PwdField({ label, required, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`${baseControlClassName} pr-10 w-full box-border`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex text-[var(--brand-placeholder)] bg-transparent border-none cursor-pointer p-0"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );
}

// ─── DestBadge / StatusBadge ──────────────────────────────────────────────────
function DestBadge({ path }) {
  const k = String(path || "").toUpperCase();
  const m = DEST_META[k] ?? { icon: FolderOpen, color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/30" };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.color} ${m.bg} ${m.border}`}>
      <Icon size={11} />{k || ""}
    </span>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${enabled ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-red-400 bg-red-400/10 border-red-400/30"}`}>
      {enabled ? <><ToggleRight size={12} />Active</> : <><ToggleLeft size={12} />Inactive</>}
    </span>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
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

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ pagination, pageSize, onPage, onSize, dataLength = 0 }) {
  const cur = pagination?.currentPage ?? 1;
  const total = pagination?.totalPages ?? 0;
  const count = pagination?.totalRecords || dataLength;
  const hasNext = pagination?.hasNextPage ?? false;
  const hasPrev = pagination?.hasPreviousPage ?? false;

  const pages = useMemo(() => {
    if (total <= 0) return [];
    const set = new Set([1, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push(`dot-${i}`);
      out.push(p);
    });
    return out;
  }, [cur, total]);

  if (!pagination || total <= 0) return null;

  const start = count === 0 ? 0 : (cur - 1) * pageSize + 1;
  const end = Math.min(cur * pageSize, count);

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
          {count === 0
            ? "No records"
            : <>Showing <strong className="text-foreground font-semibold">{start}–{end}</strong> of <strong className="text-foreground font-semibold">{count}</strong></>}
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
      {total > 1 && (
        <nav className="flex items-center gap-1 shrink-0 ml-auto" aria-label="Pagination">
          <NavBtn onClick={() => onPage(1)} disabled={!hasPrev} label="First page"><ChevronsLeft size={13} /></NavBtn>
          <NavBtn onClick={() => onPage(cur - 1)} disabled={!hasPrev} label="Previous page"><ChevronLeft size={13} /></NavBtn>
          <div className="flex items-center gap-1 mx-0.5">
            {pages.map((p) =>
              String(p).startsWith("dot") ? (
                <span key={p} className="w-7 h-8 flex items-center justify-center text-xs text-muted-foreground font-semibold select-none">…</span>
              ) : (
                <button
                  key={p} onClick={() => onPage(p)} aria-label={`Page ${p}`}
                  aria-current={p === cur ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 ${p === cur
                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_2px_6px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)] cursor-default pointer-events-none"
                    : "bg-card border-[var(--brand-input-border)] text-foreground hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] active:scale-95 cursor-pointer"
                    }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <NavBtn onClick={() => onPage(cur + 1)} disabled={!hasNext} label="Next page"><ChevronRight size={13} /></NavBtn>
          <NavBtn onClick={() => onPage(total)} disabled={!hasNext} label="Last page"><ChevronsRight size={13} /></NavBtn>
        </nav>
      )}
    </div>
  );
}

// ─── DestFields ───────────────────────────────────────────────────────────────
function DestFields({ form, setForm, update, isEdit }) {
  const ch = String(form.exportPath || "").toUpperCase();

  if (ch === "S3") return (
    <SubSection title="S3 Configuration" icon={Cloud}>
      {/* <Field label="File Format">
        <SelectControl value={form.s3FileFormat} onChange={update("s3FileFormat")}>
          <option value="">Select format</option>
          {["MP3","MP4","WAV"].map((v) => <option key={v} value={v}>{v}</option>)}
        </SelectControl>
      </Field> */}
      {/* <Field label="Storage Class" required>
        <SelectControl value={form.s3StorageClass} onChange={update("s3StorageClass")}>
          <option value="">Select class</option>
          {S3_STORAGE_CLASSES.map((v) => <option key={v} value={v}>{v}</option>)}
        </SelectControl>
      </Field> */}
      {/* <Field label="Bucket Region" required>
        <TextControl value={form.s3BucketRegion} onChange={update("s3BucketRegion")} placeholder="us-east-1" />
      </Field> */}
      <Field label="Bucket Name" required>
        <TextControl value={form.s3BucketName} onChange={update("s3BucketName")} placeholder="my-recordings-bucket" />
      </Field>
      <Field label="Access Key" required>
        <TextControl value={form.s3AccessKey} onChange={update("s3AccessKey")} placeholder="AKIAIOSFODNN7EXAMPLE" icon={<KeyRound size={14} />} />
      </Field>
      <PwdField
        label="Secret Key" required
        value={form.s3SecretKey}
        onChange={(e) => setForm((p) => ({ ...p, s3SecretKey: e.target.value }))}
        placeholder={isEdit ? "Leave blank to keep existing" : ""}
        hint={isEdit ? "Re-enter only to change." : undefined}
      />
    </SubSection>
  );

  if (ch === "SFTP") return (
    <SubSection title="SFTP Configuration" icon={Server}>
      <Field label="Server Name" required>
        <TextControl value={form.sftpServerName} onChange={update("sftpServerName")} placeholder="sftp.example.com" />
      </Field>
      <Field label="Base Folder" required>
        <TextControl value={form.sftpBaseFolder} onChange={update("sftpBaseFolder")} placeholder="/uploads/recordings" />
      </Field>
      <Field label="User ID" required>
        <TextControl value={form.sftpUserId} onChange={update("sftpUserId")} placeholder="sftp_user" />
      </Field>
      <PwdField
        label="Password" required
        value={form.sftpPassword}
        onChange={(e) => setForm((p) => ({ ...p, sftpPassword: e.target.value }))}
        placeholder={isEdit ? "Leave blank to keep existing" : ""}
        hint={isEdit ? "Re-enter only to change." : undefined}
      />
      <div className="md:col-span-2">
        <PwdField
          label="SSH Key" required
          value={form.sftpSshKey}
          onChange={(e) => setForm((p) => ({ ...p, sftpSshKey: e.target.value }))}
          placeholder={isEdit ? "Leave blank to keep existing" : "Paste SSH public key"}
          hint={isEdit ? "Re-enter only to change." : undefined}
        />
      </div>
    </SubSection>
  );

  if (ch === "GCP") return (
    <SubSection title="GCP Configuration" icon={Cloud}>
      <Field label="Bucket Name" required>
        <TextControl value={form.gcpBucket} onChange={update("gcpBucket")} placeholder="my-bucket" />
      </Field>
      <Field label="Project ID" required>
        <TextControl value={form.gcpProjectId} onChange={update("gcpProjectId")} placeholder="my-project-id" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Service Account JSON" required hint={isEdit ? "Paste JSON only to change." : undefined}>
          <textarea
            className={`${baseControlClassName} w-full resize-y font-mono text-xs box-border`}
            rows={4}
            value={form.gcpServiceKey}
            onChange={(e) => setForm((p) => ({ ...p, gcpServiceKey: e.target.value }))}
            placeholder={isEdit ? "Leave blank to keep existing" : "Paste Service Account JSON"}
          />
        </Field>
      </div>
    </SubSection>
  );

  if (ch === "AZURE") return (
    <SubSection title="Azure Configuration" icon={Cloud}>
      <Field label="Storage Account Name" required>
        <TextControl value={form.azureAccount} onChange={update("azureAccount")} placeholder="mystorageaccount" />
      </Field>
      <Field label="Container Name" required>
        <TextControl value={form.azureContainer} onChange={update("azureContainer")} placeholder="recordings" />
      </Field>
      <div className="md:col-span-2">
        <PwdField
          label="Connection String" required
          value={form.azureConnection}
          onChange={(e) => setForm((p) => ({ ...p, azureConnection: e.target.value }))}
          placeholder={isEdit ? "Leave blank to keep existing" : "Paste Azure connection string"}
          hint={isEdit ? "Re-enter only to change." : undefined}
        />
      </div>
    </SubSection>
  );

  if (ch === "LOCAL") return (
    <SubSection title="Local Drive Configuration" icon={HardDrive}>
      <div className="md:col-span-2">
        <div className="text-[12px] text-muted-foreground bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-[var(--brand-input-border)]/50">
          ℹ️ Calls will be exported automatically to the local drive path configured on the backend server.
        </div>
      </div>
    </SubSection>
  );
  return null;
}

// ─── FormPage ─────────────────────────────────────────────────────────────────
function FormPage({
  form, setForm, update, onSubmit, onCancel, saving, status, setStatus, isEdit,
  limitModalOpen, setLimitModalOpen, limitModalCount, isViewMode
}) {
  const destKey = String(form.exportPath || "").toUpperCase();
  const DestIcon = DEST_META[destKey]?.icon ?? FolderOpen;

  const currentDateTimeStr = useMemo(() => {
    const localNow = new Date();
    const year = localNow.getFullYear();
    const month = String(localNow.getMonth() + 1).padStart(2, "0");
    const day = String(localNow.getDate()).padStart(2, "0");
    const hours = String(localNow.getHours()).padStart(2, "0");
    const minutes = String(localNow.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">

      {/* Header */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button" onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] text-xs font-semibold text-muted-foreground bg-transparent cursor-pointer hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
          >
            <ChevronLeft size={13} /> Back
          </button>
          <div className="w-px h-6 bg-[var(--brand-input-border)]" />
          <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
            {isViewMode ? <Eye size={14} className="text-[var(--brand-primary)]" /> : isEdit ? <Edit2 size={14} className="text-[var(--brand-primary)]" /> : <Plus size={14} className="text-[var(--brand-primary)]" />}
          </div>
          <div>
            <p className="m-0 text-sm font-bold text-foreground">
              {isViewMode ? "View Export Configuration" : isEdit ? "Edit Export Configuration" : "Add Export Configuration"}
            </p>
            <p className="m-0 text-[11px] text-muted-foreground mt-px">
              {isViewMode 
                ? "View details of this saved export configuration." 
                : isEdit
                  ? "Update the existing rule. Re-enter any secrets to change them."
                  : "Create a new rule to export interactions to your chosen destination."}
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
        <fieldset disabled={isViewMode} className="border-none p-0 m-0 w-full flex flex-col gap-4">
          {/* ── General ── */}
          <Section
            icon={<Settings2 size={16} className="text-[var(--brand-secondary)]" />}
            title="General Export Settings"
            subtitle="Rule name, validity window and destination."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Rule Name" required hint="Must be unique. e.g. Compliance_Batch_Export">
                <TextControl value={form.ruleName} onChange={update("ruleName")} placeholder="Compliance_Batch_Export" />
              </Field>
              <Field label="Export Destination" required>
                <SelectControl
                  value={form.exportPath}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    exportPath: e.target.value,
                    ...Object.fromEntries(DEST_RESET_KEYS.map((k) => [k, ""])),
                  }))}
                  icon={<DestIcon size={15} />}
                >
                  <option value="">Select Destination</option>
                  {DEST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </SelectControl>
              </Field>
              <Field label="Applicable From" required>
                <TextControl type="datetime-local" value={form.startDateTime} onChange={update("startDateTime")} icon={<CalendarDays size={15} />} max={currentDateTimeStr} />
              </Field>
              <Field label="To (End Date & Time)" hint="Leave blank for ongoing.">
                <TextControl type="datetime-local" value={form.toDateTime} onChange={update("toDateTime")} icon={<CalendarDays size={15} />} max={currentDateTimeStr} />
              </Field>

              {/*
              <Field label="Metadata File Frequency" required>
                <SelectControl value={form.scheduleType} onChange={update("scheduleType")}>
                  <option value="DAILY">Daily</option>
                  <option value="HOURLY">Hourly</option>
                </SelectControl>
              </Field>

              {form.scheduleType === "HOURLY" && (
                <Field label="Hourly Interval" required hint="1 to 48 hours allowed.">
                  <TextControl
                    type="number"
                    value={form.hourlyInterval}
                    onChange={update("hourlyInterval")}
                    placeholder="e.g. 2"
                    min="1"
                    max="48"
                  />
                </Field>
              )}
              */}

              {/* ── Custom Filename Pattern — metadata multi-select ── */}
              <MetadataColumnMultiPicker
                label="Custom Filename Pattern"
                value={form.fileName}
                onChange={(val) => setForm(p => ({ ...p, fileName: val }))}
                hint="Select metadata columns to build the filename (comma-separated)."
                placeholder="Select column(s)…"
                disabled={isViewMode}
              />

              <div className="flex items-center w-full">
                <Toggle
                  checked={form.ruleEnabled}
                  onChange={(v) => setForm((p) => ({ ...p, ruleEnabled: v }))}
                  disabled={form.ruleEnabled === true || isViewMode}
                  label="Rule Enabled"
                  hint={form.ruleEnabled ? "Rule is active and cannot be manually disabled. It will disable automatically upon completion." : "Click to activate this rule."}
                />
              </div>

              <DestFields form={form} setForm={setForm} update={update} isEdit={isEdit} />
            </div>
          </Section>

          {/* ── Interaction Criteria ── */}
          <Section
            icon={<Settings2 size={16} className="text-[var(--brand-secondary)]" />}
            title="Interaction Criteria"
            subtitle="Select instance and filter which interactions to export."
          >
            <InteractionCriteriaFields
              form={form}
              setForm={setForm}
              update={update}
              setStatus={setStatus}
            />
          </Section>

          {/* ── CDR ── */}
          <Section
            icon={<FileText size={16} className="text-[var(--brand-secondary)]" />}
            title="Data Metadata"
            subtitle="Choose whether to export CDR alongside interactions."
          >
            <div className="flex flex-col gap-3.5">
              <Toggle
                checked={form.enableCDR}
                onChange={(v) => setForm((p) => ({
                  ...p,
                  enableCDR: v,
                  ...(v ? {} : { cdrFormat: "csv", cdrFileName: "", exportMetadataColumn: "" }),
                }))}
                disabled={isViewMode}
                label="Enable CDR File Export"
                hint="Exports Call Detail Record alongside interactions."
              />
              {form.enableCDR && (
                <div className="rounded-xl border border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-input-bg)_55%,transparent)] p-3.5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="CDR Format">
                      <SelectControl value={form.cdrFormat} onChange={update("cdrFormat")}>
                        <option value="csv">CSV</option>
                        <option value="xml">XML</option>
                      </SelectControl>
                    </Field>
                    {/* ── CDR Filename — metadata multi-select ── */}
                    <MetadataColumnMultiPicker
                      label="CDR Filename"
                      value={form.cdrFileName}
                      onChange={(val) => setForm(p => ({ ...p, cdrFileName: val }))}
                      hint="Select metadata columns for the CDR filename."
                      placeholder="Select column(s)…"
                      disabled={isViewMode}
                    />
                    {/* ── Export Metadata Column — metadata multi-select ── */}
                    <MetadataColumnMultiPicker
                      label="Export Metadata Column"
                      value={form.exportMetadataColumn}
                      onChange={(val) => setForm(p => ({ ...p, exportMetadataColumn: val }))}
                      hint="Select metadata columns to export in metadata output."
                      placeholder="Select column(s)…"
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>
        </fieldset>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--brand-input-border)] mt-2">
          <button
            type="button" onClick={onCancel} disabled={saving}
            className="px-5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-sm font-semibold text-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
          >
            {isViewMode ? "Close" : "Cancel"}
          </button>
          {!isViewMode && (
            <button
              type="submit" disabled={saving}
              className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-lg border-none text-sm font-semibold text-white bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] transition-opacity ${saving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : isEdit
                  ? <><Edit2 size={13} /> Update Configuration</>
                  : <><Download size={13} /> Save Configuration</>}
            </button>
          )}
        </div>
      </form>

      {limitModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-[var(--brand-input-border)] rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4 shrink-0">
              <Info size={24} />
            </div>
            <h3 className="text-base font-bold text-foreground text-center mb-2">Export Limit Exceeded</h3>
            <p className="text-xs text-muted-foreground text-center mb-5 leading-relaxed">
              The configured filters match too many calls (<strong className="text-red-500 font-bold">{limitModalCount}</strong>). The maximum export limit is <strong className="text-foreground">{MAX_EXPORT_LIMIT}</strong>. Please narrow down your search criteria.
            </p>
            <button
              type="button"
              onClick={() => setLimitModalOpen(false)}
              className="w-full py-2 rounded-lg border-none text-xs font-semibold text-white bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] cursor-pointer hover:opacity-90 transition-opacity"
            >
              Modify Search Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRemainingTime(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }
  return `Expires in ${minutes}m`;
}

// ─── Root Page ────────────────────────────────────────────────────────────────
export default function ExporterPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [view, setView] = useState("list");
  const [isViewMode, setIsViewMode] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [saving, setSaving] = useState(false);
  const [privileges, setPrivileges] = useState([]);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalCount, setLimitModalCount] = useState(0);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [exportResult, setExportResult] = useState(null);



  const abortRef = useRef({});
  const searchTimer = useRef(null);

  const safeReadJson = useCallback(async (res) => {
    try { return await res.json(); }
    catch {
      try { const text = await res.text(); return { success: false, message: text || "Invalid server response." }; }
      catch { return { success: false, message: "Invalid server response." }; }
    }
  }, []);

  // ── fetchDDL ────────────────────────────────────────────────────────────────
  const fetchDDL = useCallback(async (key, url, onOk, onErr) => {
    abortRef.current[key]?.abort();
    abortRef.current[key] = new AbortController();
    try {
      const res = await fetch(url, { headers: makeHeaders(), cache: "no-store", signal: abortRef.current[key].signal });
      const json = await safeReadJson(res);
      if (!res.ok || json?.success === false) throw new Error(json?.message || `Failed to fetch ${key}`);
      onOk(json);
    } catch (e) {
      if (e.name !== "AbortError") onErr(e.message);
    }
  }, [safeReadJson]);

  // ── loadConfigs ─────────────────────────────────────────────────────────────
  const loadConfigs = useCallback((page, size, search) => {
    const pg = page ?? pageNumber;
    const sz = size ?? pageSize;
    const q = search ?? appliedSearch;
    setConfigsLoading(true);
    setConfigsError(null);
    const qs = new URLSearchParams({ pageNumber: pg, pageSize: sz });
    if (q) qs.set("search", q);
    fetchDDL(
      "configs",
      `/api/workFlow/getExportConfigurations?${qs}`,
      (json) => { setConfigs(Array.isArray(json.data) ? json.data : []); setPagination(json.pagination ?? null); setConfigsLoading(false); },
      (msg) => { setConfigsError(msg); setConfigsLoading(false); },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDDL]);

  // ── on mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const user = (() => {
          try {
            const enc = sessionStorage.getItem("user");
            if (!enc) return null;
            const bytes = CryptoJS.AES.decrypt(enc, "");
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          } catch { return null; }
        })();
        const res = await fetch("/api/privileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: user?.userId ?? null,
            moduleId: 13,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
        });
        const data = await res.json();
        setPrivileges(data.privileges || []);
      } catch (err) {
        console.error(err);
      } finally {
        setPrivilegesLoaded(true);
      }
    };
    fetchPrivileges();
    loadConfigs(1, 10, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => Object.values(abortRef.current).forEach((c) => c.abort());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "list") loadConfigs(pageNumber, pageSize, appliedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize]);

  // search
  const handleSearchInput = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setAppliedSearch(val);
      setPageNumber(1);
      loadConfigs(1, pageSize, val);
    }, 300);
  }, [pageSize, loadConfigs]);

  const clearSearch = useCallback(() => {
    clearTimeout(searchTimer.current);
    setSearchQuery(""); setAppliedSearch("");
    setPageNumber(1);
    loadConfigs(1, pageSize, "");
  }, [pageSize, loadConfigs]);

  // form helpers 
  const update = useCallback((key) => (evOrVal) => {
    setForm((p) => ({ ...p, [key]: evOrVal?.target !== undefined ? evOrVal.target.value : evOrVal }));
    setStatus({ type: "idle", message: "" });
  }, []);

  const openAdd = useCallback(() => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setStatus({ type: "idle", message: "" });
    setIsViewMode(false);
    setView("form");
  }, []);

  const toIdOrNull = useCallback((raw) => {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, []);

  const goBack = useCallback(() => {
    setView("list");
    setEditingId(null);
    setIsViewMode(false);
    setStatus({ type: "idle", message: "" });
  }, []);

  const openEdit = useCallback((row) => {
    const mappingsRaw = row?.orgAgentMappings || row?.OrgAgentMappings || [];
    const mappingsArr = Array.isArray(mappingsRaw) ? mappingsRaw : [];

    const normalizedMappings = mappingsArr
      .map((m) => ({
        orgId: Number(m?.orgId ?? m?.OrgId ?? m?.OrganizationId ?? 0),
        agentId: m?.agentId == null ? null : Number(m?.agentId ?? m?.AgentId ?? m?.userId ?? 0),
      }))
      .filter((m) => Number.isFinite(m.orgId) && m.orgId > 0);

    const orgIds = [...new Set(normalizedMappings.map((m) => m.orgId))];
    const agentIds = [...new Set(normalizedMappings.map((m) => m.agentId).filter((a) => Number.isFinite(a) && a > 0))];

    const id = toIdOrNull(r(row, "Id") ?? r(row, "ID") ?? r(row, "ExportConfigId"));

    setForm({
      ...INITIAL_FORM,
      id,
      platformId: String(r(row, "PlatformId")),
      ruleName: r(row, "RuleName"),
      instanceId: String(r(row, "InstanceId")),
      instanceName: r(row, "InstanceName"),
      startDateTime: toFDT(r(row, "StartDateTime")),
      toDateTime: toFDT(r(row, "ToDateTime")),
      exportPath: r(row, "ExportPath"),
      // fileName & cdrFileName — stored as comma-separated string, picker splits it back
      fileName: r(row, "FileName"),
      ruleEnabled: !!(r(row, "RuleEnabled") ?? true),
      organizationId: idOrEmpty(r(row, "OrganizationId")),
      organizationLabel: r(row, "OrganizationLabel"),
      organizationIds: orgIds.length ? orgIds : idOrEmpty(r(row, "OrganizationId")) ? [idOrEmpty(r(row, "OrganizationId"))] : [],
      agentId: String(r(row, "AgentId") || ""),
      agentName: r(row, "AgentName") || "",
      agentLogin: r(row, "AgentLogin") || "",
      agentIds: agentIds.length ? agentIds : r(row, "AgentId") ? [Number(r(row, "AgentId"))] : [],
      orgAgentMappings: normalizedMappings,
      // dest (secrets blank — user re-enters to change)
      s3FileFormat: r(row, "S3FileFormat"), s3BucketRegion: r(row, "S3BucketRegion"),
      s3BucketName: r(row, "S3BucketName"), s3AccessKey: r(row, "S3AccessKey"),
      s3SecretKey: "", s3StorageClass: r(row, "S3StorageClass"),
      sftpServerName: r(row, "SftpServerName"), sftpBaseFolder: r(row, "SftpBaseFolder"),
      sftpUserId: r(row, "SftpUserId"), sftpPassword: "", sftpSshKey: "",
      gcpBucket: r(row, "GcpBucket"), gcpProjectId: r(row, "GcpProjectId"), gcpServiceKey: "",
      azureAccount: r(row, "AzureAccount"), azureContainer: r(row, "AzureContainer"), azureConnection: "",
      destDirectory: r(row, "DestDirectory"),
      enableCDR: !!(r(row, "EnableCDR")),
      cdrFormat: r(row, "CdrFormat") || "csv",
      cdrFileName: r(row, "CdrFileName"),
      exportMetadataColumn:
        r(row, "ExportMetadataColumn")
        || r(row, "ExportMetaDataColumn")
        || r(row, "Export_Metadata_Column")
        || r(row, "ExportMetadataColumns")
        || "",
      ani: r(row, "Ani"), dnis: r(row, "Dnis"),
      extType: r(row, "ExtType") || "",
      extInput: r(row, "ExtInput"), extStart: r(row, "ExtStart"), extEnd: r(row, "ExtEnd"),
      durationOp: r(row, "DurationOp") || "",
      durationValue: String(r(row, "DurationValue") || ""),
      durationValueMax: String(r(row, "DurationValueMax") || ""),
      customField: r(row, "CustomField") || "none",
      customValue: r(row, "CustomValue"),
      scheduleType: r(row, "ScheduleType") || "DAILY",
    });
    setEditingId(id);
    setStatus({ type: "idle", message: "" });
    setIsViewMode(true);
    setView("form");

    // If the listing SP doesn't return ExportMetadataColumn, fetch it by id so edit view can prefill.
    const existingVal =
      r(row, "ExportMetadataColumn")
      || r(row, "ExportMetaDataColumn")
      || r(row, "Export_Metadata_Column")
      || r(row, "ExportMetadataColumns");
    if (!existingVal && id) {
      fetch(`/api/workFlow/getExportConfigurationById?id=${id}`, { headers: makeHeaders() })
        .then((res) => res.ok ? res.json() : null)
        .then((json) => {
          const v = json?.data?.ExportMetadataColumn ?? json?.data?.exportMetadataColumn;
          if (v) setForm((p) => ({ ...p, exportMetadataColumn: v }));
        })
        .catch(() => { });
    }
  }, [toIdOrNull]);

  // ── validation ───────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!String(form.ruleName ?? "").trim()) return "Rule Name is required.";
    if (!form.instanceId) return "Instance Name is required.";
    if (!form.startDateTime) return "Applicable From is required.";
    if (!form.exportPath) return "Export Destination is required.";
    if (form.toDateTime && form.toDateTime < form.startDateTime)
      return "End date must be after start date.";

    const localNow = new Date();
    const year = localNow.getFullYear();
    const month = String(localNow.getMonth() + 1).padStart(2, "0");
    const day = String(localNow.getDate()).padStart(2, "0");
    const hours = String(localNow.getHours()).padStart(2, "0");
    const minutes = String(localNow.getMinutes()).padStart(2, "0");
    const currentDateTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;

    if (form.startDateTime && form.startDateTime > currentDateTimeStr) {
      return "Start date cannot be in the future.";
    }

    if (form.toDateTime && form.toDateTime > currentDateTimeStr) {
      return "End date cannot be in the future.";
    }

    // Prevent duplicate Rule Name per Instance on client side (server/DB also enforces).
    const currentId = toIdOrNull(editingId ?? form.id);
    const instId = Number(form.instanceId);
    const ruleNorm = String(form.ruleName ?? "").trim().toLowerCase();
    if (ruleNorm && instId && Array.isArray(configs) && configs.length) {
      const dup = configs.some((row) => {
        const rowId = toIdOrNull(r(row, "Id"));
        const rowInst = Number(r(row, "InstanceId"));
        const rowRule = String(r(row, "RuleName") ?? "").trim().toLowerCase();
        return rowInst === instId && rowRule === ruleNorm && rowId !== currentId;
      });
      if (dup) {
        return "A configuration with this Rule Name already exists for the selected Instance. Please use a different name.";
      }
    }

    // Prevent creating another rule with the exact same configuration (even with a different name).
    // This is a UI guard; DB can still enforce if needed.
    const scheduleType = String(form.scheduleType || "DAILY").toUpperCase();
    const intervalInMinutes = scheduleType === "HOURLY"
      ? Math.max(60, Number(form.hourlyInterval || 1) * 60)
      : 1440;

    const norm = (v) => (String(v ?? "").trim() || "").toLowerCase();
    const normOrNull = (v) => {
      const s = String(v ?? "").trim();
      return s.length ? s : null;
    };

    const candidate = {
      PlatformId: Number(form.platformId),
      InstanceId: Number(form.instanceId),
      ExportPath: String(form.exportPath || "").toUpperCase(),
      StartDateTime: normOrNull(form.startDateTime),
      ToDateTime: normOrNull(form.toDateTime),
      FileName: normOrNull(form.fileName),
      RuleEnabled: !!form.ruleEnabled,
      ScheduleType: scheduleType,
      IntervalInMinutes: intervalInMinutes,
      // Dest fields
      S3BucketName: normOrNull(form.s3BucketName),
      S3SecretKey: normOrNull(form.s3SecretKey),
      S3StorageClass: normOrNull(form.s3StorageClass),
      S3FileFormat: normOrNull(form.s3FileFormat),
      SftpServerName: normOrNull(form.sftpServerName),
      SftpBaseFolder: normOrNull(form.sftpBaseFolder),
      SftpUserId: normOrNull(form.sftpUserId),
      SftpPassword: normOrNull(form.sftpPassword),
      SftpSshKey: normOrNull(form.sftpSshKey),
      GcpBucket: normOrNull(form.gcpBucket),
      GcpProjectId: normOrNull(form.gcpProjectId),
      GcpServiceKey: normOrNull(form.gcpServiceKey),
      AzureAccount: normOrNull(form.azureAccount),
      AzureContainer: normOrNull(form.azureContainer),
      AzureConnection: normOrNull(form.azureConnection),
      DestDirectory: normOrNull(form.destDirectory),
      // CDR
      EnableCDR: !!form.enableCDR,
      CdrFormat: normOrNull(form.cdrFormat || "csv"),
      CdrFileName: normOrNull(form.cdrFileName),
      ExportMetadataColumn: normOrNull(normalizeCommaList(form.exportMetadataColumn)),
      // Criteria
      Ani: normOrNull(normalizeCommaList(form.ani)),
      Dnis: normOrNull(normalizeCommaList(form.dnis)),
      ExtType: normOrNull(form.extType),
      ExtInput: normOrNull(normalizeCommaList(form.extInput)),
      ExtStart: normOrNull(form.extStart),
      ExtEnd: normOrNull(form.extEnd),
      DurationOp: normOrNull(form.durationOp),
      DurationValue: normOrNull(form.durationValue),
      DurationValueMax: normOrNull(form.durationValueMax),
      CustomField: normOrNull(form.customField !== "none" ? form.customField : null),
      CustomValue: normOrNull(normalizeCommaList(form.customValue)),
    };

    if (Array.isArray(configs) && configs.length) {
      const sameConfigExists = configs.some((row) => {
        const rowId = toIdOrNull(r(row, "Id"));
        if (rowId === currentId) return false;
        const rowObj = {
          PlatformId: Number(r(row, "PlatformId")),
          InstanceId: Number(r(row, "InstanceId")),
          ExportPath: String(r(row, "ExportPath") || "").toUpperCase(),
          StartDateTime: normOrNull(r(row, "StartDateTime")),
          ToDateTime: normOrNull(r(row, "ToDateTime")),
          FileName: normOrNull(r(row, "FileName")),
          RuleEnabled: !!r(row, "RuleEnabled"),
          ScheduleType: String(r(row, "ScheduleType") || "DAILY").toUpperCase(),
          IntervalInMinutes: Number(r(row, "IntervalInMinutes")) || Number(r(row, "IntervalMinutes")) || 0,
          S3BucketName: normOrNull(r(row, "S3BucketName")),
          S3SecretKey: null, // do not compare secrets from list payload
          S3StorageClass: normOrNull(r(row, "S3StorageClass")),
          S3FileFormat: normOrNull(r(row, "S3FileFormat")),
          SftpServerName: normOrNull(r(row, "SftpServerName")),
          SftpBaseFolder: normOrNull(r(row, "SftpBaseFolder")),
          SftpUserId: normOrNull(r(row, "SftpUserId")),
          SftpPassword: null, // do not compare secrets
          SftpSshKey: null,   // do not compare secrets
          GcpBucket: normOrNull(r(row, "GcpBucket")),
          GcpProjectId: normOrNull(r(row, "GcpProjectId")),
          GcpServiceKey: null, // do not compare secrets
          AzureAccount: normOrNull(r(row, "AzureAccount")),
          AzureContainer: normOrNull(r(row, "AzureContainer")),
          AzureConnection: null, // do not compare secrets
          DestDirectory: normOrNull(r(row, "DestDirectory")),
          EnableCDR: !!r(row, "EnableCDR"),
          CdrFormat: normOrNull(r(row, "CdrFormat")),
          CdrFileName: normOrNull(r(row, "CdrFileName")),
          ExportMetadataColumn: normOrNull(
            r(row, "ExportMetadataColumn")
            || r(row, "ExportMetaDataColumn")
            || r(row, "Export_Metadata_Column")
            || r(row, "ExportMetadataColumns"),
          ),
          Ani: normOrNull(r(row, "Ani")),
          Dnis: normOrNull(r(row, "Dnis")),
          ExtType: normOrNull(r(row, "ExtType")),
          ExtInput: normOrNull(r(row, "ExtInput")),
          ExtStart: normOrNull(r(row, "ExtStart")),
          ExtEnd: normOrNull(r(row, "ExtEnd")),
          DurationOp: normOrNull(r(row, "DurationOp")),
          DurationValue: normOrNull(r(row, "DurationValue")),
          DurationValueMax: normOrNull(r(row, "DurationValueMax")),
          CustomField: normOrNull(r(row, "CustomField")),
          CustomValue: normOrNull(r(row, "CustomValue")),
        };

        for (const k of Object.keys(candidate)) {
          if (k === "S3SecretKey" || k === "SftpPassword" || k === "SftpSshKey" || k === "GcpServiceKey" || k === "AzureConnection")
            continue; // skip secrets comparison
          const a = candidate[k];
          const b = rowObj[k];
          if (typeof a === "string" && typeof b === "string") {
            if (norm(a) !== norm(b)) return false;
          } else if (a !== b) {
            return false;
          }
        }
        return true;
      });

      if (sameConfigExists) {
        return "This exact export configuration already exists. Please change at least one setting (or edit the existing rule).";
      }
    }
    const ch = form.exportPath.toUpperCase();
    if (ch === "S3" && (!form.s3BucketName || !form.s3AccessKey || (!editingId && !form.s3SecretKey)))
      return "All S3 fields are required.";
    return null;
  }, [form, editingId, configs, toIdOrNull]);

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (saving) return;
    const err = validate();
    if (err) { setStatus({ type: "error", message: err }); return; }
    setSaving(true);
    setStatus({ type: "idle", message: "" });

    try {
      const editId = toIdOrNull(editingId ?? form.id);
      const isEdit = !!editId;
      const orgAgentMappings = buildOrgAgentMappings(form);

      const payload = {
        ...(isEdit && { id: editId }),
        platformId: Number(form.platformId),
        ruleName: form.ruleName.trim(),
        instanceId: Number(form.instanceId),
        instanceName: form.instanceName || null,
        startDateTime: form.startDateTime,
        toDateTime: form.toDateTime || null,
        exportPath: form.exportPath,
        // fileName & cdrFileName — comma-separated string from multi-picker, saved as-is
        fileName: form.fileName || null,
        ruleEnabled: form.ruleEnabled,
        orgAgentMappings,
        // dest
        s3FileFormat: form.s3FileFormat || null,
        s3BucketRegion: form.s3BucketRegion || null,
        s3BucketName: form.s3BucketName || null,
        s3AccessKey: form.s3AccessKey || null,
        s3SecretKey: form.s3SecretKey || null,
        s3StorageClass: form.s3StorageClass || null,
        sftpServerName: form.sftpServerName || null,
        sftpBaseFolder: form.sftpBaseFolder || null,
        sftpUserId: form.sftpUserId || null,
        sftpPassword: form.sftpPassword || null,
        sftpSshKey: form.sftpSshKey || null,
        gcpBucket: form.gcpBucket || null,
        gcpProjectId: form.gcpProjectId || null,
        gcpServiceKey: form.gcpServiceKey || null,
        azureAccount: form.azureAccount || null,
        azureContainer: form.azureContainer || null,
        azureConnection: form.azureConnection || null,
        destDirectory: form.destDirectory || null,
        enableCDR: form.enableCDR,
        cdrFormat: form.cdrFormat,
        cdrFileName: form.cdrFileName || null,
        exportMetadataColumn: form.enableCDR ? (normalizeCommaList(form.exportMetadataColumn) || null) : null,
        ani: form.ani || null,
        dnis: form.dnis || null,
        extType: form.extType || null,
        // extInput — free text: alphanumeric like "hopkinsm_voice1" or numeric like "1001"
        // multiple type: comma-separated like "1001,1002,hopkinsm_voice1"
        extInput: form.extInput || null,
        extStart: form.extStart || null,
        extEnd: form.extEnd || null,
        durationOp: form.durationOp || null,
        durationValue: form.durationValue ? Number(form.durationValue) : null,
        durationValueMax: form.durationValueMax ? Number(form.durationValueMax) : null,
        customField: form.customField !== "none" ? form.customField : null,
        // allow comma-separated match values; normalize whitespace & empty segments
        customValue: normalizeCommaList(form.customValue) || null,
        scheduleType: form.scheduleType || "DAILY",
        hourlyInterval: form.scheduleType === "HOURLY" ? Number(form.hourlyInterval) : null,
      };

      // Check candidate count before save/update
      const countRes = await fetch("/api/workFlow/checkExportCandidatesCount", {
        method: "POST",
        headers: makeHeaders(),
        body: JSON.stringify(payload),
      });
      const countJson = await safeReadJson(countRes);
      if (countJson?.success) {
        const callCount = Number(countJson.count || 0);
        if (callCount > MAX_EXPORT_LIMIT) {
          setLimitModalCount(callCount);
          setLimitModalOpen(true);
          setSaving(false);
          return;
        }
      }

      const res = await fetch(
        isEdit ? "/api/workFlow/updateExportConfiguration" : "/api/workFlow/saveExportConfiguration",
        { method: isEdit ? "PUT" : "POST", headers: makeHeaders(), body: JSON.stringify(payload) },
      );
      const json = await safeReadJson(res);

      if ((res.status === 200 || res.status === 201) && json?.success) {
        const msg = json.message || "Saved successfully.";
        setStatus({
          type: "success",
          message: msg,
        });
        window.dispatchEvent(new Event("notifications:update"));

        loadConfigs(1, pageSize, appliedSearch);
        setTimeout(goBack, 1500);
      } else {
        // Prefer server-provided message; ensure we show something helpful for duplicate conflicts.
        const msg = json?.message
          || (res.status === 409
            ? "Duplicate export rule/configuration detected. Please change at least one setting (or edit the existing rule)."
            : null)
          || `Failed to save (HTTP ${res.status || "?"}).`;
        throw new Error(msg);
      }
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editingId, validate, loadConfigs, goBack, pageSize, appliedSearch, safeReadJson, toIdOrNull]);

  // ── guards ───────────────────────────────────────────────────────────────────
  if (!privilegesLoaded) return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
      <Loader2 size={16} className="animate-spin" /> Loading
    </div>
  );
  if (!privileges.some((p) => p.PrivilegeId === 31)) return notFound();

  // ── Form view ────────────────────────────────────────────────────────────────
  if (view === "form") return (
    <FormPage
      form={form} setForm={setForm} update={update}
      onSubmit={handleSubmit} onCancel={goBack}
      saving={saving} status={status} setStatus={setStatus}
      isEdit={editingId !== null}
      limitModalOpen={limitModalOpen}
      setLimitModalOpen={setLimitModalOpen}
      limitModalCount={limitModalCount}
      isViewMode={isViewMode}
    />
  );

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">

      {/* Page header */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-5 py-3.5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
              <Download size={17} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="m-0 text-sm font-bold text-foreground">Export Configurations</p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Manage rules to export interactions to S3 or Local Drive.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            


            <button
              onClick={() => loadConfigs(pageNumber, pageSize, appliedSearch)}
              disabled={configsLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-xs font-semibold text-muted-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={configsLoading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-none text-sm font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] shadow-[0_2px_10px_rgba(26,58,110,0.25)] hover:opacity-90 transition-opacity"
            >
              <Plus size={14} /> Add Config
            </button>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 180px)" }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 px-5 py-3 border-b border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-[var(--brand-primary)]" />
            <span className="text-[13px] font-bold text-foreground">All Configurations</span>
            {!configsLoading && pagination && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary)]">
                {pagination?.totalRecords || configs.length}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none" />
            <input
              type="text" value={searchQuery} onChange={handleSearchInput}
              placeholder="Search rule name, instance"
              className="h-8 pl-8 pr-8 w-60 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch}
                className="absolute right-2 flex text-[var(--brand-placeholder)] bg-transparent border-none cursor-pointer p-0 hover:text-foreground transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {configsError ? (
          <div className="flex items-center justify-center gap-2 p-5 text-[var(--brand-error-text)] text-[13px]">
            <Info size={14} /> {configsError}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full border-collapse text-[13px] table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[color-mix(in_srgb,var(--brand-primary)_5%,hsl(var(--background)))]">
                    {TABLE_COLS.map((col) => (
                      <th key={col.key}
                        className={`${col.w} px-4 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase text-[var(--brand-primary)] whitespace-nowrap border-b border-[var(--brand-input-border)]`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configsLoading ? (
                    Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                      <SkeletonRow key={i} cols={TABLE_COLS.length} />
                    ))
                  ) : configs.length === 0 ? (
                    <tr>
                      <td colSpan={TABLE_COLS.length} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2.5">
                          {appliedSearch ? (
                            <>
                              <Search size={32} className="opacity-20" />
                              <p className="m-0 text-sm font-semibold">{`No results for "${appliedSearch}"`}</p>
                              <button onClick={clearSearch} className="text-xs text-[var(--brand-primary)] bg-transparent border-none cursor-pointer underline">Clear search</button>
                            </>
                          ) : (
                            <>
                              <Download size={32} className="opacity-20" />
                              <p className="m-0 text-sm font-semibold">No export configurations yet</p>
                              <button onClick={openAdd}
                                className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg border-none text-xs font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)]">
                                <Plus size={13} /> Add Config
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    configs.map((row, idx) => (
                      <tr key={r(row, "Id") ?? idx}
                        className="border-b border-[var(--brand-input-border)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--brand-primary)_3%,transparent)]">
                        <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">
                          {pagination ? (pageNumber - 1) * pageSize + idx + 1 : idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{r(row, "RuleName") || ""}</td>
                        <td className="px-4 py-3"><DestBadge path={r(row, "ExportPath")} /></td>
                        <td className="px-4 py-3 text-xs">
                          {r(row, "InstanceName")
                            ? <span className="text-foreground font-medium">{r(row, "InstanceName")}</span>
                            : <span className="text-muted-foreground font-mono">ID: {r(row, "InstanceId") || ""}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r(row, "StartDateTime"))}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r(row, "ToDateTime"))}</td>
                        <td className="px-4 py-3">
                          {r(row, "EnableCDR")
                            ? <span className="text-[11px] font-semibold text-emerald-500">Yes</span>
                            : <span className="text-[11px] text-muted-foreground">No</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge enabled={!!r(row, "RuleEnabled")} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(r(row, "CreatedDate"))}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)] text-[var(--brand-primary)] text-[11px] font-semibold cursor-pointer hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] transition-colors">
                            <Eye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!configsLoading && pagination && (
              <div className="mt-auto border-t border-[var(--brand-input-border)]">
                <Pagination
                  pagination={pagination} pageSize={pageSize}
                  onPage={(p) => setPageNumber(p)}
                  onSize={(s) => { setPageSize(s); setPageNumber(1); }}
                  dataLength={configs.length}
                />
              </div>
            )}
          </>
        )}
    </div>
    </div>
  );
}
