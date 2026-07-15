"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Settings2, X } from "lucide-react";
import { ConfigurationForm } from "./verintConfigurationform";

const LOCAL_CONFIG_STORAGE_KEY = "verint-configurations";
const DEFAULT_START_DATE = () => new Date().toISOString().slice(0, 10);

const parseUserFromSession = () => {
  try {
    const raw = sessionStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getLoggedInUserId = () => {
  const user = parseUserFromSession();
  const userId = user?.userId ?? user?.UserId ?? user?.id ?? null;
  const asNumber = Number(userId);
  return Number.isFinite(asNumber) && asNumber > 0 ? String(asNumber) : "1";
};

const buildAuthHeaders = () => ({
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  loggedInUserId: getLoggedInUserId(),
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function decodeRowFromUrl(dataParam) {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(dataParam)));
  } catch {
    return null;
  }
}

function normalizeConfig(config) {
  if (!config) return null;
  const rawSend = config.sendFileChannel || config.sendFile || config.SendFile || "";
  const sendUp = String(rawSend || "").trim().toUpperCase();
  return {
    ...config,
    instanceName:    config.instanceName    || config.InstanceName    || "",
    hostName:        config.hostName        || config.baseUrl          || config.HostName    || "",
    ruleName:        config.ruleName        || config.processName      || config.RuleName    || "",
    vcApiUserId:     config.vcApiUserId     || config.VcApiUserId      || config.apiUserId   || "",
    vcDomain:        config.vcDomain        || config.VcDomain         || config.domain      || "",
    apiPassword:     config.apiPassword     || config.ApiPassword      || "",
    apiKeyId:        config.apiKeyId        || config.ApiKeyId         || "",
    apiKeyName:      config.apiKeyName      || config.ApiKeyName       || "",
    timeZone:        config.timeZone        || config.TimeZone         || "",
    startDate:       config.startDate       || config.StartDate        || DEFAULT_START_DATE(),
    expiryTime:      config.expiryTime      || config.expiryDateTime   || config.ExpiryTime  || "",
    scheduleType:    config.scheduleType    || config.ScheduleType     || "DAILY",
    hourlyInterval:  config.hourlyInterval  || config.HourlyInterval   || "1",
    authenticationType: config.authenticationType || config.AuthenticationType || "",
    metadataType:
      config.metadataType === 1 || config.metadataType === "1" ? "CALL_WISE"
      : config.metadataType === 2 || config.metadataType === "2" ? "DAY_WISE"
      : config.metadataType || "",
    metadataFormat:  config.metadataFormat  || config.MetadataFormat   || "",
    exportFormat:    config.exportFormat    || config.ExportFormat     || "",
    audioType:       config.audioType       || config.AudioType        || "",
    folderStructure: config.folderStructure || config.FolderStructure  || "",
    folderPath:      config.folderPath      || config.DestDirectory    || config.FolderPath  || "",
    sendFileChannel:
      sendUp === "AZURE" || sendUp === "GCP" || sendUp === "S3" || sendUp === "SFTP" || sendUp === "LOCAL"
        ? sendUp
        : rawSend || "",
    storageClass:    config.storageClass    || config.StorageClass     || "",
    bucketRegion:    config.bucketRegion    || config.BucketRegion     || "",
    bucketName:      config.bucketName      || config.BucketName       || "",
    accessKey:       config.accessKey       || config.AccessKey        || "",
    secretKey:       config.secretKey       || config.SecretKey        || "",
    sftpServerName:  config.sftpServerName  || config.SftpServerName   || "",
    sftpBaseFolder:  config.sftpBaseFolder  || config.SftpBaseFolder   || "",
    sftpUserId:      config.sftpUserId      || config.SftpUserId       || "",
    sftpPassword:    config.sftpPassword    || config.SftpPassword     || "",
    sftpSshKey:      config.sftpSshKey      || config.SftpSshKey       || "",
    gcpBucket:       config.gcpBucket       || config.GcpBucket        || "",
    gcpProjectId:    config.gcpProjectId    || config.GcpProjectId     || "",
    gcpServiceKey:   config.gcpServiceKey   || config.GcpServiceKey    || "",
    azureAccount:    config.azureAccount    || config.AzureAccount     || "",
    azureContainer:  config.azureContainer  || config.AzureContainer   || "",
    azureConnection: config.azureConnection || config.AzureConnection  || "",
    pct: String(config.pct || config.percentage || config.Percentage || "100"),
    fileNaming: Array.isArray(config.fileNaming)     ? config.fileNaming
      : Array.isArray(config.FileNaming)             ? config.FileNaming     : [],
    metadataField: Array.isArray(config.metadataField)  ? config.metadataField
      : Array.isArray(config.metadataFields)            ? config.metadataFields
      : Array.isArray(config.MetadataFields)            ? config.MetadataFields : [],
    filters: Array.isArray(config.filters)  ? config.filters
      : Array.isArray(config.Filters)       ? config.Filters : [],
  };
}

async function fetchRootOrganization() {
  const selectedOrgId =
    typeof window !== "undefined" ? sessionStorage.getItem("selectedOrgId") || "" : "";
  if (!selectedOrgId) return { orgId: null, orgName: null };
  try {
    const res = await fetch("/api/organization/root", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        orgId: selectedOrgId,
      },
      cache: "no-store",
    });
    if (!res.ok) return { orgId: Number(selectedOrgId) || null, orgName: null };
    const result = await res.json();
    const root = result?.organizations?.[0] || null;
    return {
      orgId:  Number(root?.id)               || Number(selectedOrgId) || null,
      orgName: root?.name || root?.organizationName || null,
    };
  } catch {
    return { orgId: Number(selectedOrgId) || null, orgName: null };
  }
}

