"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { MODULES, PRIVILEGES } from "@/lib/constants/privileges";
import DefaultPlatformPage from "./Addworkspace/page";
import Platform13Page from "./platform/components/Platform13Page";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// Constants
const STATUS_CFG = {
  Connected: {
    dot: "#22c55e",
    text: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    pulse: true,
  },
  Degraded: {
    dot: "#f59e0b",
    text: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    pulse: false,
  },
  Offline: {
    dot: "#94a3b8",
    text: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
    pulse: false,
  },
};

const COLOR_PALETTE = [
  { color: "var(--brand-primary)", bg: "#eff6ff" },
  { color: "#0f172a", bg: "#f1f5f9" },
  { color: "#0369a1", bg: "#f0f9ff" },
];

const platformManageRegistry = { 13: Platform13Page };

function parseUserFromSession() {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getLoggedInUserId() {
  const user = parseUserFromSession();
  const userId = user?.userId ?? user?.UserId ?? user?.id ?? null;
  const asNumber = Number(userId);
  return Number.isFinite(asNumber) && asNumber > 0 ? String(asNumber) : "1";
}

function useIntegrationAccess() {
  // null = still checking, true = allowed, false = denied
  const [accessState, setAccessState] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;
    let finished = false;

    async function check() {
      try {
        if (finished) return;
        const user = parseUserFromSession();
        if (!user) {
          router.replace("/not-found");
          return;
        }

        const userId = user?.userId ?? user?.UserId ?? user?.id ?? null;
        const orgId = sessionStorage.getItem("selectedOrgId") || "";
        // Org is required for org-scoped permission checks; wait until it is available.
        if (!orgId) {
          if (!cancelled) setAccessState(null);
          return;
        }

        const res = await fetch("/api/moduleswithPrivileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: String(userId),
            moduleId: String(MODULES.INTEGRATION), // 11
            orgId,
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });

        const data = await res.json();

        // Must have at least VIEW (1) and NOT be restricted to NONE (11) only
        const privList = data?.PrivilegeList ?? [];
        const hasView = privList.some(
          (p) => Number(p.PrivilegeId) === PRIVILEGES.VIEW,
        );
        const noneOnly =
          privList.length > 0 &&
          privList.every((p) => Number(p.PrivilegeId) === PRIVILEGES.NONE);

        const allowed = res.ok && hasView && !noneOnly;

        if (cancelled) return;
        if (!allowed) {
          finished = true;
          if (intervalId) clearInterval(intervalId);
          router.replace("/not-found");
        } else {
          finished = true;
          if (intervalId) clearInterval(intervalId);
          setAccessState(true);
        }
      } catch {
        if (!cancelled) {
          finished = true;
          if (intervalId) clearInterval(intervalId);
          router.replace("/not-found");
        }
      }
    }

    // Check immediately, and also re-check once orgId becomes available.
    check();
    intervalId = setInterval(() => {
      if (cancelled) return;
      const orgIdNow = sessionStorage.getItem("selectedOrgId") || "";
      if (orgIdNow) check();
    }, 600);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return accessState;
}

function buildAuthHeader(token) {
  return token ? `Bearer ${token}` : "";
}

