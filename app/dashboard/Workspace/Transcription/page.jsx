"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Edit2,
  Info,
  Layers,
  Loader2,
  Mic2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Cpu,
  X,
} from "lucide-react";
import {
  Field,
  Section,
  SelectControl,
  TextControl,
  Toggle,
} from "@/components/workspace/rule-ui";
import InteractionCriteriaFields from "@/components/workspace/interaction-criteria";
import CryptoJS from "crypto-js";
import { notFound } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { label: "High", value: "high" },
  { label: "Above Normal", value: "above_normal" },
  { label: "Normal", value: "normal" },
  { label: "Below Normal", value: "below_normal" },
  { label: "Low", value: "low" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TABLE_COLS = [
  { key: "#", label: "#", w: "w-12" },
  { key: "RuleName", label: "Rule Name", w: "w-44" },
  { key: "TranscriptionEngine", label: "Transcription Engine", w: "w-36" },
  { key: "InstanceName", label: "Instance", w: "w-28" },
  { key: "ProcessingPriority", label: "Priority", w: "w-28" },
  { key: "StartDateTime", label: "From (Interactions)", w: "w-28" },
  { key: "RuleIsEnabled", label: "Status", w: "w-24" },
  { key: "actions", label: "Actions", w: "w-20" },
];

const INITIAL_FORM = {
  RuleId: null,
  ruleName: "",
  platformId: "",
  instanceId: "",
  instanceName: "",
  transcriptionEngine: "",
  startDateTime: "",
  processingPriority: "normal",
  ruleEnabled: true,
  organizationId: "",
  organizationLabel: "",
  agentId: "",
  agentName: "",
  agentLogin: "",
  organizationIds: [],
  agentIds: [],
  orgAgentMappings: [],
  // interaction criteria
  ani: "",
  dnis: "",
  extType: "",
  extInput: "",
  extStart: "",
  extEnd: "",
  durationOp: "",
  durationValue: "",
  durationValueMax: "",
  customField: "none",
  customValue: "",
};

const PRIORITY_META = {
  high: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  above_normal: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  normal: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  below_normal: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  low: {
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getLoggedInUserId = () => {
  try {
    const enc =
      typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    if (!enc) return "1";
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const userString = bytes.toString(CryptoJS.enc.Utf8);
    if (!userString) return "1";
    const user = JSON.parse(userString);
    return String(user?.userId ?? user?.UserId ?? user?.id ?? "1");
  } catch (err) {
    console.warn("Auth decryption failed in page.jsx:", err.message);
    return "1";
  }
};

const makeHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  loggedInUserId: getLoggedInUserId(),
  orgIds: getSelectedOrgIdsHeader(),
});

const fmtDate = (v) => {
  try {
    const d = new Date(v);
    return isNaN(d)
      ? "—"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  } catch {
    return "—";
  }
};

const toFDT = (v) => {
  try {
    const d = new Date(v);
    return isNaN(d) ? "" : d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const getPriorityLabel = (v) =>
  PRIORITY_OPTIONS.find((o) => o.value === String(v || "").toLowerCase())
    ?.label ??
  v ??
  "—";

// ─── getUserId (reads & decrypts user from session) ───────────────────────────
const getUserId = () => {
  try {
    const enc =
      typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const userString = bytes.toString(CryptoJS.enc.Utf8);
    if (!userString) return null;
    const user = JSON.parse(userString);
    return user?.userId ?? user?.UserId ?? user?.id ?? null;
  } catch (err) {
    console.warn("getUserId decryption failed:", err.message);
    return null;
  }
};

// ─── Build orgAgentMappings JSON (same logic as export page) ──────────────────
// SP expects: [{"orgId":1,"agentId":10}] or [{"orgId":1,"agentId":null}]
// agentId: null  → all agents of that org
// agentId: N     → only that specific agent
const buildOrgAgentMappings = (form) => {
  if (Array.isArray(form.orgAgentMappings) && form.orgAgentMappings.length) {
    return JSON.stringify(form.orgAgentMappings);
  }

  const hasOrgMulti = Array.isArray(form.organizationIds);
  const hasAgentMulti = Array.isArray(form.agentIds);

  const orgIds = (
    hasOrgMulti && form.organizationIds.length
      ? form.organizationIds
      : !hasOrgMulti && form.organizationId
        ? [form.organizationId]
        : []
  )
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!orgIds.length) return null;

  const agentIds = (
    hasAgentMulti && form.agentIds.length
      ? form.agentIds
      : !hasAgentMulti && form.agentId
        ? [form.agentId]
        : []
  )
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!agentIds.length)
    return JSON.stringify(orgIds.map((orgId) => ({ orgId, agentId: null })));

  const mappings = [];
  orgIds.forEach((orgId) =>
    agentIds.forEach((agentId) => mappings.push({ orgId, agentId })),
  );
  return JSON.stringify(mappings);
};

// ─── Small UI ─────────────────────────────────────────────────────────────────

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
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${enabled ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" : "text-red-400 bg-red-400/10 border-red-400/30"}`}
    >
      {enabled ? (
        <>
          <ToggleRight size={12} />
          Active
        </>
      ) : (
        <>
          <ToggleLeft size={12} />
          Inactive
        </>
      )}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const key = String(priority || "").toLowerCase();
  const m = PRIORITY_META[key] ?? {
    color: "text-gray-500",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.color} ${m.bg} ${m.border}`}
    >
      {getPriorityLabel(priority)}
    </span>
  );
}

function EngineBadge({ name }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] border-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)]">
      <Cpu size={10} />
      {name || "—"}
    </span>
  );
}

// ─── Pagination (client-side) ─────────────────────────────────────────────────

function Pagination({ totalItems, pageSize, pageNumber, onPage, onSize }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasPrev = pageNumber > 1;
  const hasNext = pageNumber < totalPages;

  const pages = useMemo(() => {
    if (totalPages <= 0) return [];
    const set = new Set(
      [1, totalPages, pageNumber - 1, pageNumber, pageNumber + 1].filter(
        (p) => p >= 1 && p <= totalPages,
      ),
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
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--brand-input-border)] bg-card text-foreground text-xs font-semibold transition-all duration-150 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none"
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_2%,transparent)] gap-3">
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Showing{" "}
          <strong className="text-foreground font-semibold">
            {start}–{end}
          </strong>{" "}
          of{" "}
          <strong className="text-foreground font-semibold">
            {totalItems}
          </strong>
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            Per page
          </span>
          <select
            value={pageSize}
            onChange={(e) => onSize(Number(e.target.value))}
            aria-label="Records per page"
            className="h-7 pl-2 pr-6 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs font-semibold text-foreground cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2010%2010%22%3E%3Cpath%20d%3D%22M2%203.5l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 hover:border-[var(--brand-primary)] transition-colors"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <nav
          className="flex items-center gap-1 shrink-0 ml-auto"
          aria-label="Pagination"
        >
          <NavBtn
            onClick={() => onPage(1)}
            disabled={!hasPrev}
            label="First page"
          >
            <ChevronsLeft size={13} />
          </NavBtn>
          <NavBtn
            onClick={() => onPage(pageNumber - 1)}
            disabled={!hasPrev}
            label="Previous page"
          >
            <ChevronLeft size={13} />
          </NavBtn>
          <div className="flex items-center gap-1 mx-0.5">
            {pages.map((p) =>
              String(p).startsWith("dot") ? (
                <span
                  key={p}
                  className="w-7 h-8 flex items-center justify-center text-xs text-muted-foreground font-semibold select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === pageNumber ? "page" : undefined}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 ${
                    p === pageNumber
                      ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_2px_6px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)] cursor-default pointer-events-none"
                      : "bg-card border-[var(--brand-input-border)] text-foreground hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] active:scale-95 cursor-pointer"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <NavBtn
            onClick={() => onPage(pageNumber + 1)}
            disabled={!hasNext}
            label="Next page"
          >
            <ChevronRight size={13} />
          </NavBtn>
          <NavBtn
            onClick={() => onPage(totalPages)}
            disabled={!hasNext}
            label="Last page"
          >
            <ChevronsRight size={13} />
          </NavBtn>
        </nav>
      )}
    </div>
  );
}

// ─── Form Page ────────────────────────────────────────────────────────────────

function FormPage({
  form,
  setForm,
  update,
  onSubmit,
  onCancel,
  saving,
  status,
  setStatus,
  providers,
  providersLoading,
  isEdit,
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">
      {/* Header */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] text-xs font-semibold text-muted-foreground bg-transparent cursor-pointer hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
          >
            <ChevronLeft size={13} /> Back
          </button>
          <div className="w-px h-6 bg-[var(--brand-input-border)]" />
          <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
            {isEdit ? (
              <Edit2 size={14} className="text-[var(--brand-primary)]" />
            ) : (
              <Plus size={14} className="text-[var(--brand-primary)]" />
            )}
          </div>
          <div>
            <p className="m-0 text-sm font-bold text-foreground">
              {isEdit ? "Edit Transcription Rule" : "Add Transcription Rule"}
            </p>
            <p className="m-0 text-[11px] text-muted-foreground mt-px">
              {isEdit
                ? "Update the existing transcription rule."
                : "Create a new rule to transcribe interactions using configurable engines and priorities."}
            </p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {status.type !== "idle" && (
        <div
          className={`flex items-start gap-2.5 mb-3 rounded-xl px-3.5 py-2.5 text-xs border ${
            status.type === "success"
              ? "border-[color-mix(in_srgb,var(--brand-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--brand-secondary)_8%,transparent)] text-[var(--brand-secondary)]"
              : "border-[var(--brand-error-border)] bg-[var(--brand-error-bg)] text-[var(--brand-error-text)]"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 size={14} className="mt-px shrink-0" />
          ) : (
            <Info size={14} className="mt-px shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* General Settings */}
        <Section
          icon={
            <Settings2 size={16} className="text-[var(--brand-secondary)]" />
          }
          title="General Transcription Settings"
          subtitle="Rule name, transcription engine, and validity window."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Rule Name"
              required
              hint="e.g. Compliance_Transcription_Rule"
            >
              <TextControl
                value={form.ruleName}
                onChange={update("ruleName")}
                placeholder="Compliance_Transcription_Rule"
              />
            </Field>

            <Field
              label="Transcription Engine"
              required
              hint={
                providersLoading
                  ? "Loading engines…"
                  : `${providers.length} engine(s) available`
              }
            >
              <SelectControl
                value={form.transcriptionEngine}
                onChange={update("transcriptionEngine")}
                disabled={providersLoading || !providers.length}
                icon={<Cpu size={15} />}
              >
                <option value="">
                  {providersLoading ? "Loading…" : "— Select Engine —"}
                </option>
                {providers.map((p) => (
                  <option key={p.Id ?? p.id} value={p.Id ?? p.id}>
                    {p.Provider_name ?? p.providerName ?? p.name ?? "Unnamed"}
                  </option>
                ))}
              </SelectControl>
            </Field>

            <Field
              label="Processing Priority"
              hint="Determines queue priority for transcription jobs."
            >
              <SelectControl
                value={form.processingPriority}
                onChange={update("processingPriority")}
                icon={<Layers size={15} />}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectControl>
            </Field>

            <Field
              label="Applicable From"
              required
              hint="Only interactions recorded on or after this date will be transcribed by this rule."
            >
              <TextControl
                type="datetime-local"
                value={form.startDateTime}
                onChange={update("startDateTime")}
                icon={<CalendarDays size={15} />}
              />
            </Field>

            <div className="flex items-center">
              <Toggle
                checked={form.ruleEnabled}
                onChange={(v) => setForm((p) => ({ ...p, ruleEnabled: v }))}
                label="Rule Enabled"
                hint="Disable to keep saved but inactive."
              />
            </div>
          </div>
        </Section>

        {/* Interaction Criteria */}
        <Section
          icon={
            <Settings2 size={16} className="text-[var(--brand-secondary)]" />
          }
          title="Interaction Criteria"
          subtitle="Select instance and filter which interactions should be transcribed."
        >
          <InteractionCriteriaFields
            form={form}
            setForm={setForm}
            update={update}
            setStatus={setStatus}
          />
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--brand-input-border)] mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-sm font-semibold text-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-6 py-2 rounded-lg border-none text-sm font-semibold text-white bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] transition-opacity ${saving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Saving…
              </>
            ) : isEdit ? (
              <>
                <Edit2 size={13} /> Update Rule
              </>
            ) : (
              <>
                <Mic2 size={13} /> Save Rule
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function TranscriptionPage() {
  const [view, setView] = useState("list");

  const [allConfigs, setAllConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);

  const abortRef = useRef({});
  const searchTimer = useRef(null);

  // ── Fetch helper ─────────────────────────────────────────────────────────────
  const fetchDDL = useCallback(async (key, url, onOk, onErr) => {
    abortRef.current[key]?.abort();
    abortRef.current[key] = new AbortController();
    try {
      const res = await fetch(url, {
        headers: makeHeaders(),
        cache: "no-store",
        signal: abortRef.current[key].signal,
      });
      const json = await res.json();
      if (!res.ok || json?.success === false)
        throw new Error(json?.message || `Failed to fetch ${key}`);
      onOk(json);
    } catch (e) {
      if (e.name !== "AbortError") onErr(e.message);
    }
  }, []);

  // ── Load all rules ────────────────────────────────────────────────────────────
  const loadConfigs = useCallback(() => {
    setConfigsLoading(true);
    setConfigsError(null);
    const orgId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("selectedOrgId")
        : null;
    const url = orgId
      ? `/api/workFlow/getTranscriptionRules?organizationId=${orgId}`
      : "/api/workFlow/getTranscriptionRules";

    fetchDDL(
      "configs",
      url,
      (json) => {
        setAllConfigs(Array.isArray(json.data) ? json.data : []);
        setConfigsLoading(false);
      },
      (msg) => {
        setConfigsError(msg);
        setConfigsLoading(false);
      },
    );
  }, [fetchDDL]);

  // ── On mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const user = (() => {
          try {
            const enc = sessionStorage.getItem("user");
            if (!enc) return null;
            const bytes = CryptoJS.AES.decrypt(enc, "");
            const userString = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(userString);
          } catch {
            return null;
          }
        })();

        const orgId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("selectedOrgId")
            : "";
        const res = await fetch("/api/privileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            moduleId: "13",
            orgId: orgId || "",
          },
        });
        const data = await res.json();

        const privs = data.privileges || [];
        const roles = Array.isArray(user?.userRoles) ? user.userRoles : [];
        const isSuper = !!(
          user?.isSuperAdmin ||
          user?.IsSuperAdmin ||
          roles.some((r) => String(r.roleId ?? r.RoleId) === "1")
        );

        if (isSuper && privs.length === 0) {
          // Super admins should always have access to Transcription (30)
          setPrivileges([
            { PrivilegeId: 30 },
            { PrivilegeId: 11 },
            { PrivilegeId: 29 },
          ]);
        } else {
          setPrivileges(privs);
        }
      } catch (err) {
        console.error("Failed to fetch privileges:", err.message);
      } finally {
        setPrivilegesLoaded(true);
      }
    };

    fetchPrivileges();
    loadConfigs();
    fetchDDL(
      "providers",
      "/api/integrationWorkspace/Transcription/STTEngineDDL",
      (json) => {
        setProviders(Array.isArray(json.providerList) ? json.providerList : []);
        setProvidersLoading(false);
      },
      () => setProvidersLoading(false),
    );

    return () => Object.values(abortRef.current).forEach((c) => c.abort());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Client-side search filter ─────────────────────────────────────────────────
  const filteredConfigs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allConfigs;
    return allConfigs.filter((row) => {
      const ruleName = String(row.RuleName ?? row.ruleName ?? "").toLowerCase();
      const engine = String(row.TranscriptionEngine ?? "").toLowerCase();
      const instance = String(
        row.InstanceName ?? row.instanceName ?? "",
      ).toLowerCase();
      return ruleName.includes(q) || engine.includes(q) || instance.includes(q);
    });
  }, [allConfigs, searchQuery]);

  // ── Client-side pagination slice ──────────────────────────────────────────────
  const pagedConfigs = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredConfigs.slice(start, start + pageSize);
  }, [filteredConfigs, pageNumber, pageSize]);

  // ── Search ────────────────────────────────────────────────────────────────────
  const handleSearchInput = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPageNumber(1);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setPageNumber(1);
  }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const update = useCallback(
    (key) => (evOrVal) => {
      setForm((p) => ({
        ...p,
        [key]: evOrVal?.target !== undefined ? evOrVal.target.value : evOrVal,
      }));
      setStatus({ type: "idle", message: "" });
    },
    [],
  );

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

  // ── Open edit ─────────────────────────────────────────────────────────────────
  const openEdit = useCallback(
    (row) => {
      const mappingsRaw = row?.orgAgentMappings || row?.OrgAgentMappings || [];
      const mappingsArr = Array.isArray(mappingsRaw) ? mappingsRaw : [];

      const normalizedMappings = mappingsArr
        .map((m) => ({
          orgId: Number(m?.orgId ?? m?.OrgId ?? m?.OrganizationId ?? 0),
          orgName: m?.orgName ?? m?.org_name ?? m?.OrganizationName ?? "",
          agentId:
            m?.agentId == null
              ? null
              : Number(m?.agentId ?? m?.AgentId ?? m?.userId ?? 0),
          agentName: m?.agentName ?? m?.AgentName ?? "",
        }))
        .filter((m) => Number.isFinite(m.orgId) && m.orgId > 0);

      const orgIds = [...new Set(normalizedMappings.map((m) => m.orgId))];
      const agentIds = [
        ...new Set(
          normalizedMappings
            .map((m) => m.agentId)
            .filter((a) => Number.isFinite(a) && a > 0),
        ),
      ];

      const matchedProvider = providers.find(
        (p) =>
          (p.Provider_name ?? p.providerName ?? p.name ?? "") ===
          row.TranscriptionEngine,
      );
      const resolvedEngineId = String(
        matchedProvider?.Id ?? matchedProvider?.id ?? "",
      );
      setForm({
        ...INITIAL_FORM,
        id: row.RuleId,
        ruleName: row.RuleName ?? row.ruleName ?? "",
        instanceId: String(row.InstanceId ?? row.instanceId ?? ""),
        instanceName: String(row.InstanceName ?? row.instanceName ?? ""),
        platformId: String(row.PlatformId ?? row.platformId ?? ""), // ✅ add this
        transcriptionEngine: resolvedEngineId,
        startDateTime: toFDT(row.StartDateTime ?? row.startDateTime),
        processingPriority:
          row.ProcessingPriority ?? row.processingPriority ?? "normal",
        ruleEnabled: !!(row.RuleIsEnabled ?? row.ruleEnabled ?? true),
        organizationId: row.OrgID ?? row.organizationId ?? "",
        organizationLabel: row.OrganizationLabel ?? row.organizationLabel ?? "",
        organizationIds: orgIds.length
          ? orgIds
          : (row.OrgID ?? row.organizationId)
            ? [Number(row.OrgID ?? row.organizationId)]
            : [],
        agentId: String(row.AgentId ?? row.agentId ?? ""),
        agentName: row.AgentName ?? row.agentName ?? "",
        agentLogin: row.AgentLogin ?? row.agentLogin ?? "",
        agentIds: agentIds.length
          ? agentIds
          : (row.AgentId ?? row.agentId)
            ? [Number(row.AgentId ?? row.agentId)]
            : [],
        orgAgentMappings: normalizedMappings,
        ani: row.ANI ?? row.ani ?? "",
        dnis: row.DNIS ?? row.dnis ?? "",
        extType: row.ExtensionType ?? row.extType ?? "",
        extInput: row.ExtensionValue ?? row.extInput ?? "",
        extStart: row.ExtensionStart ?? row.extStart ?? "",
        extEnd: row.ExtensionEnd ?? row.extEnd ?? "",
        durationOp: row.DurationOperator ?? row.durationOp ?? "",
        durationValue: String(row.DurationValue ?? row.durationValue ?? ""),
        durationValueMax: String(
          row.DurationValueMax ?? row.durationValueMax ?? "",
        ),
        customField: row.CustomField ?? row.customField ?? "none",
        customValue: row.CustomValue ?? row.customValue ?? "",
      });
      setEditingId(row.RuleId);
      setStatus({ type: "idle", message: "" });
      setView("form");
    },
    [providers],
  );

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!String(form.ruleName ?? "").trim()) return "Rule Name is required.";
    if (!form.instanceId) return "Instance Name is required.";
    if (!form.transcriptionEngine) return "Transcription Engine is required.";
    if (!form.startDateTime) return "Applicable From is required.";
    return null;
  }, [form]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const err = validate();
      if (err) {
        setStatus({ type: "error", message: err });
        return;
      }
      setSaving(true);
      try {
        // ✅ Restore createdBy — read from encrypted session, same as original code
        const userId = getUserId();
        if (!userId) {
          setStatus({
            type: "error",
            message: "Session expired. Please log in again.",
          });
          setSaving(false);
          return;
        }

        const isEdit = editingId !== null;
        const orgAgentMappings = buildOrgAgentMappings(form);

        const payload = {
          ...(isEdit && { id: editingId }),
          ruleName: form.ruleName.trim(),
          instanceId: Number(form.instanceId),
          instanceName: form.instanceName || null,
          transcriptionEngine: form.transcriptionEngine,
          startDateTime: form.startDateTime,
          processingPriority: form.processingPriority,
          ruleEnabled: form.ruleEnabled,
          orgAgentMappings,
          ani: form.ani || null,
          dnis: form.dnis || null,
          extType: form.extType || null,
          extInput: form.extInput || null,
          extStart: form.extStart || null,
          extEnd: form.extEnd || null,
          durationOp: form.durationOp || null,
          durationValue: form.durationValue ? Number(form.durationValue) : null,
          durationValueMax: form.durationValueMax
            ? Number(form.durationValueMax)
            : null,
          customField: form.customField !== "none" ? form.customField : null,
          customValue: form.customValue || null,
          createdBy: userId, // ✅ restored — passed to SP as @CreatedBy
        };

        const res = await fetch(
          isEdit
            ? "/api/workFlow/updateTranscriptionRule"
            : "/api/workFlow/SaveTranscriptionRule",
          {
            method: isEdit ? "PUT" : "POST",
            headers: makeHeaders(),
            body: JSON.stringify(payload),
          },
        );
        const json = await res.json();

        if (res.ok && json?.success) {
          setStatus({
            type: "success",
            message: json.message || "Saved successfully.",
          });
          loadConfigs();
          setTimeout(goBack, 1500);
        } else {
          throw new Error(
            json?.message || `Failed to save (HTTP ${res.status || "?"}).`,
          );
        }
      } catch (e) {
        setStatus({ type: "error", message: e.message });
      } finally {
        setSaving(false);
      }
    },
    [form, editingId, validate, loadConfigs, goBack],
  );

  // ── Engine name resolver ──────────────────────────────────────────────────────
  const getEngineName = useCallback(
    (engineId) => {
      if (!engineId) return "—";
      const p = providers.find(
        (p) => String(p.Id ?? p.id) === String(engineId),
      );
      return p
        ? (p.Provider_name ?? p.providerName ?? String(engineId))
        : String(engineId);
    },
    [providers],
  );

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!privilegesLoaded)
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );

  const hasAccess = privileges.some((p) =>
    [30, 11, 29].includes(p.PrivilegeId),
  );
  if (!hasAccess) return notFound();

  // ── Form view ─────────────────────────────────────────────────────────────────
  if (view === "form")
    return (
      <FormPage
        form={form}
        setForm={setForm}
        update={update}
        onSubmit={handleSubmit}
        onCancel={goBack}
        saving={saving}
        status={status}
        setStatus={setStatus}
        providers={providers}
        providersLoading={providersLoading}
        isEdit={editingId !== null}
      />
    );

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-2 sm:px-2 sm:py-3">
      {/* Page header */}
      <div className="rounded-2xl border border-[var(--brand-input-border)] bg-card shadow-sm px-5 py-3.5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] flex items-center justify-center shrink-0">
              <Mic2 size={17} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="m-0 text-sm font-bold text-foreground">
                Transcription Rules
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Manage rules to transcribe interactions using configurable
                engines and priorities.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadConfigs}
              disabled={configsLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-xs font-semibold text-muted-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={configsLoading ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-none text-sm font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)] shadow-[0_2px_10px_rgba(26,58,110,0.25)] hover:opacity-90 transition-opacity"
            >
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
            <span className="text-[13px] font-bold text-foreground">
              All Rules
            </span>
            {!configsLoading && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary)]">
                {filteredConfigs.length}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-2.5 text-[var(--brand-placeholder)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="Search rule name, engine, instance…"
              className="h-8 pl-8 pr-8 w-60 rounded-lg border border-[var(--brand-input-border)] bg-card text-xs text-foreground outline-none transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 flex text-[var(--brand-placeholder)] bg-transparent border-none cursor-pointer p-0 hover:text-foreground transition-colors"
              >
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]">
                    {TABLE_COLS.map((col) => (
                      <th
                        key={col.key}
                        className={`${col.w} px-4 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase text-[var(--brand-primary)] whitespace-nowrap border-b border-[var(--brand-input-border)]`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configsLoading ? (
                    Array.from({ length: Math.min(pageSize, 5) }).map(
                      (_, i) => (
                        <SkeletonRow key={i} cols={TABLE_COLS.length} />
                      ),
                    )
                  ) : pagedConfigs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={TABLE_COLS.length}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2.5">
                          {searchQuery ? (
                            <>
                              <Search size={32} className="opacity-20" />
                              <p className="m-0 text-sm font-semibold">{`No results for "${searchQuery}"`}</p>
                              <button
                                onClick={clearSearch}
                                className="text-xs text-[var(--brand-primary)] bg-transparent border-none cursor-pointer underline"
                              >
                                Clear search
                              </button>
                            </>
                          ) : (
                            <>
                              <Mic2 size={32} className="opacity-20" />
                              <p className="m-0 text-sm font-semibold">
                                No transcription rules yet
                              </p>
                              <button
                                onClick={openAdd}
                                className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg border-none text-xs font-semibold text-white cursor-pointer bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-navy-deep)]"
                              >
                                <Plus size={13} /> Add Rule
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedConfigs.map((row, idx) => (
                      <tr
                        key={row.RuleId ?? idx}
                        className="border-b border-[var(--brand-input-border)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--brand-primary)_3%,transparent)]"
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs font-semibold">
                          {(pageNumber - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {row.RuleName ?? row.ruleName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <EngineBadge
                            name={
                              row.TranscriptionEngine ??
                              row.transcriptionEngine ??
                              "—"
                            }
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground text-xs">
                          {row.InstanceName ?? row.instanceName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge
                            priority={
                              row.ProcessingPriority ?? row.processingPriority
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {fmtDate(row.StartDateTime ?? row.startDateTime)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            enabled={!!(row.RuleIsEnabled ?? row.ruleIsEnabled)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--brand-input-border)] bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)] text-[var(--brand-primary)] text-[11px] font-semibold cursor-pointer hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] transition-colors"
                          >
                            <Edit2 size={11} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!configsLoading && filteredConfigs.length > 0 && (
              <Pagination
                totalItems={filteredConfigs.length}
                pageSize={pageSize}
                pageNumber={pageNumber}
                onPage={(p) => setPageNumber(p)}
                onSize={(s) => {
                  setPageSize(s);
                  setPageNumber(1);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
