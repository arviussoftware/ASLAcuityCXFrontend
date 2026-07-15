"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Cloud, Eye, EyeOff, KeyRound, Settings2, X } from "lucide-react";
import CryptoJS from "crypto-js";
import { Input, Label, SectionHeader, Select } from "./Platform13PageControl";

// ── Feedback modal ───────────────────────────────────────────────────────────
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
          <button type="button" onClick={onClose} className="rounded-md bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Password input ───────────────────────────────────────────────────────────
function PasswordInput({ label, required, placeholder, value, onChange, icon }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <div className={`relative ${icon ? "[&>input]:pl-9" : ""}`}>
        {icon ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        ) : null}
        <input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600"
          aria-label={visible ? "Hide" : "Show"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Sub-section header ───────────────────────────────────────────────────────
function SubSectionHeader({ title, description }) {
  return (
    <div className="md:col-span-2 mt-2">
      <p className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">{title}</p>
      {description && <p className="text-[12px] text-[#64748b]">{description}</p>}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const ensureSeconds = (val) => {
  if (!val) return val;
  return /T\d{2}:\d{2}$/.test(val) ? `${val}:00` : val;
};

const decodeRowFromUrl = (dataParam) => {
  if (!dataParam) return null;
  // Style 1: btoa(encodeURIComponent(JSON))  ← used by IntegrationWorkspacePage
  try {
    return JSON.parse(decodeURIComponent(atob(dataParam)));
  } catch { /* fall through */ }
  // Style 2: btoa(JSON)  ← plain base64 without URI-encoding
  try {
    return JSON.parse(atob(dataParam));
  } catch { /* fall through */ }
  return null;
};

/** Build a lowercase key → value map for case-insensitive DB column lookup. */
const buildLowerKeyMap = (row) => {
  const map = {};
  if (!row || typeof row !== "object") return map;
  for (const [key, value] of Object.entries(row)) {
    map[String(key).toLowerCase()] = value;
  }
  return map;
};

const firstDefined = (...values) => values.find((v) => v !== undefined && v !== null);

const getFromRow = (lowerMap, ...keys) => {
  for (const key of keys) {
    const val = lowerMap[String(key).toLowerCase()];
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
};

const safeTrim = (v) => String(v ?? "").trim();

const parseUserFromSession = () => {
  try {
    const enc = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text ? JSON.parse(text) : null;
  } catch { return null; }
};

const getLoggedInUserId = () => {
  const user = parseUserFromSession();
  const userId = user?.userId ?? user?.UserId ?? null;
  const n = Number(userId);
  return Number.isFinite(n) && n > 0 ? String(n) : "1";
};

const S3_STORAGE_CLASSES = [
  "STANDARD", "INTELLIGENT_TIERING", "STANDARD_IA",
  "ONEZONE_IA", "GLACIER", "GLACIER_IR", "DEEP_ARCHIVE", "REDUCED_REDUNDANCY",
];

// ── Component ────────────────────────────────────────────────────────────────
export default function Platform2Page({ params }) {
  const { platformId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  // searchParams.get() already URI-decodes once — do NOT decode again
  const urlMode = searchParams?.get("mode") || "add";
  const urlData = searchParams?.get("data") || "";
  const returnFilter = searchParams?.get("returnFilter") || "All";
  const formMode = urlMode === "edit" ? "edit" : "add";
  const backUrl = `/dashboard/integrationWorkspace?filter=${encodeURIComponent(returnFilter)}`;

  const [form, setForm] = useState({
    instance: "",
    orgId: "",
    tokenUrl: "",
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    baseUrl: "",
    token: "",
    tokenExpiresInSeconds: "",
    refreshToken: "",
    refreshTokenExpiresInSec: "",
    timezone: "",
    destDirectory: "",
    fileFormat: "",
    folderStructure: "",
    startTime: "",
    frequencyInMinutes: "",
    expiryTime: "",
    sourceAccessKey: "",
    sourceSecretKey: "",
    transcription: "",
  });

  const [transcription, setTranscription] = useState("");
  const [sendFileChannel, setSendFileChannel] = useState("");

  const [bucketRegion, setBucketRegion] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [storageClass, setStorageClass] = useState("");
  const [sftpServerName, setSftpServerName] = useState("");
  const [sftpBaseFolder, setSftpBaseFolder] = useState("");
  const [sftpUserId, setSftpUserId] = useState("");
  const [sftpPassword, setSftpPassword] = useState("");
  const [sftpSshKey, setSftpSshKey] = useState("");
  // GCP fields
  const [gcpBucket, setGcpBucket] = useState("");
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [gcpServiceKey, setGcpServiceKey] = useState("");
  // AZURE fields
  const [azureAccount, setAzureAccount] = useState("");
  const [azureContainer, setAzureContainer] = useState("");
  const [azureConnection, setAzureConnection] = useState("");

  const [rootOrgId, setRootOrgId] = useState(null);
  const [timezonesList, setTimezonesList] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);
  const [frequencyList, setFrequencyList] = useState([]);
  const [frequencyLoading, setFrequencyLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, type: "info", title: "", message: "", nextUrl: null });
  const [appId, setAppId] = useState("");
  const [transcriptionEngine, setTranscriptionEngine] = useState(1);
  // FIX 4 — derive once; use everywhere so JSX never compares a raw mixed-case value
  const normalizedChannel = sendFileChannel.trim().toUpperCase();
  const canSaveAfterTest = hasVerifiedOnce || isConnectionVerified;

  // ── Field helper ─────────────────────────────────────────────────────────
  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const showFeedback = (type, title, message, nextUrl = null) =>
    setFeedback({ open: true, type, title, message, nextUrl });

  const handleFeedbackClose = () => {
    const nextUrl = feedback?.nextUrl;
    setFeedback((prev) => ({ ...prev, open: false, nextUrl: null }));
    if (nextUrl) router.push(nextUrl);
  };

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchRootOrganization = async () => {
    const selectedOrgId = typeof window !== "undefined" ? sessionStorage.getItem("selectedOrgId") || "" : "";
    if (!selectedOrgId) return { orgId: null };
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
      if (!res.ok) return { orgId: Number(selectedOrgId) || null };
      const result = await res.json();
      const root = result?.organizations?.[0] || null;
      return { orgId: Number(root?.id) || Number(selectedOrgId) || null };
    } catch { return { orgId: Number(selectedOrgId) || null }; }
  };

  useEffect(() => {
    (async () => { const root = await fetchRootOrganization(); setRootOrgId(root?.orgId ?? null); })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/timezone", {
          method: "GET",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          cache: "no-store",
        });
        const r = await res.json();
        if (res.ok && r.success && r.data.length > 0) {
          setTimezonesList(r.data);
          if (formMode !== "edit") {
            setForm((f) => ({ ...f, timezone: r.data[0].TimeZone }));
          }
        }
      } catch { } finally { setTimezonesLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrationWorkspace/frequencyDDL", {
          method: "GET",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          cache: "no-store",
        });
        const r = await res.json();
        if (res.ok && r.success && r.data.length > 0) setFrequencyList(r.data);
      } catch { } finally { setFrequencyLoading(false); }
    })();
  }, []);
  // Add this helper near the top with your other helpers
  const toDatetimeLocal = (val) => {
    if (!val) return "";
    // Replace space with T, strip milliseconds
    return String(val).replace(" ", "T").replace(/\.\d+$/, "").slice(0, 16);
  };
  // ── Edit: populate form from URL data ────────────────────────────────────
  useEffect(() => {
    if (formMode !== "edit" || !urlData) return;

    const decoded = decodeRowFromUrl(urlData); // FIX 1
    if (!decoded) {
      console.warn("[Platform2Page] Could not decode edit data from URL");
      return;
    }

    const lower = buildLowerKeyMap(decoded);

    setForm((prev) => ({
      ...prev,

      instance: String(firstDefined(
        getFromRow(lower, "instancename", "instance", "Instance_Name", "InstanceName"),
        prev.instance,
      ) ?? ""),


      orgId: String(firstDefined(
        getFromRow(lower, "org_id", "orgid", "OrgId"),
        prev.orgId,
      ) ?? ""),

      tokenUrl: String(firstDefined(
        getFromRow(lower, "tokenurl", "token_url", "TokenUrl", "OAuthTokenUrl"),
        prev.tokenUrl,
      ) ?? ""),

      clientId: String(firstDefined(
        getFromRow(lower, "clientid", "client_id", "ClientId", "OAuthClientId"),
        prev.clientId,
      ) ?? ""),

      clientSecret: String(firstDefined(
        getFromRow(lower, "clientsecret", "client_secret", "ClientSecret", "OAuthClientSecret"),
        prev.clientSecret,
      ) ?? ""),

      redirectUri: String(firstDefined(
        getFromRow(lower, "redirecturi", "redirect_uri", "RedirectUri", "OAuthRedirectUri"),
        prev.redirectUri,
      ) ?? ""),

      baseUrl: String(firstDefined(
        getFromRow(lower, "baseurl", "base_url", "BaseUrl", "OAuthBaseUrl"),
        prev.baseUrl,
      ) ?? ""),

      token: String(firstDefined(
        getFromRow(lower, "token", "accesstoken", "access_token", "Token"),
        prev.token,
      ) ?? ""),

      tokenExpiresInSeconds: String(firstDefined(
        getFromRow(lower, "tokenexpiresinseconds", "token_expires_in_seconds", "TokenExpiresInSeconds"),
        prev.tokenExpiresInSeconds,
      ) ?? ""),

      refreshToken: String(firstDefined(
        getFromRow(lower, "refreshtoken", "refresh_token", "RefreshToken"),
        prev.refreshToken,
      ) ?? ""),

      refreshTokenExpiresInSec: String(firstDefined(
        getFromRow(lower,
          "refreshtokenexpiresinsec", "refresh_token_expires_in_sec",
          "refresh_token_expiresInSec",
          "RefreshTokenExpiresInSec",
        ),
        prev.refreshTokenExpiresInSec,
      ) ?? ""),

      timezone: String(firstDefined(
        getFromRow(lower, "timezone", "time_zone", "TimeZone"),
        prev.timezone,
      ) ?? ""),

      destDirectory: String(firstDefined(
        getFromRow(lower, "destdirectory", "dest_directory", "DestDirectory"),
        prev.destDirectory,
      ) ?? ""),

      fileFormat: String(firstDefined(
        getFromRow(lower, "fileformat", "file_format", "FileFormat"),
        prev.fileFormat,
      ) ?? ""),

      folderStructure: String(firstDefined(
        getFromRow(lower,
          "folderstructure", "folder_structure",
          "folderstrtucture",
          "FolderStructure",
        ),
        prev.folderStructure,
      ) ?? ""),

      startTime: toDatetimeLocal(
        firstDefined(
          getFromRow(lower, "starttime", "start_time", "StartTime", "dtLastFetchDateTime"),
          prev.startTime,
        ) ?? ""
      ),

      expiryTime: toDatetimeLocal(
        firstDefined(
          getFromRow(lower, "expirytime", "expiry_time", "ExpiryTime", "EndTime"),
          prev.expiryTime,
        ) ?? ""
      ),
      frequencyInMinutes: String(firstDefined(
        getFromRow(lower,
          "frequencyinminutes", "frequency_in_minutes", "frequencyinmintus",
          "intervalinminute",
          "FrequencyInMinutes",
        ),
        prev.frequencyInMinutes,
      ) ?? ""),

      sourceAccessKey: String(firstDefined(
        getFromRow(lower,
          "sourceaccesskey", "source_access_key", "SourceAccessKey",
          "accesskey", "access_key", "AccessKey",
          "niceaccesskey",
        ),
        prev.sourceAccessKey,
      ) ?? ""),

      sourceSecretKey: String(firstDefined(
        getFromRow(lower,
          "sourcesecretkey", "source_secret_key", "SourceSecretKey",
          "secretkey", "secret_key", "SecretKey",
          "nicesecretkey",
        ),
        prev.sourceSecretKey,
      ) ?? ""),
    }));

    const transcription = String(firstDefined(
      getFromRow(lower, "Transcription", "transcription"),
      "",
    ) ?? "");
    setTranscription(transcription);

    const transcriptionEngine = String(firstDefined(
      getFromRow(lower, "transcriptionengine", "transcription_engine", "TranscriptionEngine"),
      "",
    ) ?? "");
    setTranscriptionEngine(transcriptionEngine);

    const rawAppId = String(
      firstDefined(
        getFromRow(lower, "appid", "app_id", "AppId", "applicationid"),
        "",
      ) ?? ""
    );
    setAppId(rawAppId);

    const rawChannel = String(
      firstDefined(
        getFromRow(lower, "sendfilechannel", "send_file_channel", "SendFileChannel"),
        "",
      ) ?? ""
    ).trim().toUpperCase();

    setSendFileChannel(rawChannel);

    if (rawChannel === "S3") {
      setBucketRegion(String(getFromRow(lower,
        "bucketregion", "bucket_region", "BucketRegion",
        "s3bucketregion",
      ) ?? ""));

      setBucketName(String(getFromRow(lower,
        "bucketname", "bucket_name", "BucketName",
        "s3bucketname",                    // ← ADD
      ) ?? ""));

      setAccessKey(String(firstDefined(
        getFromRow(lower, "s3accesskey", "s3_access_key", "dest_accesskey", "S3AccessKey"),
        "",
      ) ?? ""));

      setSecretKey(String(firstDefined(
        getFromRow(lower, "s3secretkey", "s3_secret_key", "dest_secretkey", "S3SecretKey"),
        "",
      ) ?? ""));

      setStorageClass(String(getFromRow(lower,
        "storageclass", "storage_class", "StorageClass",
        "s3storageclass",
      ) ?? ""));

    } else if (rawChannel === "SFTP") {
      setSftpServerName(String(getFromRow(lower, "sftpservername", "sftp_server_name", "SftpServerName") ?? ""));
      setSftpBaseFolder(String(firstDefined(
        getFromRow(lower, "sftpbasefolder", "sftp_base_folder", "SftpBaseFolder", "sftpbasedolder"),
        "",
      ) ?? ""));
      setSftpUserId(String(getFromRow(lower, "sftpuserid", "sftp_user_id", "SftpUserId") ?? ""));
      setSftpPassword(String(getFromRow(lower, "sftppassword", "sftp_password", "SftpPassword") ?? ""));
      setSftpSshKey(String(getFromRow(lower, "sftpsshkey", "sftp_ssh_key", "SftpSshKey") ?? ""));
    }
    else if (rawChannel === "GCP") {
      setGcpBucket(String(getFromRow(lower, "gcpbucket", "gcp_bucket", "GcpBucket") ?? ""));
      setGcpProjectId(String(getFromRow(lower, "gcpprojectid", "gcp_project_id", "GcpProjectId") ?? ""));
      setGcpServiceKey(String(getFromRow(lower, "gcpservicekey", "gcp_service_key", "GcpServiceKey") ?? ""));
    } else if (rawChannel === "AZURE") {
      setAzureAccount(String(getFromRow(lower, "azureaccount", "azure_account", "AzureAccount") ?? ""));
      setAzureContainer(String(getFromRow(lower, "azurecontainer", "azure_container", "AzureContainer") ?? ""));
      setAzureConnection(String(getFromRow(lower, "azureconnection", "azure_connection", "AzureConnection") ?? ""));
    }

    //setIsConnectionVerified(true);
    //setHasVerifiedOnce(true);
  }, [formMode, urlData]);


  const validateForTest = () => {
    const next = {};
    if (!safeTrim(form.baseUrl)) next.baseUrl = "Base URL is required.";
    if (!safeTrim(form.tokenUrl)) next.tokenUrl = "Token URL is required.";
    if (!safeTrim(form.token)) next.token = "Token is required.";
    if (!safeTrim(form.startTime)) next.startTime = "Start Date is required.";
    if (!safeTrim(form.expiryTime)) next.expiryTime = "Expiry Date is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateForSave = () => {
    const next = {};
    if (!safeTrim(form.baseUrl)) next.baseUrl = "Base URL is required.";
    if (!safeTrim(form.tokenUrl)) next.tokenUrl = "Token URL is required.";
    if (!safeTrim(form.token)) next.token = "Token is required.";
    if (!safeTrim(form.startTime)) next.startTime = "Start Date is required.";
    if (!safeTrim(form.expiryTime)) next.expiryTime = "Expiry Date is required.";

    // FIX 4 — use normalizedChannel for validation
    if (normalizedChannel === "S3") {
      if (!safeTrim(bucketRegion)) next.bucketRegion = "Bucket Region is required.";
      if (!safeTrim(bucketName)) next.bucketName = "Bucket Name is required.";
      if (!safeTrim(accessKey)) next.accessKey = "Access Key is required.";
      if (!safeTrim(secretKey)) next.secretKey = "Secret Key is required.";
      if (!safeTrim(storageClass)) next.storageClass = "Storage Class is required.";
    }
    if (normalizedChannel === "SFTP") {
      if (!safeTrim(sftpServerName)) next.sftpServerName = "Server Name is required.";
      if (!safeTrim(sftpBaseFolder)) next.sftpBaseFolder = "Base Folder is required.";
      if (!safeTrim(sftpUserId)) next.sftpUserId = "User Id is required.";
      if (!safeTrim(sftpPassword)) next.sftpPassword = "Password is required.";
      if (!safeTrim(sftpSshKey)) next.sftpSshKey = "SSH Key is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleTestConnection = async () => {
    //if (!validateForTest()) return;
    setTestLoading(true);
    setIsConnectionVerified(false);
    try {
      const url = `${form.baseUrl}/incontactapi/services/v34.0/contacts?startDate=${form.startTime}&endDate=${form.expiryTime}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${form.token}`, "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (res.ok) {
        setIsConnectionVerified(true);
        setHasVerifiedOnce(true);
        showFeedback("success", "Connection Verified", "NICE connection successful.");
      } else {
        showFeedback("error", "Test Connection Failed", result?.message || "Connection failed.");
      }
    } catch {
      showFeedback("error", "Test Connection Failed", "Unable to connect to NICE API.");
    } finally { setTestLoading(false); }
  };

  const handleSave = async () => {
    if (!validateForSave()) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const endpoint =
        formMode === "edit"
          ? "/api/workspace/updateNiceappsetting"
          : "/api/workspace/saveNiceappsetting";
      const payload = {
        ...form,
        startTime: ensureSeconds(form.startTime),
        expiryTime: ensureSeconds(form.expiryTime),
        PlatformId: platformId,
        OrgId: rootOrgId,
        Createdby: getLoggedInUserId(),
        transcription,
        transcriptionEngine,
        sendFileChannel: normalizedChannel,
        ...(formMode === "edit" && { appid: appId }),
        ...(normalizedChannel === "S3" && { bucketRegion, bucketName, accessKey, secretKey, storageClass }),
        ...(normalizedChannel === "SFTP" && { sftpServerName, sftpBaseFolder, sftpUserId, sftpPassword, sftpSshKey }),
        ...(normalizedChannel === "GCP" && { gcpBucket, gcpProjectId, gcpServiceKey }),
        ...(normalizedChannel === "AZURE" && { azureAccount, azureContainer, azureConnection }),
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        if (formMode === "edit") {
          showFeedback("success", "Saved", result.message || "Configuration saved.", backUrl);
        } else {
          const nextUrl = `/dashboard/integrationWorkspace/column-mapping/${platformId}?appid=${result.appId}&returnFilter=${encodeURIComponent(returnFilter)}`;
          showFeedback("success", "Saved", result.message || "Configuration saved.", nextUrl);
        }
      } else {
        showFeedback("error", "Save Failed", result.message || "Failed to save configuration.");
      }
    } catch {
      showFeedback("error", "Save Failed", "Something went wrong while saving.");
    } finally { setSaving(false); }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const Err = ({ field }) =>
    errors[field] ? <p className="mt-1 text-[11px] font-semibold text-red-600">{errors[field]}</p> : null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(circle at 8% -10%, rgba(26,118,209,0.08), transparent 36%), linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)" }}
    >
      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={handleFeedbackClose}
      />

      {/* ── Header ── */}
      <header className="mx-4 mt-4 flex-shrink-0 rounded-2xl border border-[#d7e1f0] bg-white/95 px-6 shadow-[0_8px_22px_rgba(17,39,82,0.08)] backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backUrl)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[14px] font-semibold text-gray-900">NICE inContact Configuration</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#64748b]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1 border border-[#e2e8f0]">
              <Cloud className="h-3.5 w-3.5 text-[#94a3b8]" />
              NICE inContact
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-4">
        <div className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_36px_rgba(17,39,82,0.10)]">

          {/* Card header */}
          <div className="border-b border-[#eef3f8] bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8fd_100%)] px-6 py-4">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">NICE inContact Configuration</p>
            <p className="mt-1 text-[12px] text-[#64748b]">
              {formMode === "edit" ? "Edit existing configuration details." : "Manage app credentials, OAuth tokens, and system preferences."}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* ══════════════════════════════════════════
                  SOURCE SECTION
              ══════════════════════════════════════════ */}
              <div className="md:col-span-2">
                <SectionHeader icon={Settings2} tag="SOURCE" title="Source Configuration" />
              </div>

              <SubSectionHeader title="Application & Organization" description="Instance details and scheduling preferences" />

              <div>
                <Input label="Instance Name" placeholder="e.g. prod-instance-01" value={form.instance} onChange={setField("instance")} />
                <Err field="instance" />
              </div>
              <div>
                <Input label="Org ID" placeholder="e.g. org_4f8c2a91b3d7" value={form.orgId} onChange={setField("orgId")} />
                <Err field="orgId" />
              </div>

              <div>
                <Label>Frequency (minutes)</Label>
                {frequencyLoading ? (
                  <p className="text-[12px] text-gray-400 mt-1">Loading frequencies…</p>
                ) : (
                  <Select
                    placeholder="Select frequency…"
                    value={form.frequencyInMinutes}
                    onChange={setField("frequencyInMinutes")}
                    options={frequencyList.map((f) => ({ label: f.Frequencyinmintus, value: f.Frequencyinmintus }))}
                  />
                )}
                <Err field="frequencyInMinutes" />
              </div>

              <div>
                <Input label="Start Date" required type="datetime-local" value={form.startTime} onChange={setField("startTime")} />
                <Err field="startTime" />
              </div>
              <div>
                <Input label="Expiry Date" required type="datetime-local" value={form.expiryTime} onChange={setField("expiryTime")} />
                <Err field="expiryTime" />
              </div>

              <SubSectionHeader title="OAuth Endpoints" description="Authentication URLs and redirect URIs" />

              <div className="md:col-span-2">
                <Input label="Token URL" required placeholder="https://auth.example.com/oauth/token" value={form.tokenUrl} onChange={setField("tokenUrl")} />
                <Err field="tokenUrl" />
              </div>
              <div className="md:col-span-2">
                <Input label="Base URL" required placeholder="https://api.example.com/v1" value={form.baseUrl} onChange={setField("baseUrl")} />
                <Err field="baseUrl" />
              </div>
              <div className="md:col-span-2">
                <Input label="Redirect URI" placeholder="https://yourapp.com/auth/callback" value={form.redirectUri} onChange={setField("redirectUri")} />
                <Err field="redirectUri" />
              </div>

              <SubSectionHeader title="Client Credentials" description="OAuth 2.0 client identity and secret" />

              <div>
                <Input label="Client ID" placeholder="client_xxxxxxxxxxxxxxxx" value={form.clientId} onChange={setField("clientId")} />
                <Err field="clientId" />
              </div>
              <div>
                <PasswordInput label="Client Secret" placeholder="••••••••••••••••" value={form.clientSecret} onChange={setField("clientSecret")} />
                <Err field="clientSecret" />
              </div>

              <SubSectionHeader title="Access Keys" description="Source access key and secret key for API authentication" />

              <div>
                <Input
                  label="Access Key"
                  required
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  value={form.sourceAccessKey}
                  onChange={setField("sourceAccessKey")}
                />
                <Err field="sourceAccessKey" />
              </div>
              <div>
                <PasswordInput
                  label="Secret Key"
                  required
                  placeholder="••••••••••••••••"
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  value={form.sourceSecretKey}
                  onChange={setField("sourceSecretKey")}
                />
                <Err field="sourceSecretKey" />
              </div>

              <SubSectionHeader title="Access & Refresh Tokens" description="Token values and expiry durations" />

              <div className="md:col-span-2">
                <PasswordInput label="Token" required placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9…" value={form.token} onChange={setField("token")} />
                <Err field="token" />
              </div>
              <div>
                <Input label="Token Expires In (seconds)" placeholder="e.g. 3600" value={form.tokenExpiresInSeconds} onChange={setField("tokenExpiresInSeconds")} />
                <Err field="tokenExpiresInSeconds" />
              </div>

              <div className="md:col-span-2">
                <PasswordInput label="Refresh Token" placeholder="rt_xxxxxxxxxxxxxxxxxxxx" value={form.refreshToken} onChange={setField("refreshToken")} />
                <Err field="refreshToken" />
              </div>
              <div>
                <Input label="Refresh Token Expires In (seconds)" placeholder="e.g. 86400" value={form.refreshTokenExpiresInSec} onChange={setField("refreshTokenExpiresInSec")} />
                <Err field="refreshTokenExpiresInSec" />
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium mb-2">Transcription</label>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Yes / No radios */}
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="transcription"
                      value="yes"
                      checked={transcription === "yes"}
                      onChange={(e) => {
                        setTranscription(e.target.value);
                        setTranscriptionEngine(1);
                      }}
                    />
                    Yes
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="transcription"
                      value="no"
                      checked={transcription === "no"}
                      onChange={(e) => {
                        setTranscription(e.target.value);
                        setTranscriptionEngine(1);
                      }}
                    />
                    No
                  </label>

                  {/* Inline dropdown — appears right next to radios when Yes is selected */}
                  {transcription === "yes" && (
                    <div className="w-48">
                      <Select
                        placeholder="Select engine…"
                        value={transcriptionEngine || 1}
                        onChange={(e) => setTranscriptionEngine(e.target.value)}
                        options={[
                          { label: "Default", value: 1 },
                          { label: "STT Engine", value: 2 },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* <div className="flex flex-col justify-end">
                <label className="text-sm font-medium mb-2">Transcription</label>

                <div className="flex items-center gap-4 h-[42px]">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="transcription"
                      value="yes"
                      checked={transcription === "yes"}
                      onChange={(e) => setTranscription(e.target.value)}
                    />
                    Yes
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="transcription"
                      value="no"
                      checked={transcription === "no"}
                      onChange={(e) => setTranscription(e.target.value)}
                    />
                    No
                  </label>
                </div>
              </div> */}
              {/* ══════════════════════════════════════════
                  DESTINATION SECTION
              ══════════════════════════════════════════ */}
              <div className="md:col-span-2 mt-4">
                <SectionHeader icon={Cloud} tag="DESTINATION" title="Destination Configuration" />
              </div>

              <SubSectionHeader title="Storage & System" description="Timezone, file format, and directory settings" />

              <div>
                <Label>Timezone</Label>
                {timezonesLoading ? (
                  <p className="text-[12px] text-gray-400 mt-1">Loading timezones…</p>
                ) : (
                  <Select
                    placeholder="Select timezone…"
                    value={form.timezone}
                    onChange={setField("timezone")}
                    options={timezonesList.map((tz) => ({ label: tz.TimeZone, value: tz.TimeZone }))}
                  />
                )}
                <Err field="timezone" />
              </div>
              <div>
                <Select
                  label="File Format"
                  placeholder="Select format…"
                  value={form.fileFormat}
                  onChange={setField("fileFormat")}
                  options={[
                    { label: "Mp3", value: "Mp3" },
                    { label: "Wav", value: "Wav" },
                    { label: "Mp4", value: "Mp4" },
                  ]}
                />
                <Err field="fileFormat" />
              </div>
              <SubSectionHeader title="Send File" description="Choose a transfer channel and configure its settings" />

              <div className="md:col-span-2">
                <Select
                  label="Send File Channel"
                  placeholder="Select channel…"
                  value={sendFileChannel}
                  onChange={(e) => {
                    // FIX 4 — always store normalised uppercase
                    setSendFileChannel(e.target.value.trim().toUpperCase());
                    setStorageClass("");
                  }}
                  options={[
                    { label: "S3", value: "S3" },
                    { label: "SFTP", value: "SFTP" },
                    { label: "GCP", value: "GCP" },
                    { label: "Azure", value: "AZURE" },
                    { label: "Local Drive", value: "LOCAL" },
                  ]}
                />
                <Err field="sendFileChannel" />
              </div>

              {/* FIX 4 — use normalizedChannel for all conditional rendering */}
              {normalizedChannel === "S3" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">S3 Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input label="Bucket Region" placeholder="e.g. us-east-1" value={bucketRegion} onChange={(e) => setBucketRegion(e.target.value)} />
                      <Err field="bucketRegion" />
                    </div>
                    <div>
                      <Input label="Bucket Name" placeholder="e.g. my-recordings-bucket" value={bucketName} onChange={(e) => setBucketName(e.target.value)} />
                      <Err field="bucketName" />
                    </div>
                    <div>
                      <Input label="Access Key" placeholder="AKIAIOSFODNN7EXAMPLE" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
                      <Err field="accessKey" />
                    </div>
                    <div>
                      <PasswordInput label="Secret Key" placeholder="••••••••••••••••" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
                      <Err field="secretKey" />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={setField("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" />
                    </div>
                    <div>
                      <Select
                        label="Storage Class"

                        placeholder="Select storage class…"
                        value={storageClass}
                        onChange={(e) => setStorageClass(e.target.value)}
                        options={S3_STORAGE_CLASSES.map((v) => ({ label: v, value: v }))}
                      />
                      <Err field="storageClass" />
                    </div>
                  </div>
                </div>
              )}

              {normalizedChannel === "SFTP" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">SFTP Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input label="Server Name" placeholder="e.g. sftp.example.com" value={sftpServerName} onChange={(e) => setSftpServerName(e.target.value)} />
                      <Err field="sftpServerName" />
                    </div>
                    <div>
                      <Input label="Base Folder" placeholder="e.g. /uploads/recordings" value={sftpBaseFolder} onChange={(e) => setSftpBaseFolder(e.target.value)} />
                      <Err field="sftpBaseFolder" />
                    </div>
                    <div>
                      <Input label="User ID" placeholder="e.g. sftp_user" value={sftpUserId} onChange={(e) => setSftpUserId(e.target.value)} />
                      <Err field="sftpUserId" />
                    </div>
                    <div>
                      <PasswordInput label="Password" placeholder="••••••••••••••••" value={sftpPassword} onChange={(e) => setSftpPassword(e.target.value)} />
                      <Err field="sftpPassword" />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={setField("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" />
                    </div>
                    <div>
                      <Input label="SSH Key" placeholder="Paste your SSH public key here" value={sftpSshKey} onChange={(e) => setSftpSshKey(e.target.value)} />
                      <Err field="sftpSshKey" />
                    </div>
                  </div>
                </div>
              )}
              {normalizedChannel === "GCP" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">GCP Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input label="Bucket Name" placeholder="e.g. my-bucket" value={gcpBucket} onChange={(e) => setGcpBucket(e.target.value)} />
                      <Err field="gcpBucket" />
                    </div>
                    <div>
                      <Input label="Project ID" placeholder="e.g. my-project" value={gcpProjectId} onChange={(e) => setGcpProjectId(e.target.value)} />
                      <Err field="gcpProjectId" />
                    </div>
                    <div>
                      <PasswordInput label="Service Key" placeholder="••••••••••••••••" value={gcpServiceKey} onChange={(e) => setGcpServiceKey(e.target.value)} />
                      <Err field="gcpServiceKey" />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={setField("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" />
                    </div>
                  </div>
                </div>
              )}
              {normalizedChannel === "AZURE" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">Azure Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input label="Storage Account Name" placeholder="e.g. myaccount" value={azureAccount} onChange={(e) => setAzureAccount(e.target.value)} />
                      <Err field="azureAccount" />
                    </div>
                    <div>
                      <Input label="Container Name" placeholder="e.g. mycontainer" value={azureContainer} onChange={(e) => setAzureContainer(e.target.value)} />
                      <Err field="azureContainer" />
                    </div>
                    <div>
                      <PasswordInput label="Connection String" placeholder="••••••••••••••••" value={azureConnection} onChange={(e) => setAzureConnection(e.target.value)} />
                      <Err field="azureConnection" />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={setField("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" />
                    </div>
                  </div>
                </div>
              )}
              {normalizedChannel === "LOCAL" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">Local Drive Configuration</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Destination Directory */}
                    <div>
                      <Input label="Destination Directory" placeholder="e.g. /data/output/recordings" value={form.destDirectory} onChange={setField("destDirectory")} />
                      <Err field="destDirectory" />
                    </div>

                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={setField("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[#eef3f8] bg-white/95 px-6 py-4">
            <div>
              <p className="text-xs text-gray-500">Save becomes available after a successful connection test.</p>
              <p className={`mt-0.5 text-[11px] ${canSaveAfterTest ? "text-emerald-600" : "text-amber-600"}`}>
                {canSaveAfterTest ? "Connection verified. You can save now." : "Run Test Connection to enable Save."}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(backUrl)}
                className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading}
                className="rounded-xl border border-[var(--brand-primary)] bg-white px-4 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[#f5faff] disabled:opacity-60"
              >
                {testLoading ? "Testing…" : canSaveAfterTest ? "Re-test Connection" : "Test Connection"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canSaveAfterTest}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}