function hashString(str) {
  const s = String(str ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildSourceMeta(source) {
  const s = source ?? "";
  const p = COLOR_PALETTE[hashString(s) % COLOR_PALETTE.length];
  return {
    color: p.color,
    bg: p.bg,
    icon: s.substring(0, 2).toUpperCase() || "??",
  };
}

// Navigate helper
function navigateToPlatformConfig(
  router,
  platformId,
  mode = "add",
  editId = null,
  returnFilter = null,
) {
  const id = Number(platformId);
  if (id === 1) {
    let url = `/dashboard/integrationWorkspace/Addworkspace?platformId=1&mode=${mode}`;
    if (mode === "edit" && editId) url += `&id=${editId}`;
    router.push(url);
  } else if (id === 13) {
    let url = `/dashboard/integrationWorkspace/platform/13?mode=${mode}`;
    if (mode === "edit" && editId) url += `&id=${editId}`;
    if (returnFilter)
      url += `&returnFilter=${encodeURIComponent(returnFilter)}`;
    router.push(url);
  } else {
    router.push(`/dashboard/integrationWorkspace/platform/${platformId}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  A) PLATFORM CARD  (individual card in the cards grid)
// ═══════════════════════════════════════════════════════════════════════════════
function PlatformCard({
  platform,
  meta,
  isSelected,
  onClick,
  configCount = 0,
}) {
  const status = platform.Status || null;
  const sc = STATUS_CFG[status] || STATUS_CFG.Connected;
  const title = platform.PlatformName || platform.source || "Platform";
  const sub = platform.Source || platform.source || "Integration";

  const isEmpty = configCount === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative text-left w-full h-full rounded-xl flex flex-col transition-all duration-200 overflow-hidden bg-white",
        /* ── border: always visible, stronger when selected ── */
        isSelected && !isEmpty
          ? "border-2 border-[var(--brand-primary)] shadow-[0_6px_20px_rgba(26,118,209,0.18)]"
          : isEmpty
            ? "border border-[#e8eef5] opacity-70 cursor-default"
            : "border border-[#dce5f0] hover:border-[#93c5fd] hover:shadow-[0_6px_18px_rgba(26,118,209,0.10)] hover:-translate-y-[1px] cursor-pointer",
      ].join(" ")}
    >
      {/* ── CARD HEADER ─────────────────────────────────────────────────────── */}
      {/* Distinct header zone with bg + bottom border so it reads as a header */}
      <div
        className={[
          "flex items-center justify-between gap-2 px-4 py-3 border-b",
          isSelected && !isEmpty
            ? "bg-[#eff6ff] border-[#bfdbfe]"
            : "bg-[#f8fafc] border-[#e8eef5]",
        ].join(" ")}
      >
        {/* avatar + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={[
              "w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-[12px] flex-shrink-0 border",
              isSelected && !isEmpty
                ? "border-[#bfdbfe] shadow-[0_2px_8px_rgba(26,118,209,0.18)]"
                : "border-[#dce5f0]",
            ].join(" ")}
            style={{ background: meta.bg, color: meta.color }}
          >
            {(platform.Initials || title).substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p
              className={`text-[13px] font-bold leading-snug truncate ${isSelected && !isEmpty
                ? "text-[var(--brand-secondary)]"
                : isEmpty
                  ? "text-[#64748b]"
                  : "text-[#0f172a]"
                }`}
            >
              {title}
            </p>
            <p className="text-[11px] text-[#94a3b8] truncate">{sub}</p>
          </div>
        </div>
      </div>

      {/* ── CARD BODY ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 flex-1">
        {/* configs count */}
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#94a3b8] mb-0.5">
            Configs
          </p>
          <p
            className={`text-[18px] font-extrabold leading-none ${isEmpty
              ? "text-[#cbd5e1]"
              : isSelected
                ? "text-[var(--brand-primary)]"
                : "text-[#0f172a]"
              }`}
          >
            {configCount}
          </p>
        </div>

        {/* arrow */}
        <div
          className={[
            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
            isSelected && !isEmpty
              ? "bg-[var(--brand-primary)] text-white"
              : isEmpty
                ? "bg-[#f1f5f9] text-[#e2e8f0]"
                : "bg-[#f1f5f9] text-[#94a3b8] group-hover:bg-[#dbeafe] group-hover:text-[var(--brand-primary)]",
          ].join(" ")}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M5 3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Disabled hover overlay */}
      {isEmpty && (
        <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
          <div className="bg-white/95 rounded-lg px-3 py-1.5 shadow-lg border border-[#e2e8f0]">
            <p className="text-[10px] font-semibold text-[#94a3b8] flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M6 3v3l2 1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              Click to add configuration
            </p>
          </div>
        </div>
      )}
    </button>
  );
}

function ConnectivityDot({ baseUrl }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const url = String(baseUrl || "").trim();
    if (!url) {
      setStatus("invalid");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setStatus("invalid");
      return;
    }

    // Deduplicate ping calls in dev (StrictMode) + keep a short cache.
    // Key = url string, value = { ts, status } (status: online/offline/invalid)
    // Also keep inflight promises so multiple dots don't spam the server.
    const root = typeof window !== "undefined" ? window : null;
    const cache = root?.__simcoomPingCache || (root ? (root.__simcoomPingCache = new Map()) : null);
    const inflight = root?.__simcoomPingInflight || (root ? (root.__simcoomPingInflight = new Map()) : null);

    const cached = cache?.get(url);
    const now = Date.now();
    if (cached && now - cached.ts < 30_000) {
      setStatus(cached.status || "offline");
      return;
    }

    setStatus("checking");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const key = url;
    const doFetch = () =>
      fetch(`/api/integrationWorkspace/Simcoom-recorder/ping?url=${encodeURIComponent(url)}`, {
        headers: { authorization: buildAuthHeader(process.env.NEXT_PUBLIC_API_TOKEN) },
        signal: controller.signal,
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((j) => {
          const next = j?.data?.status || "offline";
          cache?.set(key, { ts: Date.now(), status: next });
          return next;
        });

    const p =
      inflight?.get(key) ||
      doFetch().finally(() => {
        inflight?.delete(key);
      });
    inflight?.set(key, p);

    p.then((next) => setStatus(next)).catch(() => setStatus("offline"));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [baseUrl]);

  const cfg = {
    checking: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "Checking...", pulse: true },
    online: { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "Online", pulse: true },
    offline: { color: "#ef4444", bg: "#fff1f2", border: "#fecdd3", label: "Offline", pulse: false },
    invalid: { color: "#ef4444", bg: "#fff1f2", border: "#fecdd3", label: "Invalid URL", pulse: false },
  }[status] || {};

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  B) CONFIGURATIONS TABLE
// ═══════════════════════════════════════════════════════════════════════════════
function ConfigurationsTable({ platformId, platformName, onEdit, onAdd }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [savingPairing, setSavingPairing] = useState({});
  const pageSize = 8;
  const isVerint = Number(platformId) === 13;
  const isAmazonConnect = Number(platformId) === 4;
  const isCisco = Number(platformId) === 1;
  const isNice = Number(platformId) === 2;
  const isSimcommRecorder =
    Number(platformId) === 14 || Number(platformId) === 6;

  const getCellValue = (row, key) => {
    if (!row || !key) return "";
    const direct = row?.[key];
    if (direct !== undefined && direct !== null) return direct;
    const target = String(key).toLowerCase();
    for (const [k, v] of Object.entries(row)) {
      if (String(k).toLowerCase() === target) return v;
    }
    return "";
  };
  useEffect(() => {
    if (!platformId) return;
    let ignore = false;
    const controller = new AbortController();
    setLoad(true);
    setRows([]);
    setPage(1);
    setSearch("");
    (async () => {
      try {
        let next = [];
        if (Number(platformId) === 14 || Number(platformId) === 6) {
          const r = await fetch(
            `/api/integrationWorkspace/Simcoom-recorder?platformId=${Number(platformId)}`,
            {
              headers: {
                authorization: buildAuthHeader(process.env.NEXT_PUBLIC_API_TOKEN),
              },
              signal: controller.signal,
            },
          );
          const j = await r.json();
          next = Array.isArray(j.data) ? j.data : [];
        } else if (Number(platformId) === 1) {
          const r = await fetch(
            `/api/workspace/configuration?platformid=${Number(platformId)}`,
            { signal: controller.signal },
          );
          const j = await r.json();
          const raw = Array.isArray(j.rows) ? j.rows : [];
          next = raw;
        } else if (Number(platformId) === 2) {
          const r = await fetch(
            `/api/integrationWorkspace/Nicein-connect/configurations?platformid=${Number(platformId)}`,
            {
              headers: {
                authorization: buildAuthHeader(
                  process.env.NEXT_PUBLIC_API_TOKEN,
                ),
                loggedInUserId: getLoggedInUserId(),
              },
              signal: controller.signal,
            },
          );
          const j = await r.json();
          next = Array.isArray(j.data) ? j.data : [];
        } else if (Number(platformId) === 4) {
          const r = await fetch(
            "/api/integrationWorkspace/amazon-connect/configurations?platformid=4",
            {
              headers: {
                authorization: buildAuthHeader(
                  process.env.NEXT_PUBLIC_API_TOKEN,
                ),
                loggedInUserId: getLoggedInUserId(),
              },
              signal: controller.signal,
            },
          );
          const j = await r.json();
          next = Array.isArray(j.data) ? j.data : [];
        } else if (Number(platformId) === 13) {
          const r = await fetch(
            "/api/integrationWorkspace/verint/configurations",
            {
              headers: {
                authorization: buildAuthHeader(
                  process.env.NEXT_PUBLIC_API_TOKEN,
                ),
                loggedInUserId: getLoggedInUserId(),
              },
              signal: controller.signal,
            },
          );
          const j = await r.json();
          next = Array.isArray(j.data) ? j.data : [];
        }
        if (!ignore) {
          const withPlatformName = (next || []).map((r) => ({
            ...r,
            platformName:
              platformName ||
              r?.platformName ||
              r?.PlatformName ||
              r?.platform ||
              r?.platformid ||
              "",
          }));
          setRows(withPlatformName);
        }
      } catch {
        if (!ignore) setRows([]);
      } finally {
        if (!ignore) setLoad(false);
      }
    })();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [platformId, platformName]);

  const columns = isSimcommRecorder
    ? [
      { key: "InstanceName", label: "Recorder Name" },
      { key: "baseUrl", label: "Base URL" },
      { key: "connected", label: "Connected" },
      { key: "pairingMode", label: "Pairing Mode" },
    ]
    : isVerint
      ? [
        { key: "platformName", label: "Platform" },
        { key: "instanceName", label: "Instance" },
        { key: "ruleName", label: "Rule Name" },
        { key: "timeZone", label: "Time Zone" },
      ]
      : isAmazonConnect
        ? [
          { key: "platformName", label: "Platform" },
          { key: "InstanceName", label: "Instance Name" },
          { key: "sourceregionendpoint", label: "Region Endpoint" },
          { key: "sourcebucketname", label: "Bucket" },
          { key: "timezone", label: "Time Zone" },
        ]
        : isNice
          ? [
            { key: "platformName", label: "Platform" },
            { key: "InstanceName", label: "Instance Name" },
            { key: "org_id", label: "Organization" },
            //{ key: "sourcebucketname", label: "Bucket" },
            { key: "timezone", label: "Time Zone" },
          ]
          : isCisco
            ? [
              { key: "platformName", label: "Platform" },
              ...(rows[0]
                ? Object.keys(rows[0])
                  .filter((k) => {
                    const lk = k.toLowerCase();
                    return ![
                      "appid",
                      "password",
                      "token",
                      "secret",
                      "id",
                      "rules_id",
                      "ruleid",
                      "platformid",
                      "platformname",
                      "platform",
                    ].includes(lk);
                  })
                  .slice(0, 5)
                  .map((k) => ({ key: k, label: k.replace(/_/g, " ") }))
                : []),
            ]
            : rows[0]
              ? Object.keys(rows[0])
                .filter((k) => {
                  const lk = k.toLowerCase();
                  return ![
                    "appid",
                    "password",
                    "token",
                    "secret",
                    "id",
                    "rules_id",
                    "ruleid",
                    "platformid",
                  ].includes(lk);
                })
                .slice(0, 5)
                .map((k) => ({ key: k, label: k.replace(/_/g, " ") }))
              : [];

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return columns.some((c) =>
      String(getCellValue(r, c.key) ?? "")
        .toLowerCase()
        .includes(q),
    );
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, totalPages);
  const startIdx = (safe - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

  const coerceBool = (raw) => {
    if (raw === true) return true;
    if (raw === false) return false;
    if (raw === 1 || raw === 0) return Boolean(raw);
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return false;
    if (["1", "true", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "off"].includes(s)) return false;
    const n = Number(raw);
    if (Number.isFinite(n)) return Boolean(n);
    return false;
  };

  const updatePairingMode = async (row, nextChecked) => {
    const appid = row?.appid ?? row?.AppId ?? row?.appId ?? row?.id ?? row?.Id ?? null;
    if (!appid) return;

    // Optimistic UI update
    const prevRowsSnapshot = rows;
    setRows((prev) =>
      prev.map((r) => {
        const rid = r?.appid ?? r?.AppId ?? r?.appId ?? r?.id ?? r?.Id ?? null;
        if (String(rid) !== String(appid)) return r;
        return { ...r, pairingMode: Boolean(nextChecked) };
      }),
    );

    try {
      setSavingPairing((p) => ({ ...p, [String(appid)]: true }));
      const payload = {
        baseUrl: String(getCellValue(row, "baseUrl") ?? "").trim(),
        instanceName: String(getCellValue(row, "instanceName") ?? getCellValue(row, "InstanceName") ?? "").trim(),
        EnablePairingMode: Boolean(nextChecked),
        UpdatedBy: getLoggedInUserId(),
      };

      const res = await fetch(
        `/api/integrationWorkspace/Simcoom-recorder/${encodeURIComponent(String(appid))}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed to update pairing mode");
    } catch (e) {
      // Revert optimistic update on failure
      setRows(prevRowsSnapshot);
      console.error("[Simcoom-recorder pairingMode update] error:", e);
      alert(e?.message || "Failed to update pairing mode");
    } finally {
      setSavingPairing((p) => {
        const next = { ...p };
        delete next[String(appid)];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex gap-3 animate-pulse"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <div className="h-9 bg-[#f1f5f9] rounded-lg w-[5%]" />
            <div className="h-9 bg-[#f1f5f9] rounded-lg w-[25%]" />
            <div className="h-9 bg-[#f1f5f9] rounded-lg w-[20%]" />
            <div className="h-9 bg-[#f1f5f9] rounded-lg w-[20%]" />
            <div className="h-9 bg-[#f1f5f9] rounded-lg flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center py-14 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] flex items-center justify-center">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.3"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[14px] font-bold text-[#334155]">
            No configurations yet
          </p>
          <p className="text-[12px] text-[#94a3b8] mt-1">
            Add your first configuration to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-2 flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 focus-within:border-[#93c5fd] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/10 transition-all">
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            className="text-[#94a3b8] flex-shrink-0"
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M9.5 9.5l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search configurations…"
            className="bg-transparent border-none outline-none text-[12px] text-[#334155] placeholder-[#94a3b8] flex-1 min-w-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[#94a3b8] hover:text-[#475569] transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        <span className="text-[11px] font-semibold text-[var(--brand-primary)] bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-3 py-1 whitespace-nowrap">
          {total} {total === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-b from-[#f8fbff] to-[#f1f5f9]">
              <th className="px-5 py-3 text-left w-10 border-b border-[#e8eef5]">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#cbd5e1]">
                  #
                </span>
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b] border-b border-[#e8eef5] whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b] border-b border-[#e8eef5] whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-5 py-10 text-center text-[12px] text-[#94a3b8]"
                >
                  {`No results matching "${search}"`}
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={row.id || row.appid || `r-${startIdx}-${idx}`}
                  className="border-b border-[#f8fafc] hover:bg-[#f7fbff] transition-colors duration-100 group"
                >
                  <td className="px-5 py-3.5 align-middle">
                    <span className="text-[11px] font-bold text-[#e2e8f0]">
                      {startIdx + idx + 1}
                    </span>
                  </td>
                  {columns.map((col, ci) => {
                    const val = String(getCellValue(row, col.key) ?? "");
                    const empty = !val || val === "null" || val === "NULL";


                    if (col.key === "connected") {
                      const baseUrl = String(getCellValue(row, "baseUrl") ?? "").trim();
                      return (
                        <td key={`${idx}-${col.key}`} className="px-4 py-3.5 align-middle">
                          <ConnectivityDot baseUrl={baseUrl} />
                        </td>
                      );
                    }

                    if (col.key === "pairingMode") {
                      const isPaired = coerceBool(val);
                      const appid =
                        row?.appid ?? row?.AppId ?? row?.appId ?? row?.id ?? row?.Id ?? null;
                      const busy = Boolean(savingPairing[String(appid)]);
                      return (
                        <td key={`${idx}-${col.key}`} className="px-4 py-3.5 align-middle">
                          <label className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${isPaired ? "bg-[#eff6ff] border-[#bfdbfe] text-[var(--brand-primary)]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"} ${busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-[#f1f5fd]"}`}>
                            <input
                              type="checkbox"
                              checked={isPaired}
                              disabled={busy}
                              onChange={(e) => updatePairingMode(row, e.target.checked)}
                              className="h-4 w-4 accent-[var(--brand-primary)]"
                            />
                            <span>{isPaired ? "Paired" : "Standalone"}</span>
                          </label>
                        </td>
                      );
                    }
                    const isBaseUrlCol =
                      String(col.key).toLowerCase() === "baseurl" ||
                      String(col.key).toLowerCase() === "base_url";
                    const href = (() => {
                      if (!isBaseUrlCol) return null;
                      const v = val.trim();
                      if (!v) return null;
                      // allow pasting without protocol
                      if (/^https?:\/\//i.test(v)) return v;
                      return `https://${v}`;
                    })();
                    return (
                      <td
                        key={`${idx}-${col.key}`}
                        className="px-4 py-3.5 align-middle"
                      >
                        {empty ? (
                          <span className="text-[#e2e8f0] text-[12px]">—</span>
                        ) : ci === 0 ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
                            <span className="text-[12px] font-bold text-[#0f172a] max-w-[160px] truncate">
                              {val}
                            </span>
                          </span>
                        ) : href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            title={val}
                            className="text-[12px] text-[var(--brand-primary)] max-w-[220px] truncate block hover:underline"
                          >
                            {val}
                          </a>
                        ) : (
                          <span className="text-[12px] text-[#475569] max-w-[160px] truncate block">
                            {val}
                          </span>
                        )}
                      </td>
                    );

                  })}
                  <td className="px-5 py-3.5 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d7e6fb] bg-white text-[11px] font-semibold text-[#185FA5] transition-all duration-150 hover:border-[#bfdbfe] hover:bg-[#eff6ff] hover:text-[var(--brand-primary)]"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M8.5 1.5a1.414 1.414 0 012 2L3.5 10.5 1 11l.5-2.5 7-7z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#f1f5f9] bg-[#fafbfc]">
          <span className="text-[11px] text-[#64748b]">
            Showing{" "}
            <strong className="text-[#334155]">
              {startIdx + 1}–{Math.min(startIdx + pageSize, total)}
            </strong>{" "}
            of <strong className="text-[#334155]">{total}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safe <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] disabled:opacity-30 hover:bg-[#eff6ff] hover:border-[#bfdbfe] hover:text-[var(--brand-primary)] transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7.5 9L4.5 6l3-3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = safe <= 3 ? i + 1 : safe - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all border ${safe === p ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm" : "bg-white text-[#64748b] border-[#e2e8f0] hover:bg-[#eff6ff] hover:text-[var(--brand-primary)] hover:border-[#bfdbfe]"}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safe >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] disabled:opacity-30 hover:bg-[#eff6ff] hover:border-[#bfdbfe] hover:text-[var(--brand-primary)] transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 3L7.5 6l-3 3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  C) SOURCE BLOCK
// ═══════════════════════════════════════════════════════════════════════════════
function SourceBlock({
  source,
  sourceId,
  description,
  meta,
  search,
  mode,
  getConfigurationCount,
  onPlatformClick,
  selectedPlatform,
  onCloseDetail,
  onOpenManage,
}) {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/integrationWorkspace/platformsBySource?sourceId=${sourceId}`,
          {
            headers: {
              authorization: buildAuthHeader(process.env.NEXT_PUBLIC_API_TOKEN),
              loggedInUserId: getLoggedInUserId(),
            },
          },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Ensure `SourceId` is present on each platform. Some API responses omit it,
        // which breaks selection/table visibility logic that relies on SourceId.
        setPlatforms(
          (data.data || []).map((p) => ({
            ...p,
            SourceId: p?.SourceId ?? p?.sourceId ?? sourceId,
          })),
        );
      } catch {
        setPlatforms([]);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    })();
  }, [sourceId]);

  const visiblePlatforms = platforms.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.PlatformName || "").toLowerCase().includes(q) ||
      (p.Source || "").toLowerCase().includes(q)
    );
  });

  const tableVisible =
    selectedPlatform && Number(selectedPlatform.SourceId) === Number(sourceId);
  const hasConfigs = (platform) => (getConfigurationCount?.(platform) || 0) > 0;
  const handlePlatformClick = (platform) => onPlatformClick(platform);

  // ── OVERVIEW mode ────────────────────────────────────────────────────────────
  if (mode === "overview") {
    return (
      <div className="h-full flex flex-col rounded-2xl bg-white border border-[#dce5f0] shadow-[0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden transition-transform hover:-translate-y-[1px]">
        {/* ── OVERVIEW CARD HEADER ── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b border-[#dce5f0]"
          style={{
            background: `linear-gradient(135deg, ${meta.bg} 0%, #ffffff 100%)`,
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold border border-[rgba(0,0,0,0.08)] flex-shrink-0"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-extrabold text-[#0f172a] tracking-[-0.01em]">
              {source}
            </p>
            <p className="text-[11px] font-medium text-[#64748b] truncate">
              {description || "Integration category"}
            </p>
          </div>
          {fetched && (
            <span
              className="text-[10px] font-bold rounded-full px-2.5 py-1 border whitespace-nowrap flex-shrink-0"
              style={{
                color: meta.color,
                background: meta.bg,
                borderColor: meta.color + "33",
              }}
            >
              {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── OVERVIEW PLATFORM LIST ── */}
        <div className="p-3 space-y-1.5 flex-1">
          {loading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-[#f8fafc] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))
          ) : visiblePlatforms.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-1.5 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                  <path d="M9 8l2 2 4-4" />
                </svg>
              </div>
              <p className="text-[12px] font-semibold text-[#334155]">No platforms configured</p>
            </div>
          ) : (
            visiblePlatforms.map((p, i) => {
              const hc = hasConfigs(p);
              const count = getConfigurationCount?.(p) || 0;
              return (
                <div
                  key={p.PlatformId || i}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-default bg-[#fafcff]",
                    hc || Number(sourceId) === 5 ? "border-[#e8eef5]" : "border-[#f1f5f9] opacity-50",
                  ].join(" ")}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-[rgba(0,0,0,0.06)]"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {(p.PlatformName || "??").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[11.5px] font-semibold truncate ${hc || Number(sourceId) === 5 ? "text-[#0f172a]" : "text-[#94a3b8]"}`}
                    >
                      {p.PlatformName}
                    </p>
                    <p
                      className={`text-[10px] truncate ${hc || Number(sourceId) === 5 ? "text-[#64748b]" : "text-[#cbd5e1]"}`}
                    >
                      {p.Source}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {count > 0 ? (
                      <span className="text-[10px] font-bold text-[var(--brand-primary)] bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-1.5 py-0.5">
                        {count}
                      </span>
                    ) : Number(sourceId) !== 5 ? (
                      <span className="text-[9px] font-medium text-[#cbd5e1] bg-[#f8fafc] border border-[#f1f5f9] rounded-full px-1.5 py-0.5">
                        0
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── FILTERED mode ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white border border-[#dce5f0] shadow-[0_6px_20px_rgba(15,23,42,0.07)] overflow-hidden">
      {/* colored top strip */}
      <div className="h-[3px]" style={{ background: meta.color }} />

      {/* ── SOURCE HEADER ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-[#dce5f0]"
        style={{
          background: `linear-gradient(135deg, ${meta.bg} 0%, #ffffff 100%)`,
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold border border-[rgba(0,0,0,0.08)] flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-extrabold text-[#0f172a] tracking-[-0.01em]">
            {source}
          </p>
          <p className="text-[12px] font-medium text-[#64748b]">
            {description || "Integration category"}
          </p>
        </div>
        {fetched && (
          <span
            className="text-[11px] font-semibold rounded-full px-3 py-1 border whitespace-nowrap"
            style={{
              color: meta.color,
              background: meta.bg,
              borderColor: meta.color + "33",
            }}
          >
            {visiblePlatforms.length} platform
            {visiblePlatforms.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── PLATFORM CARDS SECTION ── */}
      <div className="px-5 pt-4 pb-5 bg-[#fafcff]">
        {/* section label */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-[3px] h-4 rounded-full flex-shrink-0"
            style={{ background: meta.color }}
          />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94a3b8]">
            Available Platforms
          </p>
          {tableVisible && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--brand-primary)] bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
              {selectedPlatform.PlatformName} selected
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-[#f1f5f9] animate-pulse"
                style={{ animationDelay: `${i * 55}ms` }}
              />
            ))}
          </div>
        ) : visiblePlatforms.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
                <path d="M9 8l2 2 4-4" />
              </svg>
            </div>
            <p className="font-bold text-[#334155] text-[13px]">No platforms found</p>
            <p className="text-[11px] text-[#94a3b8]">No platforms available for this source</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
            {visiblePlatforms.map((p, i) => (
              <PlatformCard
                key={p.PlatformId || i}
                platform={p}
                meta={meta}
                isSelected={
                  tableVisible &&
                  Number(selectedPlatform.PlatformId) === Number(p.PlatformId)
                }
                configCount={getConfigurationCount?.(p) || 0}
                onClick={() => handlePlatformClick(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CONFIGURATIONS TABLE ── */}
      {tableVisible && selectedPlatform && hasConfigs(selectedPlatform) && (
        <div className="border-t-2 border-dashed border-[#dce5f0] bg-[#fafcff]">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#e8eef5] bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse flex-shrink-0" />
              <div>
                <p className="text-[13px] font-extrabold text-[#0f172a] leading-none">
                  {selectedPlatform.PlatformName}
                  <span className="ml-1.5 text-[11px] font-semibold text-[#94a3b8]">
                    / Configurations
                  </span>
                </p>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  All saved configurations for this platform
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenManage?.({ kind: "add", editId: null })}
              className="inline-flex items-center gap-1.5 bg-[var(--brand-primary)] text-white text-[12px] font-bold px-4 py-2 rounded-xl hover:bg-[var(--brand-secondary)] transition-all shadow-[0_2px_8px_rgba(26,118,209,0.28)]"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              {Number(selectedPlatform?.PlatformId) === 14 || Number(selectedPlatform?.PlatformId) === 6
                ? "Add Recorder"
                : "Add Configuration"}
            </button>
          </div>
          <ConfigurationsTable
            platformId={selectedPlatform.PlatformId}
            platformName={selectedPlatform.PlatformName}
            onEdit={(row) =>
              onOpenManage?.({
                kind: "edit",
                editId:
                  row?.ruleId ?? row?.configId ?? row?.Id ?? row?.id ?? null,
                editRow: row,
              })
            }
            onAdd={() => onOpenManage?.({ kind: "add", editId: null })}
          />
        </div>
      )}

      {/* Selected platform — no configs */}
      {tableVisible && selectedPlatform && !hasConfigs(selectedPlatform) && (
        <div className="border-t-2 border-dashed border-[#dce5f0] bg-[#fafcff] p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.3"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#334155]">
                No configurations available
              </p>
              <p className="text-[11px] text-[#94a3b8] mt-1">
                This platform has no configurations yet. Click &ldquo;Add
                Configuration&rdquo; to get started.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenManage?.({ kind: "add", editId: null })}
              className="inline-flex items-center gap-1.5 bg-[var(--brand-primary)] text-white text-[12px] font-bold px-4 py-2 rounded-xl hover:bg-[var(--brand-secondary)] transition-all shadow-[0_2px_8px_rgba(26,118,209,0.28)]"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              {Number(selectedPlatform?.PlatformId) === 14 || Number(selectedPlatform?.PlatformId) === 6
                ? "Add Recorder"
                : "Add Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonSourceCard() {
  return (
    <div className="rounded-2xl border border-[#e8eef5] bg-white overflow-hidden animate-pulse">
      <div className="h-[3px] bg-[#e2e8f0]" />
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#f1f5f9]">
        <div className="w-9 h-9 rounded-xl bg-[#f1f5f9]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#f1f5f9] rounded w-1/3" />
          <div className="h-2.5 bg-[#f1f5f9] rounded w-1/2" />
        </div>
      </div>
      <div className="p-3.5 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 bg-[#f8fafc] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── ManageOverlay ────────────────────────────────────────────────────────────
function ManageOverlay({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] bg-slate-900/50 backdrop-blur-[8px] flex items-stretch justify-center p-[22px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1180px] h-[calc(100vh-44px)] rounded-[22px] overflow-hidden bg-white border border-[#dfe7f1] shadow-[0_24px_60px_rgba(15,23,42,0.22)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#e8eef5] bg-gradient-to-b from-[#fafcff] to-[#f4f8fd]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            <span className="text-[13px] font-bold text-[#0f172a]">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-[#e2e8f0] bg-white text-[#94a3b8] inline-flex items-center justify-center hover:bg-[#fee2e2] hover:border-[#fca5a5] hover:text-[#ef4444] transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white [&_.ig-page]:p-0 [&_.ig-page]:bg-transparent [&_.ig-page]:min-h-0 [&_.ig-header]:hidden [&_.page-header]:hidden [&_.ig-toolbar]:mt-0 [&_.page-wrap]:p-0 [&_.page-wrap]:bg-transparent [&_.page-wrap]:min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Spinner
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-5 h-5 rounded-full animate-spin"
          style={{
            border: "1.5px solid #E5E7EB",
            borderTopColor: "var(--brand-primary)",
          }}
        />
        <span className="text-[11px] text-gray-400">Checking access…</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function IntegrationWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accessState = useIntegrationAccess();

  const [sources, setSources] = useState([]);
  const [configCounts, setConfigCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const search = "";
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [manageOverlay, setManageOverlay] = useState({
    open: false,
    kind: "add",
    editId: null,
    editData: null,
  });

  useEffect(() => {
    const f = searchParams.get("filter");
    setActiveFilter(f || "");
    setSelectedPlatform(null);
    setManageOverlay({
      open: false,
      kind: "add",
      editId: null,
      editData: null,
    });
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN;
        const userId = getLoggedInUserId();
        const orgId = sessionStorage.getItem("selectedOrgId");

        const res = await fetch("/api/integrationWorkspace", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: buildAuthHeader(token),
            loggedInUserId: userId,
            ...(orgId ? { orgId } : {}),
          },
        });
        const r = await res.json();
        if (!res.ok || !r.success)
          throw new Error(r.message || "Failed to fetch sources.");
        setSources((r.data || []).filter((s) => s?.source));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (accessState !== true) return;
    (async () => {
      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN;
        const loggedInUserId = getLoggedInUserId();
        const [r1, r4, r13, r2, r14] = await Promise.allSettled([
          fetch("/api/workspace/configuration?platformid=1"),
          fetch(
            "/api/integrationWorkspace/amazon-connect/configurations?platformid=4",
            {
              credentials: "include",
              headers: {
                authorization: buildAuthHeader(token),
                loggedInUserId,
              },
            },
          ),
          fetch("/api/integrationWorkspace/verint/configurations", {
            credentials: "include",
            headers: { authorization: buildAuthHeader(token), loggedInUserId },
          }),
          fetch(
            "/api/integrationWorkspace/Nicein-connect/configurations?platformid=2",
            {
              credentials: "include",
              headers: {
                authorization: buildAuthHeader(token),
                loggedInUserId,
              },
            },
          ),
          fetch("/api/integrationWorkspace/Simcoom-recorder?platformId=14", {
            headers: { authorization: buildAuthHeader(token) },
          }),
        ]);
        const counts = {};
        if (r1.status === "fulfilled") {
          const j = await r1.value.json();
          counts[1] = Array.isArray(j.rows) ? j.rows.length : 0;
        }
        if (r4.status === "fulfilled") {
          const j = await r4.value.json();
          counts[4] = (j.data || []).length;
        }
        if (r13.status === "fulfilled") {
          const j = await r13.value.json();
          counts[13] = (j.data || []).length;
        }
        if (r2.status === "fulfilled") {
          const j = await r2.value.json();
          counts[2] = (j.data || []).length;
        }
        if (r14.status === "fulfilled") {
          const j = await r14.value.json();
          counts[14] = Array.isArray(j.data) ? j.data.length : 0;
        }
        setConfigCounts(counts);
      } catch {
        /* ignore */
      }
    })();
  }, [accessState]);

  if (accessState === null) return <PageSpinner />;
  if (accessState === false) return null;

  const filteredSources = sources.filter((s) => {
    if (activeFilter && s.source !== activeFilter) return false;
    // Only hide legacy/unused sources; do not hide active/new sources (e.g. id=6).

    return true;
  });

  const getConfigurationCount = (platform) =>
    configCounts[Number(platform?.PlatformId)] || 0;

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-6 pt-5 pb-16">
      <ManageOverlay
        open={manageOverlay.open}
        title="Manage Configuration"
        onClose={() =>
          setManageOverlay({
            open: false,
            kind: "add",
            editId: null,
            editData: null,
          })
        }
      >
        {selectedPlatform &&
          (() => {
            const Page =
              platformManageRegistry[Number(selectedPlatform.PlatformId)] ||
              DefaultPlatformPage;
            return (
              <Page
                embedded
                onClose={() =>
                  setManageOverlay({
                    open: false,
                    kind: "add",
                    editId: null,
                    editData: null,
                  })
                }
                onSaveSuccess={(savedConfig) => {
                  setManageOverlay({
                    open: false,
                    kind: "add",
                    editId: null,
                    editData: null,
                  });
                  const appId = savedConfig?.appId || "";
                  const returnFilter = activeFilter || "";
                  router.push(
                    `/dashboard/integrationWorkspace/Transcription/13?appid=${appId}&returnFilter=${encodeURIComponent(returnFilter)}`,
                  );
                }}
                startView={manageOverlay.kind === "add" ? "add" : "edit"}
                startEditId={manageOverlay.editId}
                startEditData={manageOverlay.editData}
                params={{ platformId: String(selectedPlatform.PlatformId) }}
              />
            );
          })()}
      </ManageOverlay>

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="bg-white/90 border border-[#dce5f0] rounded-2xl px-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center flex-shrink-0"
                onClick={() => router.push("/dashboard/integrationWorkspace")}
              >
                <svg
                  className="w-4 h-4 text-[var(--brand-primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="6" cy="12" r="2" />
                  <circle cx="18" cy="6" r="2" />
                  <circle cx="18" cy="18" r="2" />
                  <path d="M8 12h8" />
                  <path d="M16.5 7.5l-4 3" />
                  <path d="M12.5 15l4 3" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-[14px] font-extrabold text-[#0f172a] leading-none">
                  Integration
                </h1>
                <p className="mt-0.5 text-[11px] font-medium text-[#64748b] leading-none">
                  Manage platforms, configurations, and workflow steps
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-[11px] font-semibold text-[#64748b]">
                <svg
                  className="h-3.5 w-3.5 text-[#94a3b8]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7h18" />
                  <path d="M3 12h18" />
                  <path d="M3 17h18" />
                </svg>
                {filteredSources?.length || 0} sources
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonSourceCard key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center text-xl">
            ⚠️
          </div>
          <p className="text-[13px] font-bold text-[#334155]">Failed to load</p>
          <p className="text-[12px] text-[#94a3b8]">{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        (!activeFilter ? (
          <div
            className={`grid grid-cols-1 gap-4 items-stretch ${filteredSources.length <= 4
              ? "md:grid-cols-2 xl:grid-cols-2"
              : "md:grid-cols-3 xl:grid-cols-3"
              }`}
          >
            {filteredSources.map((item) => (
              <SourceBlock
                key={item.id}
                source={item.source}
                sourceId={item.id}
                description={item.description}
                meta={buildSourceMeta(item.source)}
                search=""
                mode="overview"
                getConfigurationCount={getConfigurationCount}
                onPlatformClick={() => { }}
                selectedPlatform={null}
                onCloseDetail={() => { }}
                onOpenManage={() => { }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredSources.map((item) => (
              <SourceBlock
                key={item.id}
                source={item.source}
                sourceId={item.id}
                description={item.description}
                meta={buildSourceMeta(item.source)}
                search={search}
                mode="filtered"
                getConfigurationCount={getConfigurationCount}
                selectedPlatform={selectedPlatform}
                onCloseDetail={() => setSelectedPlatform(null)}
                onOpenManage={(intent) => {
                  if (!selectedPlatform) return;
                  const pid = Number(selectedPlatform.PlatformId);
                  if (pid === 13) {
                    const returnFilter = activeFilter || "";
                    if (intent.kind === "edit" && intent.editRow) {
                      try {
                        const encoded = btoa(
                          encodeURIComponent(JSON.stringify(intent.editRow)),
                        );
                        router.push(
                          `/dashboard/integrationWorkspace/platform/13?mode=edit&data=${encoded}&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      } catch {
                        router.push(
                          `/dashboard/integrationWorkspace/platform/13?mode=edit&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      }
                    } else {
                      router.push(
                        `/dashboard/integrationWorkspace/platform/13?mode=add&returnFilter=${encodeURIComponent(returnFilter)}`,
                      );
                    }
                  } else if (pid === 4) {
                    const returnFilter = activeFilter || "";
                    if (intent.kind === "edit" && intent.editRow) {
                      try {
                        const encoded = btoa(
                          encodeURIComponent(JSON.stringify(intent.editRow)),
                        );
                        router.push(
                          `/dashboard/integrationWorkspace/platform/4?mode=edit&data=${encoded}&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      } catch {
                        router.push(
                          `/dashboard/integrationWorkspace/platform/4?mode=edit&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      }
                    } else {
                      router.push(
                        `/dashboard/integrationWorkspace/platform/4?mode=add&returnFilter=${encodeURIComponent(returnFilter)}`,
                      );
                    }
                  } else if (pid === 1) {
                    const id = Number(intent.editRow?.appid);
                    let url = `/dashboard/integrationWorkspace/Addworkspace?platformId=1&mode=${intent.kind}`;
                    if (intent.kind === "edit")
                      url = `/dashboard/integrationWorkspace/Editworkspace/${id}`;
                    router.push(url);
                  } else if (pid === 2) {
                    const returnFilter = activeFilter || "";
                    if (intent.kind === "edit" && intent.editRow) {
                      try {
                        const encoded = btoa(
                          encodeURIComponent(JSON.stringify(intent.editRow)),
                        );
                        router.push(
                          `/dashboard/integrationWorkspace/platform/2?mode=edit&data=${encoded}&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      } catch {
                        router.push(
                          `/dashboard/integrationWorkspace/platform/2?mode=edit&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      }
                    } else {
                      router.push(
                        `/dashboard/integrationWorkspace/platform/2?mode=add&returnFilter=${encodeURIComponent(returnFilter)}`,
                      );
                    }
                  } else if (pid === 14 || pid === 6) {
                    const returnFilter = activeFilter || "";
                    if (intent.kind === "edit" && intent.editRow) {
                      try {
                        const encoded = btoa(
                          encodeURIComponent(JSON.stringify(intent.editRow)),
                        );
                        router.push(
                          `/dashboard/integrationWorkspace/platform/${pid}?mode=edit&data=${encoded}&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      } catch {
                        router.push(
                          `/dashboard/integrationWorkspace/platform/${pid}?mode=edit&returnFilter=${encodeURIComponent(returnFilter)}`,
                        );
                      }
                    } else {
                      router.push(
                        `/dashboard/integrationWorkspace/platform/${pid}?mode=add&returnFilter=${encodeURIComponent(returnFilter)}`,
                      );
                    }
                  } else {
                    router.push(
                      `/dashboard/integrationWorkspace/platform/${pid}`,
                    );
                  }
                }}
                onPlatformClick={(platform) => {
                  const count = getConfigurationCount?.(platform) || 0;
                  if (count === 0) {
                    const pid = Number(platform?.PlatformId);
                    if (pid === 4 || pid === 2) {
                      setSelectedPlatform((cur) =>
                        Number(cur?.PlatformId) === Number(platform.PlatformId)
                          ? null
                          : {
                            ...platform,
                            SourceId: item.id,
                            source: item.source,
                          },
                      );
                      return;
                    }
                    if (pid === 1 || pid === 13) {
                      navigateToPlatformConfig(
                        router,
                        pid,
                        "add",
                        null,
                        activeFilter || "",
                      );
                      return;
                    }
                    // For all other platforms (including new ones), still allow
                    // selecting the platform so the "No configurations" panel
                    // is shown and users can open the platform page.
                    setSelectedPlatform((cur) =>
                      Number(cur?.PlatformId) === Number(platform.PlatformId)
                        ? null
                        : { ...platform, SourceId: item.id, source: item.source },
                    );
                    return;
                  }
                  setSelectedPlatform((cur) =>
                    Number(cur?.PlatformId) === Number(platform.PlatformId)
                      ? null
                      : { ...platform, SourceId: item.id, source: item.source },
                  );
                }}
              />
            ))}
          </div>
        ))}

      {!loading && !error && filteredSources.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] flex items-center justify-center text-xl">
            🔌
          </div>
          <p className="font-bold text-[#334155] text-[13px]">
            No platforms found
          </p>
          <p className="text-[11px] text-[#94a3b8]">Try a different filter.</p>
        </div>
      )}
    </div>
  );
}
