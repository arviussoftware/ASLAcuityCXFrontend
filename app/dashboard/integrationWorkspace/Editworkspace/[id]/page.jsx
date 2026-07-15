"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";
import { Settings2, Cloud } from "lucide-react";
import { Input, Label, SectionHeader, Select } from "../../platform/components/Platform13PageControl";

/* ─── Helper ─────────────────────────────────────────────────────────────── */
const ensureSeconds = (val) => {
  if (!val) return val;
  return /T\d{2}:\d{2}$/.test(val) ? `${val}:00` : val;
};

/* ─── EyeInput ───────────────────────────────────────────────────────────── */
function EyeInput({ label, required, value, onChange, placeholder, show, onToggle }) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600"
        >
          {show ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── SubSectionHeader ───────────────────────────────────────────────────── */
function SubSectionHeader({ title, description }) {
  return (
    <div className="md:col-span-2 mt-2">
      <p className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">{title}</p>
      {description && <p className="text-[12px] text-[#64748b]">{description}</p>}
    </div>
  );
}

/* ─── Inline error ───────────────────────────────────────────────────────── */
function Err({ field, errors }) {
  return errors[field]
    ? <p className="mt-1 text-[11px] font-semibold text-red-600">{errors[field]}</p>
    : null;
}

const S3_STORAGE_CLASSES = [
  "STANDARD", "INTELLIGENT_TIERING", "STANDARD_IA",
  "ONEZONE_IA", "GLACIER", "GLACIER_IR", "DEEP_ARCHIVE", "REDUCED_REDUNDANCY"
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function EditConfigurationPage({ params }) {
  const { id } = params;
  const router = useRouter();

  const [form, setForm] = useState({
    instance: "", orgId: "", tokenUrl: "", clientId: "",
    clientSecret: "", redirectUri: "", baseUrl: "", token: "",
    tokenExpiresInSeconds: "", refreshToken: "", refreshTokenExpiresInSec: "",
    timezone: "", destDirectory: "", fileFormat: "", folderStructure: "",
    startTime: "", frequencyInMinutes: "", expiryTime: "",
    PlatformId: "", appid: id,
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [connectionVerified, setConnectionVerified] = useState(false);

  const [timezonesList, setTimezonesList] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(true);
  const [timezonesError, setTimezonesError] = useState(false);

  const [frequencyList, setFrequencyList] = useState([]);
  const [frequencyLoading, setFrequencyLoading] = useState(true);
  const [frequencyError, setFrequencyError] = useState(false);

  // New field — Transcription
  const [transcription, setTranscription] = useState("");
  const [transcriptionEngine, setTranscriptionEngine] = useState(1);
  // Send File
  const [sendFileChannel, setSendFileChannel] = useState("");
  // S3
  const [bucketRegion, setBucketRegion] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [storageClass, setStorageClass] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  // SFTP
  const [sftpServerName, setSftpServerName] = useState("");
  const [sftpBaseFolder, setSftpBaseFolder] = useState("");
  const [sftpUserId, setSftpUserId] = useState("");
  const [sftpPassword, setSftpPassword] = useState("");
  const [sftpSshKey, setSftpSshKey] = useState("");
  const [showSftpPassword, setShowSftpPassword] = useState(false);
  // GCP
  const [gcpBucket, setGcpBucket] = useState("");
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [gcpServiceKey, setGcpServiceKey] = useState("");
  // AZURE
  const [azureAccount, setAzureAccount] = useState("");
  const [azureContainer, setAzureContainer] = useState("");
  const [azureConnection, setAzureConnection] = useState("");

  /* ─── Helpers ────────────────────────────────────────────────────────── */
  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: value.trim() === "" ? "This field is required" : "" }));
  };

  const handleNumeric = (key) => (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: value === "" ? "This field is required" : "" }));
    }
  };

  const handleTimezoneChange = (e) => {
    const selected = e.target.value;
    setForm((f) => ({ ...f, timezone: selected }));
    setErrors((prev) => ({ ...prev, timezone: selected === "" ? "This field is required" : "" }));
  };

  /* ─── 1. Fetch existing record ───────────────────────────────────────── */
  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setPageLoading(true);
        const res = await fetch(`/api/workspace/configuration/${id}`, {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        });
        const json = await res.json();

        if (res.ok && json.success) {
          const r = json.data;
          const toLocalDT = (val) => {
            if (!val) return "";
            return val.split(".")[0].replace(" ", "T");
          };
          setForm({
            appid: r.appid ?? id,
            PlatformId: r.PlatformId ?? "",
            instance: r.InstanceName ?? "",
            orgId: r.org_id ?? "",
            frequencyInMinutes: String(r.frequencyInMinutes ?? r.intervalInMinute ?? ""),
            startTime: toLocalDT(r.dtLastFetchDateTime),
            expiryTime: toLocalDT(r.ExpiryTime),
            tokenUrl: r.Tokenurl ?? "",
            clientId: r.clientId ?? "",
            clientSecret: r.ClientSecret ?? "",
            redirectUri: r.Redirect_URI ?? "",
            baseUrl: r.BaseUrl ?? "",
            token: r.token ?? "",
            tokenExpiresInSeconds: String(r.TokenExpiresInSeconds ?? ""),
            refreshToken: r.refresh_token ?? "",
            refreshTokenExpiresInSec: String(r.refresh_token_expiresInSec ?? ""),
            timezone: r.timezone ?? "",
            destDirectory: r.Destdirectory ?? "",
            fileFormat: r.FileFormat ?? "",
            folderStructure: r.FolderStrtucture ?? "",
          });

          setTranscription(r.Transcription ?? "");
          setSendFileChannel(r.SendFileChannel ?? "");
          setTranscriptionEngine(r.transcriptionEngine ?? 1);
          // S3
          setBucketRegion(r.S3BucketRegion ?? "");
          setBucketName(r.S3BucketName ?? "");
          setAccessKey(r.S3AccessKey ?? "");
          setSecretKey(r.S3SecretKey ?? "");
          setStorageClass(r.S3StorageClass ?? "");
          // SFTP
          setSftpServerName(r.SftpServerName ?? "");
          setSftpBaseFolder(r.SftpBaseFolder ?? "");
          setSftpUserId(r.SftpUserId ?? "");
          setSftpPassword(r.SftpPassword ?? "");
          setSftpSshKey(r.SftpSshKey ?? "");
          // GCP
          setGcpBucket(r.gcpBucket ?? "");
          setGcpProjectId(r.gcpProjectId ?? "");
          setGcpServiceKey(r.gcpServiceKey ?? "");
          // AZURE
          setAzureAccount(r.azureAccount ?? "");
          setAzureContainer(r.azureContainer ?? "");
          setAzureConnection(r.azureConnection ?? "");
        }
      } catch (err) {
        console.error("Failed to load record:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

  /* ─── 2. Fetch timezones ─────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/timezone", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          cache: "no-store",
        });
        const result = await res.json();
        if (res.ok && result.success && result.data.length > 0) {
          setTimezonesList(result.data);
        } else { setTimezonesError(true); }
      } catch { setTimezonesError(true); }
      finally { setTimezonesLoading(false); }
    })();
  }, []);

  /* ─── 3. Fetch frequency ─────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrationWorkspace/frequencyDDL", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          cache: "no-store",
        });
        const result = await res.json();
        if (res.ok && result.success && result.data.length > 0) {
          setFrequencyList(result.data);
        } else { setFrequencyError(true); }
      } catch { setFrequencyError(true); }
      finally { setFrequencyLoading(false); }
    })();
  }, []);

  /* ─── Validate ───────────────────────────────────────────────────────── */
  const validateForm = () => {
    const newErrors = {};
    [
      "orgId", "tokenUrl", "baseUrl", "redirectUri",
      "token", "refreshToken", "startTime"
    ].forEach((field) => {
      if (!form[field] || form[field].toString().trim() === "") newErrors[field] = "This field is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ─── Test ───────────────────────────────────────────────────────────── */
  const handleTest = async () => {
    try {
      setLoading(true);
      setConnectionVerified(false);
      const epochTime = new Date(form.startTime).getTime();
      const url = `${form.baseUrl}/v1/tasks?from=${epochTime}&orgId=${form.orgId}`;
      const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${form.token}` } });
      const result = await response.json();
      if (response.ok) {
        alert("✅ Connection successful");
        setConnectionVerified(true);
      } else {
        alert(result?.error?.message[0].description || "Connection failed");
      }
    } catch { alert("❌ Unable to connect"); }
    finally { setLoading(false); }
  };

  /* ─── Save ───────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!validateForm()) { alert("Please fill all required fields."); return; }
    try {
      setSaving(true);
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }
      const payload = {
        ...form,
        startTime: ensureSeconds(form.startTime),
        expiryTime: ensureSeconds(form.expiryTime),
        Modifieddby: userId,
        transcription,
        transcriptionEngine,
        sendFileChannel,
        ...(sendFileChannel === "S3" && { bucketRegion, bucketName, accessKey, secretKey, storageClass }),
        ...(sendFileChannel === "SFTP" && { sftpServerName, sftpBaseFolder, sftpUserId, sftpPassword, sftpSshKey }),
        ...(sendFileChannel === "GCP" && { gcpBucket, gcpProjectId, gcpServiceKey }),
        ...(sendFileChannel === "AZURE" && { azureAccount, azureContainer, azureConnection }),
      };
      const response = await fetch("/api/workspace/updatesettings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setToast(true);
        setTimeout(() => { setToast(false); router.back(); }, 2000);
      } else { alert(result.message || "Failed to save"); }
    } catch { alert("Something went wrong while saving."); }
    finally { setSaving(false); }
  };

  /* ─── Page loading skeleton ──────────────────────────────────────────── */
  if (pageLoading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: "radial-gradient(circle at 8% -10%, rgba(26,118,209,0.08), transparent 36%), linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)",
        }}
      >
        <header className="mx-4 mt-4 flex-shrink-0 rounded-2xl border border-[#d7e1f0] bg-white/95 px-6 shadow-[0_8px_22px_rgba(17,39,82,0.08)] backdrop-blur">
          <div className="flex h-14 items-center gap-3">
            <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-px bg-gray-200" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_36px_rgba(17,39,82,0.10)]">
            <div className="border-b border-[#eef3f8] px-6 py-4">
              <div className="h-3 w-32 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-3 w-64 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((m) => (
                      <div key={m} className="space-y-1.5">
                        <div className="h-2.5 w-24 rounded bg-gray-200 animate-pulse" />
                        <div className="h-9 rounded-lg bg-gray-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ─── Main render ────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(circle at 8% -10%, rgba(26,118,209,0.08), transparent 36%), linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)",
      }}
    >
      {/* ── Header ── */}
      <header className="mx-4 mt-4 flex-shrink-0 rounded-2xl border border-[#d7e1f0] bg-white/95 px-6 shadow-[0_8px_22px_rgba(17,39,82,0.08)] backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[var(--brand-primary)] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[14px] font-semibold text-gray-900">Edit Configuration</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#64748b]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1 border border-[#e2e8f0]">
              <Cloud className="h-3.5 w-3.5 text-[#94a3b8]" />
              Integration Settings
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-4">
        <div className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_36px_rgba(17,39,82,0.10)]">

          {/* Card header */}
          <div className="border-b border-[#eef3f8] bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8fd_100%)] px-6 py-4">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">Edit Configuration</p>
            <p className="mt-1 text-[12px] text-[#64748b]">Update app credentials, OAuth tokens, and system preferences.</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* ══════════════════════════════════════════
                  SOURCE
              ══════════════════════════════════════════ */}
              <div className="md:col-span-2">
                <SectionHeader icon={Settings2} tag="SOURCE" title="Source Configuration" />
              </div>

              <SubSectionHeader
                title="Application & Organization"
                description="Core app identity and fetch settings"
              />

              {/* Instance Name */}
              <div>
                <Input
                  label="Instance Name"
                  placeholder="Instance Name"
                  value={form.instance}
                  onChange={set("instance")}
                />
                <Err field="instance" errors={errors} />
              </div>

              {/* Org ID */}
              <div>
                <Input
                  label="Org ID"
                  required
                  placeholder="e.g. org_4f8c2a91b3d7"
                  value={form.orgId}
                  onChange={set("orgId")}
                />
                <Err field="orgId" errors={errors} />
              </div>

              {/* Frequency */}
              <div>
                <Label>Frequency (minutes)</Label>
                {frequencyLoading ? (
                  <p className="text-[12px] text-gray-400 mt-1">Loading frequencies…</p>
                ) : frequencyError ? (
                  <Select placeholder="Failed to load frequency" value="" onChange={() => { }} options={[]} />
                ) : (
                  <Select
                    placeholder="Select frequency…"
                    value={form.frequencyInMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({ ...f, frequencyInMinutes: val }));
                      setErrors((prev) => ({ ...prev, frequencyInMinutes: val === "" ? "This field is required" : "" }));
                    }}
                    options={frequencyList.map((f) => ({ label: f.Frequencyinmintus, value: f.Frequencyinmintus }))}
                  />
                )}
                <Err field="frequencyInMinutes" errors={errors} />
              </div>

              {/* Start Time */}
              <div>
                <Input
                  label="Start Time"
                  required
                  type="datetime-local"
                  step="1"
                  value={form.startTime}
                  onChange={set("startTime")}
                />
                <Err field="startTime" errors={errors} />
              </div>

              {/* Expiry Time */}
              <div>
                <Input
                  label="Expiry Date"
                  type="datetime-local"
                  step="1"
                  value={form.expiryTime}
                  onChange={set("expiryTime")}
                />
                <Err field="expiryTime" errors={errors} />
              </div>

              {/* ── OAuth Endpoints ── */}
              <SubSectionHeader
                title="OAuth Endpoints"
                description="Authentication URLs and redirect URIs"
              />

              <div className="md:col-span-2">
                <Input
                  label="Token URL"
                  required
                  placeholder="https://auth.example.com/oauth/token"
                  value={form.tokenUrl}
                  onChange={set("tokenUrl")}
                />
                <Err field="tokenUrl" errors={errors} />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Base URL"
                  required
                  placeholder="https://api.example.com/v1"
                  value={form.baseUrl}
                  onChange={set("baseUrl")}
                />
                <Err field="baseUrl" errors={errors} />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Redirect URI"
                  required
                  placeholder="https://yourapp.com/auth/callback"
                  value={form.redirectUri}
                  onChange={set("redirectUri")}
                />
                <Err field="redirectUri" errors={errors} />
              </div>

              {/* ── Client Credentials ── */}
              <SubSectionHeader
                title="Client Credentials"
                description="OAuth 2.0 client identity and secret"
              />

              <div>
                <Input
                  label="Client ID"
                  placeholder="client_xxxxxxxxxxxxxxxx"
                  value={form.clientId}
                  onChange={set("clientId")}
                />
                <Err field="clientId" errors={errors} />
              </div>

              <div>
                <EyeInput
                  label="Client Secret"
                  placeholder="••••••••••••••••"
                  value={form.clientSecret}
                  onChange={set("clientSecret")}
                  show={showSecret}
                  onToggle={() => setShowSecret(!showSecret)}
                />
                <Err field="clientSecret" errors={errors} />
              </div>

              {/* ── Access & Refresh Tokens ── */}
              <SubSectionHeader
                title="Access & Refresh Tokens"
                description="Token values and expiry durations"
              />

              <div className="md:col-span-2">
                <EyeInput
                  label="Token"
                  required
                  placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9…"
                  value={form.token}
                  onChange={set("token")}
                  show={showToken}
                  onToggle={() => setShowToken(!showToken)}
                />
                <Err field="token" errors={errors} />
              </div>

              <div>
                <Input
                  label="Token Expires In (seconds)"
                  placeholder="e.g. 3600"
                  value={form.tokenExpiresInSeconds}
                  onChange={handleNumeric("tokenExpiresInSeconds")}
                />
                <Err field="tokenExpiresInSeconds" errors={errors} />
              </div>

              <div className="md:col-span-2">
                <EyeInput
                  label="Refresh Token"
                  required
                  placeholder="rt_xxxxxxxxxxxxxxxxxxxx"
                  value={form.refreshToken}
                  onChange={set("refreshToken")}
                  show={showRefresh}
                  onToggle={() => setShowRefresh(!showRefresh)}
                />
                <Err field="refreshToken" errors={errors} />
              </div>

              <div>
                <Input
                  label="Refresh Token Expires In (seconds)"
                  placeholder="e.g. 86400"
                  value={form.refreshTokenExpiresInSec}
                  onChange={handleNumeric("refreshTokenExpiresInSec")}
                />
                <Err field="refreshTokenExpiresInSec" errors={errors} />
              </div>

              {/* Transcription — NEW field matching Add page */}
              <div className="flex flex-col justify-end">
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

              {/* ══════════════════════════════════════════
                  DESTINATION
              ══════════════════════════════════════════ */}
              <div className="md:col-span-2 mt-4">
                <SectionHeader icon={Cloud} tag="DESTINATION" title="Destination Configuration" />
              </div>

              <SubSectionHeader
                title="Storage & System"
                description="File output, folder structure and regional settings"
              />

              {/* Timezone */}
              <div>
                <Label>Timezone</Label>
                {timezonesLoading ? (
                  <p className="text-[12px] text-gray-400 mt-1">Loading timezones…</p>
                ) : timezonesError ? (
                  <Select placeholder="Failed to load timezones" value="" onChange={() => { }} options={[]} />
                ) : (
                  <Select
                    placeholder="Select timezone…"
                    value={form.timezone}
                    onChange={handleTimezoneChange}
                    options={timezonesList.map((tz) => ({ label: tz.TimeZone, value: tz.TimeZone }))}
                  />
                )}
                <Err field="timezone" errors={errors} />
              </div>

              {/* File Format */}
              <div>
                <Select
                  label="File Format"
                  placeholder="Select format…"
                  value={form.fileFormat}
                  onChange={set("fileFormat")}
                  options={[
                    { label: "Mp3", value: "Mp3" },
                    { label: "Wav", value: "Wav" },
                    { label: "Mp4", value: "Mp4" },
                  ]}
                />
                <Err field="fileFormat" errors={errors} />
              </div>

              {/* ── Send File ── */}
              <SubSectionHeader
                title="Send File"
                description="Choose a transfer channel and configure its settings"
              />

              <div className="md:col-span-2">
                <Select
                  label="Send File Channel"
                  placeholder="Select channel…"
                  value={sendFileChannel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSendFileChannel(val);
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
                <Err field="sendFileChannel" errors={errors} />
              </div>

              {/* ── S3 Configuration ── */}
              {sendFileChannel === "S3" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">S3 Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input
                        label="Bucket Region"
                        placeholder="e.g. us-east-1"
                        value={bucketRegion}
                        onChange={(e) => { setBucketRegion(e.target.value); setErrors(p => ({ ...p, bucketRegion: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="bucketRegion" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="Bucket Name"
                        placeholder="e.g. my-recordings-bucket"
                        value={bucketName}
                        onChange={(e) => { setBucketName(e.target.value); setErrors(p => ({ ...p, bucketName: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="bucketName" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="Access Key"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={accessKey}
                        onChange={(e) => { setAccessKey(e.target.value); setErrors(p => ({ ...p, accessKey: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="accessKey" errors={errors} />
                    </div>
                    <div>
                      <EyeInput
                        label="Secret Key"
                        placeholder="••••••••••••••••"
                        value={secretKey}
                        onChange={(e) => { setSecretKey(e.target.value); setErrors(p => ({ ...p, secretKey: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                        show={showSecretKey}
                        onToggle={() => setShowSecretKey(v => !v)}
                      />
                      <Err field="secretKey" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={set("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Storage Class"
                        placeholder="Select storage class…"
                        value={storageClass}
                        onChange={(e) => { setStorageClass(e.target.value); setErrors(p => ({ ...p, storageClass: e.target.value === "" ? "This field is required" : "" })); }}
                        options={S3_STORAGE_CLASSES.map((cls) => ({ label: cls, value: cls }))}
                      />
                      <Err field="storageClass" errors={errors} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SFTP Configuration ── */}
              {sendFileChannel === "SFTP" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">SFTP Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input
                        label="Server Name"
                        placeholder="e.g. sftp.example.com"
                        value={sftpServerName}
                        onChange={(e) => { setSftpServerName(e.target.value); setErrors(p => ({ ...p, sftpServerName: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="sftpServerName" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="Base Folder"
                        placeholder="e.g. /uploads/recordings"
                        value={sftpBaseFolder}
                        onChange={(e) => { setSftpBaseFolder(e.target.value); setErrors(p => ({ ...p, sftpBaseFolder: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="sftpBaseFolder" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="User ID"
                        placeholder="e.g. sftp_user"
                        value={sftpUserId}
                        onChange={(e) => { setSftpUserId(e.target.value); setErrors(p => ({ ...p, sftpUserId: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="sftpUserId" errors={errors} />
                    </div>
                    <div>
                      <EyeInput
                        label="Password"
                        placeholder="••••••••••••••••"
                        value={sftpPassword}
                        onChange={(e) => { setSftpPassword(e.target.value); setErrors(p => ({ ...p, sftpPassword: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                        show={showSftpPassword}
                        onToggle={() => setShowSftpPassword(v => !v)}
                      />
                      <Err field="sftpPassword" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={set("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="SSH Key"
                        placeholder="Paste your SSH public key here"
                        value={sftpSshKey}
                        onChange={(e) => { setSftpSshKey(e.target.value); setErrors(p => ({ ...p, sftpSshKey: e.target.value.trim() === "" ? "This field is required" : "" })); }}
                      />
                      <Err field="sftpSshKey" errors={errors} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── GCP Configuration ── (NEW — matches Add page) */}
              {sendFileChannel === "GCP" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">GCP Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input
                        label="Bucket Name"
                        value={gcpBucket}
                        onChange={(e) => { setGcpBucket(e.target.value); setErrors(p => ({ ...p, gcpBucket: !e.target.value ? "Required" : "" })); }}
                      />
                      <Err field="gcpBucket" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="Project ID"
                        value={gcpProjectId}
                        onChange={(e) => { setGcpProjectId(e.target.value); setErrors(p => ({ ...p, gcpProjectId: !e.target.value ? "Required" : "" })); }}
                      />
                      <Err field="gcpProjectId" errors={errors} />
                    </div>
                    <div>
                      <Label>Service Key</Label>
                      <EyeInput
                        placeholder="••••••••••••••••"
                        rows={4}
                        value={gcpServiceKey}
                        onChange={(e) => { setGcpServiceKey(e.target.value); setErrors(p => ({ ...p, gcpServiceKey: !e.target.value ? "Required" : "" })); }}
                      />
                      <Err field="gcpServiceKey" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={set("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" errors={errors} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── AZURE Configuration ── (NEW — matches Add page) */}
              {sendFileChannel === "AZURE" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">Azure Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input
                        label="Storage Account Name"
                        value={azureAccount}
                        onChange={(e) => { setAzureAccount(e.target.value); setErrors(p => ({ ...p, azureAccount: !e.target.value ? "Required" : "" })); }}
                      />
                      <Err field="azureAccount" errors={errors} />
                    </div>
                    <div>
                      <Input
                        label="Container Name"
                        value={azureContainer}
                        onChange={(e) => { setAzureContainer(e.target.value); setErrors(p => ({ ...p, azureContainer: !e.target.value ? "Required" : "" })); }}
                      />
                      <Err field="azureContainer" errors={errors} />
                    </div>
                    <div className="md:col-span-2">
                      <EyeInput
                        label="Connection String"
                        value={azureConnection}
                        onChange={(e) => { setAzureConnection(e.target.value); setErrors(p => ({ ...p, azureConnection: !e.target.value ? "Required" : "" })); }}
                        show={showToken}
                        onToggle={() => setShowToken(!showToken)}
                      />
                      <Err field="azureConnection" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={set("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" errors={errors} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── LOCAL Configuration ── (NEW — matches Add page) */}
              {sendFileChannel === "LOCAL" && (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">Local Storage Configuration</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Input
                        label="Destination Directory"
                        placeholder="e.g. /data/output/recordings"
                        value={form.destDirectory}
                        onChange={set("destDirectory")}
                      />
                      <Err field="destDirectory" errors={errors} />
                    </div>
                    <div>
                      <Select
                        label="Folder Structure"
                        placeholder="Select structure…"
                        value={form.folderStructure}
                        onChange={set("folderStructure")}
                        options={[
                          { label: "YearMonth", value: "YearMonth" },
                          { label: "monthYear", value: "monthYear" },
                          { label: "date", value: "date" },
                        ]}
                      />
                      <Err field="folderStructure" errors={errors} />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#eef3f8] bg-white/95 px-6 py-4">
            <div>
              <p className="text-xs text-gray-500">Save becomes available after a successful connection test.</p>
              <p className={`mt-0.5 text-[11px] ${connectionVerified ? "text-emerald-600" : "text-amber-600"}`}>
                {connectionVerified ? "✓ Connection verified. You can save now." : "Run Test Connection to enable Save."}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={loading}
                className="rounded-xl border border-[var(--brand-primary)] bg-white px-4 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[#f5faff] disabled:opacity-60 flex items-center gap-1.5 transition-colors"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)]" />
                    Testing…
                  </>
                ) : (
                  "🔗 Test Connection"
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !connectionVerified}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60 flex items-center gap-1.5 transition-colors"
              >
                {saving ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </>
                ) : (
                  "💾 Save Changes"
                )}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── Toast ── */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-xs font-medium text-slate-100 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition-all duration-500 -translate-x-1/2
          ${toast ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"}`}
      >
        <span className="text-[#4ade80] text-sm">✓</span>
        Configuration updated successfully!
      </div>
    </div>
  );
}