// ─── FeedbackModal ────────────────────────────────────────────────────────────

function FeedbackModal({ open, type = "info", title, message, onClose }) {
  if (!open) return null;
  const isSuccess = type === "success";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#d7e1f0] bg-white shadow-[0_18px_40px_rgba(17,39,82,0.2)]">
        <div className="flex items-center justify-between border-b border-[#e8eef7] px-5 py-4">
          <p className={`text-sm font-semibold ${isSuccess ? "text-[var(--brand-primary)]" : "text-[var(--brand-secondary)]"}`}>{title}</p>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end border-t border-[#e8eef7] px-5 py-3">
          <button type="button" onClick={onClose}
            className="rounded-md bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]"
          >OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfigurationCard ────────────────────────────────────────────────────────

function ConfigurationCard({ config, onEdit }) {
  const displayTitle    = config.instanceName || config.ruleName || config.processName || "Untitled Configuration";
  const displayHost     = config.hostName     || config.baseUrl  || "Not configured";
  const displayTimeZone = config.timeZone     || "No timezone set";
  const filterCount     = config.filters?.length || 0;
  const displayStatus   = displayHost !== "Not configured" ? "Configured" : "Draft";
  const initials        = (config.platformName || "VE").slice(0, 2).toUpperCase();

  const displayMetadataType =
    config.metadataType === "CALL_WISE" ? "Call"
    : config.metadataType === "DAY_WISE" ? "Day" : "--";

  const displaySendFile  = config.sendFileChannel || "--";
  const displayStartDate = config.startDate
    ? new Date(config.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "No date";

  return (
    <tr className="cursor-pointer border-b border-[#edf2f8] bg-white transition-colors hover:bg-[#f7fbff]" onClick={() => onEdit(config)}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe8f8] bg-[#f4f9ff] text-[11px] font-bold text-[#185FA5]">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#162033]">{displayTitle}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#7a8aa2]">{config.platformName || "VERINT"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><p className="truncate text-sm font-medium text-[#223047] max-w-[250px]">{displayHost}</p></td>
      <td className="px-4 py-3.5 text-sm font-medium text-[#314056]">{displayTimeZone}</td>
      <td className="px-4 py-3.5">
        <span className="inline-flex rounded-md border border-[#e4eaf3] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#4a5c73]">{displayMetadataType}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex min-w-[32px] justify-center rounded-md border border-[#dbe8f8] bg-[#f4f9ff] px-2.5 py-1 text-[11px] font-semibold text-[#185FA5]">{filterCount}</span>
      </td>
      <td className="px-4 py-3.5 text-sm font-medium text-[#314056]">{displaySendFile}</td>
      <td className="px-4 py-3.5 text-sm text-[#314056]">{displayStartDate}</td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${displayStatus === "Configured" ? "border border-[#d8ebc3] bg-[#eef8e2] text-[#47751f]" : "border border-[#f0dfb5] bg-[#fff6df] text-[#946200]"}`}>{displayStatus}</span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(config); }}
          className="inline-flex items-center rounded-lg border border-[#d7e6fb] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#185FA5] hover:border-[var(--brand-primary)] hover:bg-[#f5faff]"
        >Edit</button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Platform13Page({
  embedded     = false,
  onClose,
  onSaveSuccess,
  startView    = "add",
  startEditId  = null,
  startEditData = null,
} = {}) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const urlMode = searchParams?.get("mode");
  const urlData = searchParams?.get("data");

  // Decode row from URL immediately — synchronous, no async needed
  const urlRow = decodeRowFromUrl(urlData);

  // If URL has data or mode=edit/add → start on form directly
  const [showForm, setShowForm] = useState(
    !!(urlRow || urlMode === "edit" || urlMode === "add")
  );

  // formMode and editTarget are set once on mount via initRef
  const initRef = useRef(false);
  const [formMode,    setFormMode]    = useState(() => {
    if (urlRow || urlMode === "edit") return "edit";
    return "add";
  });
  const [editTarget,  setEditTarget]  = useState(() => {
    if (urlRow) return normalizeConfig(urlRow);
    return null;
  });
  const [activeConfigId, setActiveConfigId] = useState(() => {
    if (urlRow) return urlRow.id || urlRow.Id || urlRow.ruleId || null;
    return null;
  });

  const [saveLoading,          setSaveLoading]          = useState(false);
  const [testLoading,          setTestLoading]          = useState(false);
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const [configurations,       setConfigurations]       = useState([]);
  const [configurationsLoading,setConfigurationsLoading]= useState(true);
  const [metadataColumnOptions,setMetadataColumnOptions]= useState([]);
  const [metadataColumnsLoading,setMetadataColumnsLoading]=useState(true);
  const [timeZoneOptions,      setTimeZoneOptions]      = useState([]);
  const [timeZoneLoading,      setTimeZoneLoading]      = useState(true);
  const [feedback, setFeedback] = useState({ open: false, type: "info", title: "", message: "" });

  const showFeedback = (type, title, message) =>
    setFeedback({ open: true, type, title, message });

  const loadConfigurations = useCallback(async () => {
    try {
      setConfigurationsLoading(true);
      const org = await fetchRootOrganization();
      const headers = buildAuthHeaders();
      const fetchConfigs = async (processId) => {
        const query = processId ? `?processId=${processId}` : "";
        const res = await fetch(`/api/integrationWorkspace/verint/configurations${query}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        if (!res.ok) return [];
        const r = await res.json();
        return r?.success && Array.isArray(r.data) ? r.data : [];
      };
      let fetched = await fetchConfigs(org.orgId || "");
      if (!fetched.length) fetched = await fetchConfigs("");
      if (fetched.length > 0) {
        setConfigurations(fetched);
        localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(fetched));
        return;
      }
    } catch (e) {
      console.error("Failed to fetch configurations:", e);
    }
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY) || "[]");
      setConfigurations(Array.isArray(local) ? local : []);
    } catch {
      setConfigurations([]);
    }
    setConfigurationsLoading(false);
  }, []);

  // ── Load configurations (only needed for table view or fallback id-lookup) ──
  useEffect(() => {
    loadConfigurations().finally(() => setConfigurationsLoading(false));
  }, [loadConfigurations]);

  // ── After configs load: handle fallback id-lookup (only if no urlRow) ────
  useEffect(() => {
    if (configurationsLoading) return;
    if (initRef.current)       return; // run only once
    initRef.current = true;

    // URL had encoded data — already handled in useState init above
    if (urlRow) return;

    if (urlMode === "edit") {
      const urlEditId = searchParams?.get("id");
      if (urlEditId) {
        const match = configurations.find((c) =>
          String(c?.id)       === String(urlEditId) ||
          String(c?.ruleId)   === String(urlEditId) ||
          String(c?.configId) === String(urlEditId) ||
          String(c?.Id)       === String(urlEditId)
        );
        if (match) {
          setEditTarget(normalizeConfig(match));
          setActiveConfigId(match.id || match.Id || null);
          setFormMode("edit");
          setShowForm(true);
        } else {
          setFormMode("add");
          setShowForm(true);
        }
      }
      return;
    }

    if (urlMode === "add") {
      setFormMode("add");
      setEditTarget(null);
      setShowForm(true);
      return;
    }

    // Embedded mode
    if (embedded && startView === "edit") {
      if (startEditData) {
        setEditTarget(normalizeConfig(startEditData));
        setActiveConfigId(startEditData.id || startEditData.Id || null);
        setFormMode("edit");
        setShowForm(true);
      } else if (startEditId) {
        const match = configurations.find((c) =>
          String(c?.id)     === String(startEditId) ||
          String(c?.ruleId) === String(startEditId)
        );
        if (match) {
          setEditTarget(normalizeConfig(match));
          setActiveConfigId(match.id || null);
          setFormMode("edit");
          setShowForm(true);
        } else {
          setFormMode("add");
          setShowForm(true);
        }
      }
      return;
    }

    if (embedded && startView === "add") {
      setFormMode("add");
      setEditTarget(null);
      setShowForm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configurationsLoading]);

  // ── Load metadata columns ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setMetadataColumnsLoading(true);
        const userId = getLoggedInUserId();
        const res = await fetch(`/api/integrationWorkspace/metadataColumns?userId=${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: buildAuthHeaders(),
          cache: "no-store",
        });
        const r = await res.json();
        if (res.ok && r.success) {
          const cols = Array.isArray(r.data)
            ? r.data.map((i) => (typeof i === "string" ? i : i?.ColumnName || i?.columnName || "")).filter(Boolean)
            : [];
          setMetadataColumnOptions(cols);
        }
      } catch (e) { console.error(e); }
      finally { setMetadataColumnsLoading(false); }
    })();
  }, []);

  // ── Load timezones ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setTimeZoneLoading(true);
        const res = await fetch("/api/timezone", {
          method: "GET",
          headers: buildAuthHeaders(),
          cache: "no-store",
        });
        const r = await res.json();
        if (res.ok && r.success) {
          const opts = Array.isArray(r.data)
            ? r.data.map((i) => i?.TimeZone || i?.timezone || i?.name || "").filter(Boolean)
            : [];
          setTimeZoneOptions(opts);
        }
      } catch (e) { console.error(e); }
      finally { setTimeZoneLoading(false); }
    })();
  }, []);

  // ── Open helpers ──────────────────────────────────────────────────────────
  const openFormForAdd = () => {
    setFormMode("add");
    setEditTarget(null);
    setActiveConfigId(null);
    setIsConnectionVerified(false);
    setShowForm(true);
  };

  const openFormForEdit = (config) => {
    const normalized = normalizeConfig(config);
    setFormMode("edit");
    setEditTarget(normalized);
    setActiveConfigId(config.id || config.Id || config.ruleId || null);
    setIsConnectionVerified(false);
    setShowForm(true);
  };

  // ── Test connection ───────────────────────────────────────────────────────
  const handleTestConnection = async (credentials) => {
    try {
      setTestLoading(true);
      const res = await fetch("/api/integrationWorkspace/verint/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(credentials),
      });
      const r = await res.json();
      if (!res.ok || !r.success) {
        setIsConnectionVerified(false);
        showFeedback("error", "Connection Failed", r?.message || "Connection test failed.");
        return;
      }
      setIsConnectionVerified(true);
      showFeedback("success", "Connection Successful", r?.message || "Connection successful.");
    } catch (e) {
      console.error(e);
      setIsConnectionVerified(false);
      showFeedback("error", "Connection Failed", "Connection test failed.");
    } finally {
      setTestLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
const handleSave = async (payload) => {
  try {
    setSaveLoading(true);
    const isEditMode = formMode === "edit";
    const org = await fetchRootOrganization();
    const normalizedMetadataType =
      payload.metadataType === "CALL_WISE" ? 1
      : payload.metadataType === "DAY_WISE" ? 2
      : payload.metadataType || null;

    const endpoint = isEditMode
      ? "/api/integrationWorkspace/verint/update"
      : "/api/integrationWorkspace/verint/save";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({
        currentUserId: Number(getLoggedInUserId()),
        processId:     org.orgId,
        processName:   org.orgName,
        ...payload,
        metadataType:  normalizedMetadataType,
        metadataFields: payload.metadataField,
        sendFile:      payload.sendFileChannel,
        percentage:    payload.pct,
        folderPath:    payload.folderPath,
      }),
    });
    const r = await res.json();
    if (!res.ok || !r.success) {
      setIsConnectionVerified(false);
      showFeedback("error", "Save Failed", r?.message || "Save failed.");
      return;
    }
    showFeedback("success", "Saved", r?.message || "Configuration saved successfully.");

    const createdAppId =
      r?.data?.output?.appid ??
      r?.data?.output?.output?.appid ??
      r?.output?.appid ??
      payload?.appId ??
      searchParams?.get("appid") ??
      null;
    const returnFilter = searchParams?.get("returnFilter") || "All";

    try {
      if (typeof window !== "undefined" && createdAppId !== null && createdAppId !== undefined) {
        sessionStorage.setItem("lastIntegrationAppId", String(createdAppId));
      }
    } catch { }
    
    // Edit mode: save only (no next pages)
    if (isEditMode) {
      const backFilter = returnFilter || "Others";
      const backUrl =
        backFilter && backFilter !== "All"
          ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(backFilter)}`
          : "/dashboard/integrationWorkspace";
      if (embedded && onClose) {
        setTimeout(() => {
          onClose();
          router.push(backUrl);
        }, 700);
        return;
      }
      setTimeout(() => router.push(backUrl), 700);
      return;
    }

    // Add mode: after save go to next pages
    if (embedded && onClose) {
      setTimeout(() => {
        onSaveSuccess?.({ platformId: 13, appId: createdAppId });
        onClose(); // pehle modal/overlay close kar
        if (!onSaveSuccess) {
          router.push(
            `/dashboard/integrationWorkspace/column-mapping/13?appid=${createdAppId ?? ""}&returnFilter=${encodeURIComponent(returnFilter)}`,
          );
        }
      }, 1000);
    } else {
      setTimeout(() => {
        if (createdAppId !== null && createdAppId !== undefined && String(createdAppId).trim() !== "") {
          router.push(
            `/dashboard/integrationWorkspace/column-mapping/13?appid=${createdAppId}&returnFilter=${encodeURIComponent(returnFilter)}`,
          );
          return;
        }

        const backFilter = returnFilter || "Others";
        router.push(
          backFilter && backFilter !== "All"
            ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(backFilter)}`
            : "/dashboard/integrationWorkspace",
        );
      }, 1000);
    }
  } catch (e) {
    console.error(e);
    showFeedback("error", "Save Failed", "Failed to save configuration.");
  } finally {
    setSaveLoading(false);
  }
};

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (embedded) { onClose?.(); return; }
    const backFilter = searchParams?.get("returnFilter") || "Others";
    router.push(
      backFilter && backFilter !== "All"
        ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(backFilter)}`
        : "/dashboard/integrationWorkspace",
    );
  };

  const handleCancel = () => {
    if (embedded) { onClose?.(); return; }
    const backFilter = searchParams?.get("returnFilter") || "Others";
    router.push(
      backFilter && backFilter !== "All"
        ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(backFilter)}`
        : "/dashboard/integrationWorkspace",
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(circle at 8% -10%, rgba(26,118,209,0.08), transparent 36%), linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)" }}
    >
      <FeedbackModal
        open={feedback.open} type={feedback.type}
        title={feedback.title} message={feedback.message}
        onClose={() => setFeedback((p) => ({ ...p, open: false }))}
      />

      <header className="mx-4 mt-4 flex-shrink-0 rounded-2xl border border-[#d7e1f0] bg-white/95 px-6 shadow-[0_8px_22px_rgba(17,39,82,0.08)] backdrop-blur">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleBack}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[14px] font-semibold text-gray-900">VERINT Configuration</span>
            </div>
          </div>
          {!showForm && (
            <button type="button" onClick={openFormForAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]"
            >
              <Plus className="h-3.5 w-3.5" />Add Configuration
            </button>
          )}
        </div>
      </header>

      {/* ── Table view ── */}
      {!showForm && (
        <main className="flex-1 overflow-auto p-4">
          <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">Saved Configurations</p>
              <div className="rounded-full border border-[#d7e6fb] bg-white px-4 py-2 text-xs font-semibold text-[var(--brand-primary)] shadow-sm">
                {configurations.length} configuration{configurations.length === 1 ? "" : "s"}
              </div>
            </div>
            {configurationsLoading ? (
              <div className="overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_12px_28px_rgba(17,39,82,0.08)]">
                {[0,1,2].map((i) => (
                  <div key={i} className="grid grid-cols-9 gap-3 border-b border-[#eef3f8] px-4 py-4 last:border-b-0">
                    {Array.from({ length: 9 }).map((_, idx) => <div key={idx} className="h-4 animate-pulse rounded bg-[#eef3f8]" />)}
                  </div>
                ))}
              </div>
            ) : configurations.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_34px_rgba(17,39,82,0.08)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8fd_100%)]">
                      <tr className="border-b border-[#e9eef6]">
                        {["Instance","Base URL","Time Zone","Metadata","Filters","Channel","Start Date","Status","Action"].map((h) => (
                          <th key={h} className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6f8198]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {configurations.map((config) => (
                        <ConfigurationCard key={config.id} config={config} onEdit={openFormForEdit} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#cfe0f5] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-8 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#d6e5fb] bg-white shadow-sm">
                  <Settings2 className="h-7 w-7 text-[var(--brand-primary)]" />
                </div>
                <p className="mt-5 text-xl font-semibold text-gray-900">No configurations added yet</p>
                <button type="button" onClick={openFormForAdd}
                  className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]"
                >
                  <Plus className="h-3.5 w-3.5" />Add Configuration
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ── Form view ── */}
      {showForm && (
        <main className="flex-1 overflow-auto p-4">
          <div className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_36px_rgba(17,39,82,0.10)]">
            <ConfigurationForm
              key={formMode === "edit" ? (activeConfigId ?? "edit") : "add"}
              mode={formMode}
              initialValues={formMode === "edit" ? (editTarget ?? {}) : {}}
              metadataColumnOptions={metadataColumnOptions}
              metadataColumnsLoading={metadataColumnsLoading}
              timeZoneOptions={timeZoneOptions}
              timeZoneLoading={timeZoneLoading}
              saveLoading={saveLoading}
              testLoading={testLoading}
              isConnectionVerified={isConnectionVerified}
              onConnectionVerified={setIsConnectionVerified}
              onTestConnection={handleTestConnection}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </main>
      )}
    </div>
  );
}

