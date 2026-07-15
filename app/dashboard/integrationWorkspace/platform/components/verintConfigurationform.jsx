// ConfigurationForm.jsx
// Reusable form component — works for both "Add" and "Edit" configuration.
//
// Usage:
//   <ConfigurationForm
//     mode="add"                     // "add" | "edit"
//     initialValues={config}         // required when mode="edit"
//     metadataColumnOptions={[...]}  // columns for FileNaming / MetadataFields multi-selects
//     metadataColumnsLoading={false}
//     timeZoneOptions={[...]}
//     timeZoneLoading={false}
//     onSave={async (snapshot) => {}} // called with the built payload on save
//     onTestConnection={async (creds) => {}} // called with connection-test credentials
//     onCancel={() => {}}
//   />

import { useState, useEffect } from "react";
import {
  AudioLines,
  FileOutput,
  Plus,
  Save,
  Send,
  X,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Input, Label, MultiSelect, SectionHeader, Select } from "./Platform13PageControl";
import IntegrationDestinationFields from "./IntegrationDestinationFields";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_NAMES = [
  "AGENT_ID", "ANI", "AUDIO_CH_NUM", "AUDIO_MODULE_NUM", "CONTACT_ID",
  "CUSTOM_DATA_FIELD", "DIRECTION", "DNIS", "EXTENSION", "ORG Name",
  "PBX_LOGIN_ID", "SWITCH NAME", "SWITCH_CALL_ID",
];

const EXPRESSIONS = [
  "Equals", "NotEquals", "Greater", "GreaterOrEqual", "Lesser",
  "LesserOrEqual", "Like", "Range",
];

const S3_STORAGE_CLASSES = [
  "STANDARD", "INTELLIGENT_TIERING", "STANDARD_IA", "ONEZONE_IA",
  "GLACIER_IR", "GLACIER", "DEEP_ARCHIVE", "REDUCED_REDUNDANCY", "OUTPOSTS",
];

const DEFAULT_AUTO_SELECTED_COLUMNS = [
  "AUDIO_END_TIME", "AUDIO_START_TIME", "CALL_ID", "EXTENSION",
];

const SCHEDULE_TYPE_OPTIONS = [
  { label: "Daily", value: "DAILY" },
  { label: "Hourly", value: "HOURLY" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isBlank = (v) => String(v ?? "").trim() === "";

const toDateInputValue = (val) => {
  const s = String(val ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDateTimeLocalValue = (val) => {
  const s = String(val ?? "").trim();
  if (!s) return "";
  // already datetime-local compatible
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.replace(/Z$/, "").slice(0, 16);
  const d = new Date(s);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeLoadedFilters = (filters = []) =>
  (Array.isArray(filters) ? filters : []).map((f, i) => ({
    id: f?.id || `loaded-filter-${i}`,
    filterName: f?.filterName || "",
    expression: f?.expression || "",
    value: f?.value || "",
    customDataId: f?.customDataId || "",
    csvLabel: f?.csvLabel || "",
    csvValues: f?.csvValues || "",
    csvFileName:
      String(f?.expression || "").toUpperCase() === "RANGE" && f?.csvValues
        ? f?.csvFileName || "Saved Range"
        : f?.csvFileName || "",
  }));

const EMPTY_FORM = {
  instanceName: "",
  hostName: "",
  ruleName: "",
  startDate: "2026-03-24",
  timeZone: "",
  scheduleType: "DAILY",
  hourlyInterval: "1",
  authenticationType: "",
  vcDomain: "",
  vcApiUserId: "",
  apiPassword: "",
  apiKeyId: "",
  apiKeyName: "",
  expiryTime: "",
  metadataType: "",
  metadataFormat: "",
  exportFormat: "",
  audioType: "",
  folderStructure: "",
  folderPath: "",
  sendFileChannel: "",
  storageClass: "",
  bucketRegion: "",
  bucketName: "",
  accessKey: "",
  secretKey: "",
  gcpBucket: "",
  gcpProjectId: "",
  gcpServiceKey: "",
  azureAccount: "",
  azureContainer: "",
  azureConnection: "",
  sftpServerName: "",
  sftpBaseFolder: "",
  sftpUserId: "",
  sftpPassword: "",
  sftpSshKey: "",
  pct: "100",
  fileNaming: DEFAULT_AUTO_SELECTED_COLUMNS,
  metadataField: DEFAULT_AUTO_SELECTED_COLUMNS,
  filters: [],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterModal({ open, onClose, onApply }) {
  const [name, setName] = useState("");
  const [expr, setExpr] = useState("");
  const [val, setVal] = useState("");
  const [customDataId, setCustomDataId] = useState("");
  const [csvFile, setCsvFile] = useState(null);

  if (!open) return null;

  const close = () => {
    setName(""); setExpr(""); setVal(""); setCustomDataId(""); setCsvFile(null);
    onClose();
  };

  const apply = async () => {
    if (!name || !expr) return;
    if (name === "CUSTOM_DATA_FIELD" && !customDataId) return;
    if (expr === "Range" && !csvFile) return;
    if (expr !== "Range" && !val) return;

    let csvValues = "";
    if (expr === "Range" && csvFile) {
      try { csvValues = await csvFile.text(); } catch (e) { console.error(e); }
    }

    onApply({ id: `${name}-${Date.now()}`, filterName: name, expression: expr, value: val, customDataId, csvFileName: csvFile?.name || "", csvValues });
    close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Add Filter</p>
          <button type="button" onClick={close} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <Select label="Filter Name" placeholder="Select field" options={FILTER_NAMES} value={name}
            onChange={(e) => { setName(e.target.value); if (e.target.value !== "CUSTOM_DATA_FIELD") setCustomDataId(""); }}
          />
          {name === "CUSTOM_DATA_FIELD" && (
            <Input label="Custom Data Id" placeholder="Enter custom data id" value={customDataId} onChange={(e) => setCustomDataId(e.target.value)} />
          )}
          <Select label="Expression" placeholder="Select operator" options={EXPRESSIONS} value={expr}
            onChange={(e) => { setExpr(e.target.value); setVal(""); if (e.target.value !== "Range") setCsvFile(null); }}
          />
          {expr && expr !== "Range" && (
            <Input label="Value" placeholder="Enter value" value={val} onChange={(e) => setVal(e.target.value)} />
          )}
          {expr === "Range" && (
            <div>
              <Label>Upload Range CSV</Label>
              <p className="mb-2 text-[11px] text-gray-500">The uploaded CSV content will be stored in the database filter list after save.</p>
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 text-sm text-gray-800 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button type="button" onClick={close} className="rounded-md border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={apply}
            disabled={!name || !expr || (name === "CUSTOM_DATA_FIELD" && !customDataId) || (expr === "Range" && !csvFile) || (expr !== "Range" && !val)}
            className="rounded-md bg-[#1a76d1] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2C2D3F] disabled:cursor-not-allowed disabled:opacity-40"
          >Apply</button>
        </div>
      </div>
    </div>
  );
}

function FiltersRow({ onOpen, filters, onRemove }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d2e3f6] bg-white p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-medium text-gray-500">Active filters</p>
        <button type="button" onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-md border border-[#1a76d1] px-2.5 py-1 text-[11px] font-medium text-[#1a76d1] hover:border-[#2C2D3F] hover:bg-[#2C2D3F] hover:text-white"
        >
          <Plus className="h-3 w-3" />Add filter
        </button>
      </div>
      {filters.length > 0 ? (
        <div className="rounded-lg border border-[#e3edf9] bg-[#f8fbff] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-[#1a76d1]">{filters.length} filter{filters.length === 1 ? "" : "s"} applied</p>
            <p className="text-[10px] text-gray-400">Scrollable list</p>
          </div>
          <div className="max-h-32 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <span key={f.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  <span className="opacity-60">{f.filterName}</span>
                  <ArrowRight className="h-2 w-2 opacity-40" />
                  <span>{f.expression}</span>
                  {f.value ? <span className="max-w-[140px] truncate rounded bg-blue-100/60 px-1.5 py-px">{f.value}</span> : null}
                  {f.csvValues ? <span className="max-w-[180px] truncate rounded border border-blue-100 bg-white px-1.5 py-px">{f.csvValues}</span> : null}
                  {f.customDataId ? <span className="rounded border border-blue-100 bg-white px-1.5 py-px">CDI: {f.customDataId}</span> : null}
                  {f.csvFileName ? <span className="max-w-[120px] truncate rounded border border-blue-100 bg-white px-1.5 py-px">{f.csvFileName}</span> : null}
                  <button type="button" onClick={() => onRemove(f.id)} className="ml-0.5 text-gray-400 hover:text-red-500">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-400">No filters added yet.</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ConfigurationForm
 *
 * Props:
 *   mode                    "add" | "edit"
 *   initialValues           object — pre-populated field values (required for edit)
 *   metadataColumnOptions   string[]
 *   metadataColumnsLoading  boolean
 *   timeZoneOptions         string[]
 *   timeZoneLoading         boolean
 *   onSave                  async fn(payload) — called on Save
 *   onTestConnection        async fn(credentials) — called on Test Connection
 *   onCancel                fn()
 *   saveLoading             boolean
 *   testLoading             boolean
 *   isConnectionVerified    boolean
 *   onConnectionVerified    fn(bool)  — parent sets verified state
 */
export function ConfigurationForm({
  mode = "add",
  initialValues = {},
  metadataColumnOptions = [],
  metadataColumnsLoading = false,
  timeZoneOptions = [],
  timeZoneLoading = false,
  onSave,
  onTestConnection,
  onCancel,
  saveLoading = false,
  testLoading = false,
  isConnectionVerified = false,
  onConnectionVerified,
}) {
  const init = mode === "edit" ? { ...EMPTY_FORM, ...initialValues } : EMPTY_FORM;

  // ── Field state ──────────────────────────────────────────────────────────
  const [instanceName, setInstanceName] = useState(init.instanceName);
  const [hostName, setHostName] = useState(init.hostName || init.baseUrl || "");
  const [ruleName, setRuleName] = useState(init.ruleName || init.processName || "");
  const [startDate, setStartDate] = useState(toDateInputValue(init.startDate));
  const [timeZone, setTimeZone] = useState(init.timeZone);
  const [scheduleType, setScheduleType] = useState(init.scheduleType);
  const [hourlyInterval, setHourlyInterval] = useState(init.hourlyInterval);
  const [authenticationType, setAuthenticationType] = useState(
    init.authenticationType || (init.apiKeyId || init.apiKeyName ? "API" : "DOMAIN")
  );
  const [vcDomain, setVcDomain] = useState(init.vcDomain);
  const [vcApiUserId, setVcApiUserId] = useState(init.vcApiUserId);
  const [apiPassword, setApiPassword] = useState(init.apiPassword);
  const [apiKeyId, setApiKeyId] = useState(init.apiKeyId);
  const [apiKeyName, setApiKeyName] = useState(init.apiKeyName);
  const [expiryTime, setExpiryTime] = useState(toDateTimeLocalValue(init.expiryTime));
  const [metadataType, setMetadataType] = useState(init.metadataType);
  const [metadataFormat, setMetadataFormat] = useState(init.metadataFormat);
  const [exportFormat, setExportFormat] = useState(init.exportFormat);
  const [audioType, setAudioType] = useState(init.audioType);
  const [folderStructure, setFolderStructure] = useState(init.folderStructure);
  const [folderPath, setFolderPath] = useState(init.folderPath);
  const [sendFileChannel, setSendFileChannel] = useState(init.sendFileChannel);
  const [storageClass, setStorageClass] = useState(init.storageClass);
  const [bucketRegion, setBucketRegion] = useState(init.bucketRegion);
  const [bucketName, setBucketName] = useState(init.bucketName);
  const [accessKey, setAccessKey] = useState(init.accessKey);
  const [secretKey, setSecretKey] = useState(init.secretKey);
  const [gcpBucket, setGcpBucket] = useState(init.gcpBucket);
  const [gcpProjectId, setGcpProjectId] = useState(init.gcpProjectId);
  const [gcpServiceKey, setGcpServiceKey] = useState(init.gcpServiceKey);
  const [azureAccount, setAzureAccount] = useState(init.azureAccount);
  const [azureContainer, setAzureContainer] = useState(init.azureContainer);
  const [azureConnection, setAzureConnection] = useState(init.azureConnection);
  const [sftpServerName, setSftpServerName] = useState(init.sftpServerName);
  const [sftpBaseFolder, setSftpBaseFolder] = useState(init.sftpBaseFolder);
  const [sftpUserId, setSftpUserId] = useState(init.sftpUserId);
  const [sftpPassword, setSftpPassword] = useState(init.sftpPassword);
  const [sftpSshKey, setSftpSshKey] = useState(init.sftpSshKey);
  const [pct, setPct] = useState(init.pct);
  const [fileNaming, setFileNaming] = useState(Array.isArray(init.fileNaming) ? init.fileNaming : DEFAULT_AUTO_SELECTED_COLUMNS);
  const [metadataField, setMetadataField] = useState(Array.isArray(init.metadataField) ? init.metadataField : DEFAULT_AUTO_SELECTED_COLUMNS);
  const [filters, setFilters] = useState(normalizeLoadedFilters(init.filters));
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Derived values ───────────────────────────────────────────────────────
  const normalizedAuth =
    authenticationType === "DOMAIN" || authenticationType === "API" ? authenticationType : "";

  const metaFormatOpts =
    metadataType === "CALL_WISE"
      ? [{ label: "XML", value: "XML" }, { label: "JSON", value: "JSON" }]
      : metadataType === "DAY_WISE"
        ? [{ label: "CSV", value: "CSV" }, { label: "JSON", value: "JSON" }]
        : [];

  const showAudioType = ["AUDIO", "SCREEN", "BOTH"].includes(exportFormat);
  const audioTypeOptions =
    exportFormat === "AUDIO"
      ? [{ label: "Verient Codec", value: "VERIENT_CODEC" }, { label: "WAV", value: "WAV" }, { label: "MP3", value: "MP3" }]
      : [{ label: "Verient Codec", value: "VERIENT_CODEC" }, { label: "MP3", value: "MP3" }];

  const hasAuthDetails =
    normalizedAuth === "API"
      ? !isBlank(apiKeyId) && !isBlank(apiKeyName)
      : !isBlank(vcDomain) && !isBlank(apiPassword);

  const canTestConnection = !isBlank(hostName) && !isBlank(vcApiUserId) && hasAuthDetails;
  const hasMandatoryFilters = filters.length > 0;

  // Reset auth-irrelevant fields when auth type changes
  useEffect(() => {
    if (normalizedAuth === "DOMAIN") { setApiKeyId(""); setApiKeyName(""); }
    else if (normalizedAuth === "API") { setVcDomain(""); setApiPassword(""); }
    else { setVcDomain(""); setApiPassword(""); setApiKeyId(""); setApiKeyName(""); }
  }, [normalizedAuth]);

  // Notify parent when connection-relevant fields change
  useEffect(() => {
    onConnectionVerified?.(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostName, vcApiUserId, vcDomain, apiPassword, apiKeyId, apiKeyName, authenticationType, sendFileChannel, sftpServerName, sftpUserId, sftpPassword]);

  // ── Build payload ────────────────────────────────────────────────────────
  const buildPayload = () => ({
    ...(mode === "edit"
      ? {
          // NOTE: in usp_GetVerintConfigurations, `id` is actually `appid`
          // and `rules_id` must be provided separately.
          appid: init?.appid ?? init?.appId ?? init?.id ?? null,
          rules_id: init?.rules_id ?? null,
        }
      : {}),
    instanceName, hostName, ruleName, startDate, timeZone, scheduleType,
    hourlyInterval: scheduleType === "HOURLY" ? Number(hourlyInterval || 1) : null,
    authenticationType: normalizedAuth,
    vcDomain: normalizedAuth === "DOMAIN" ? vcDomain : null,
    apiPassword: normalizedAuth === "DOMAIN" ? apiPassword : null,
    apiKeyId: normalizedAuth === "API" ? apiKeyId : null,
    apiKeyName: normalizedAuth === "API" ? apiKeyName : null,
    vcApiUserId,
    expiryDateTime: expiryTime || null,
    metadataType, metadataFormat, exportFormat,
    audioType: audioType === "VERIENT_CODEC" ? "Verient Codec" : audioType || null,
    folderStructure, folderPath, sendFileChannel, storageClass,
    bucketRegion, bucketName, accessKey, secretKey,
    gcpBucket, gcpProjectId, gcpServiceKey,
    azureAccount, azureContainer, azureConnection,
    sftpServerName, sftpBaseFolder, sftpUserId, sftpPassword, sftpSshKey,
    pct, fileNaming, metadataField,
    filters: filters.map((f) => ({
      filterName: f.filterName, expression: f.expression, value: f.value,
      customDataId: f.customDataId, csvValues: f.csvValues,
    })),
  });

  const handleTestConnection = () => {
    onTestConnection?.({
      hostName, vcApiUserId,
      vcDomain: normalizedAuth === "DOMAIN" ? vcDomain : null,
      apiPassword: normalizedAuth === "DOMAIN" ? apiPassword : null,
      apiKeyId: normalizedAuth === "API" ? apiKeyId : null,
      apiKeyName: normalizedAuth === "API" ? apiKeyName : null,
      sendFile: sendFileChannel,
      storageClass, bucketRegion, bucketName, accessKey, secretKey,
      gcpBucket, gcpProjectId, gcpServiceKey,
      azureAccount, azureContainer, azureConnection,
      sftpServerName, sftpUserId, sftpPassword,
    });
  };

  const handleSave = () => {
    if (!hasMandatoryFilters) return;
    onSave?.(buildPayload());
  };

  const selectedColumnsCount = fileNaming.length + metadataField.length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} onApply={(f) => setFilters((prev) => [...prev, f])} />

      {/* ── Scrollable form body ── */}
      <div className="flex flex-col gap-6 p-8">

        {/* ── STEP 01 ── */}
        <SectionHeader icon={AudioLines} tag="Step 01" title="General Setup" />

        <div className="rounded-xl border border-[#d9e2f0] bg-gradient-to-b from-white to-[#f9fbff] p-5 shadow-sm">

          {/* Instance Name */}
          <div className="mb-4 rounded-xl border border-[#d6e4f6] bg-white p-4 shadow-[0_8px_24px_rgba(17,39,82,0.05)]">
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[#1a76d1]">Configuration Identity</p>
              <p className="mt-1 text-[11px] text-gray-500">Add a clear instance name so this setup is easy to identify in the saved cards.</p>
            </div>
            <Input label="Instance Name" placeholder="Enter instance name" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
          </div>

          {/* Connection Details header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">Connection Details</p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe6f7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1a76d1]">
              <span className={`h-1.5 w-1.5 rounded-full ${canTestConnection ? "bg-emerald-500" : "bg-amber-500"}`} />
              {canTestConnection ? "Setup looks good" : "Complete required fields"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">

            {/* Connection Endpoint card */}
            <div className="rounded-xl border border-[#d6e4f6] bg-white shadow-[0_8px_24px_rgba(17,39,82,0.07)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#e8eef7] bg-gradient-to-r from-[#f8fbff] to-white px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[#1a76d1]">Connection Endpoint</p>
                  <p className="mt-1 text-[11px] text-gray-500">First enter host and user details, then choose one authentication method.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${canTestConnection ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}>
                  {canTestConnection ? "Ready to test" : "Credentials pending"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <Input label="Host Name" required placeholder="http://192.168.1.152/" hint="Enter the Verint host URL including the protocol." value={hostName} onChange={(e) => setHostName(e.target.value)} />
                <Input label="API User ID" required placeholder="Enter API user id" value={vcApiUserId} onChange={(e) => setVcApiUserId(e.target.value)} />
                <Select label="Authentication" required placeholder="Select authentication" hint="Choose only one method to continue."
                  options={[{ label: "Domain", value: "DOMAIN" }, { label: "API", value: "API" }]}
                  value={normalizedAuth} onChange={(e) => setAuthenticationType(e.target.value)}
                />
                {normalizedAuth === "DOMAIN" && (
                  <>
                    <Input label="Domain" required placeholder="Enter VC domain" hint="Use domain-based Verint authentication." value={vcDomain} onChange={(e) => setVcDomain(e.target.value)} />
                    <Input label="API Password" required type="password" placeholder="Enter API password" hint="Password used with the selected VC domain." value={apiPassword} onChange={(e) => setApiPassword(e.target.value)} />
                  </>
                )}
                {normalizedAuth === "API" && (
                  <>
                    <Input label="API Key ID" required placeholder="Enter API key id" hint="Enter the API access key identifier." value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} />
                    <Input label="API Key Name" required placeholder="Enter API key name" hint="Enter the API key name or value provided by Verint." value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* Rule Name & Filters card */}
            <div className="overflow-hidden rounded-xl border border-[#d6e4f6] bg-white shadow-[0_8px_24px_rgba(17,39,82,0.07)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#e8eef7] bg-gradient-to-r from-[#f8fbff] to-white px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[#1a76d1]">Rule Name & Filters</p>
                  <p className="mt-1 text-[11px] text-gray-500">Define the rule label and apply the filters that should drive this export.</p>
                </div>
                <span className="rounded-full border border-[#dbe6f7] bg-white px-3 py-1 text-[11px] font-semibold text-gray-600">
                  {filters.length} Filter{filters.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="p-4">
                <div className="mb-3 rounded-lg border border-[#e2e8f3] bg-[#fbfdff] p-3.5">
                  <Input label="Rule Name" required placeholder="Enter rule name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
                </div>
                <FiltersRow onOpen={() => setFilterOpen(true)} filters={filters} onRemove={(id) => setFilters((prev) => prev.filter((f) => f.id !== id))} />
              </div>
            </div>

            {/* Schedule Details card */}
            <div className="xl:col-span-2 rounded-xl border border-[#d6e4f6] bg-white shadow-[0_8px_24px_rgba(17,39,82,0.07)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#e8eef7] bg-gradient-to-r from-[#f8fbff] to-white px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[#1a76d1]">Schedule Details</p>
                  <p className="mt-1 text-[11px] text-gray-500">Choose how often this configuration should run and define the active execution window.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a76d1] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
                  <Zap className="h-3 w-3" />
                  {scheduleType === "HOURLY" ? "Hourly" : "Daily"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
                <Select label="MetaData File Frequency" required placeholder="Select schedule type" options={SCHEDULE_TYPE_OPTIONS} value={scheduleType} onChange={(e) => setScheduleType(e.target.value)} />
                <Select label="Time Zone" required placeholder={timeZoneLoading ? "Loading time zones..." : "Select time zone"} options={timeZoneOptions} value={timeZone} disabled={timeZoneLoading || timeZoneOptions.length === 0} onChange={(e) => setTimeZone(e.target.value)} />
                <Input label="Start Date" required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input label="Expiry Time" required type="datetime-local" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} />
                {scheduleType === "HOURLY" && (
                  <Input label="Hourly Interval" required type="number" placeholder="Enter hours" hint="Allowed range is 1 to 48 hours." min="1" max="48" value={hourlyInterval}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setHourlyInterval(""); return; }
                      const n = Number(v);
                      if (!Number.isNaN(n)) setHourlyInterval(String(Math.min(48, Math.max(1, n))));
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200" />

        {/* ── STEP 02 ── */}
        <SectionHeader icon={FileOutput} tag="Step 02" title="Output Setup" />

        {/* Columns */}
        <div className="rounded-xl border border-[#d9e2f0] bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">Select Columns</p>
            <span className="rounded-full border border-[#dbe6f7] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-semibold text-[#1a76d1]">
              {selectedColumnsCount} selections
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MultiSelect label="File Naming" required placeholder={metadataColumnsLoading ? "Loading columns..." : "Select convention"} options={metadataColumnOptions} value={fileNaming} onChange={setFileNaming} />
            <MultiSelect label="Metadata Fields" placeholder={metadataColumnsLoading ? "Loading columns..." : "Select fields"} options={metadataColumnOptions} value={metadataField} onChange={setMetadataField} />
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-xl border border-[#d9e2f0] bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold text-gray-700">Define Metadata</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="JOB FREQUENCY" required placeholder="Select type"
              options={[{ label: "Call Wise", value: "CALL_WISE" }, { label: "Day Wise", value: "DAY_WISE" }]}
              value={metadataType} onChange={(e) => { setMetadataType(e.target.value); setMetadataFormat(""); }}
            />
            <Select label="Metadata Format" required placeholder={metadataType ? "Select format" : "Select metadata type first"} options={metaFormatOpts} value={metadataFormat} disabled={!metadataType} onChange={(e) => setMetadataFormat(e.target.value)} />
          </div>
        </div>

        {/* Export */}
        <div className="rounded-xl border border-[#d9e2f0] bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold text-gray-700">Configure Export</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Export Format" required placeholder="Select format"
              options={[{ label: "Audio", value: "AUDIO" }, { label: "Screen", value: "SCREEN" }, { label: "Both", value: "BOTH" }]}
              value={exportFormat} onChange={(e) => { setExportFormat(e.target.value); setAudioType(""); }}
            />
            {showAudioType
              ? <Select label="Audio Type" required placeholder="Select type" options={audioTypeOptions} value={audioType} onChange={(e) => setAudioType(e.target.value)} />
              : <Input label="Audio Type" placeholder="Select export format first" value="" onChange={() => {}} className="cursor-not-allowed bg-gray-50" />
            }
            <div>
              <Label>Percentage</Label>
              <div className="relative w-full">
                <input type="text" placeholder="e.g. 100" value={pct} onChange={(e) => setPct(e.target.value ?? "")}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-blue-600">%</span>
              </div>
            </div>
            <Select label="Folder Structure" placeholder="Select structure"
              options={[{ label: "YearMonth", value: "YearMonth" }, { label: "monthYear", value: "monthYear" }, { label: "date", value: "date" }]}
              value={folderStructure} onChange={(e) => setFolderStructure(e.target.value)}
            />
            <IntegrationDestinationFields
              showFolderStructure={false}
              showFolderPath
              folderPathValue={folderPath}
              onFolderPathChange={(e) => setFolderPath(e.target.value)}
              folderPathPlaceholder="C:\\Bharatpur\\HDFC\\All\\Bharatpur\\test\\\\"
              sendFileChannelValue={sendFileChannel}
              onSendFileChannelChange={(e) => { setSendFileChannel(e.target.value); setStorageClass(""); }}
            />
          </div>

          {/* S3 sub-section */}
          {sendFileChannel === "S3" && (
            <div className="mt-4 rounded-lg border border-[#d9e2f0] bg-[#f8fbff] p-4">
              <p className="mb-3 text-xs font-semibold text-gray-700">S3 Configuration</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Bucket Region" required placeholder="Enter bucket region" value={bucketRegion} onChange={(e) => setBucketRegion(e.target.value)} />
                <Input label="Bucket Name" required placeholder="Enter bucket name" value={bucketName} onChange={(e) => setBucketName(e.target.value)} />
                <Input label="Access Key" required placeholder="Enter access key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
                <Input label="Secret Key" required type="password" placeholder="Enter secret key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
                <Select label="Storage Class" required placeholder="Select storage class" options={S3_STORAGE_CLASSES.map((v) => ({ label: v, value: v }))} value={storageClass} onChange={(e) => setStorageClass(e.target.value)} />
              </div>
            </div>
          )}

          {/* SFTP sub-section */}
          {sendFileChannel === "SFTP" && (
            <div className="mt-4 rounded-lg border border-[#d9e2f0] bg-[#f8fbff] p-4">
              <p className="mb-3 text-xs font-semibold text-gray-700">SFTP Configuration</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Server Name" required placeholder="Enter server name" value={sftpServerName} onChange={(e) => setSftpServerName(e.target.value)} />
                <Input label="Base Folder" required placeholder="Enter base folder" value={sftpBaseFolder} onChange={(e) => setSftpBaseFolder(e.target.value)} />
                <Input label="User Id" required placeholder="Enter user id" value={sftpUserId} onChange={(e) => setSftpUserId(e.target.value)} />
                <Input label="Password" required type="password" placeholder="Enter password" value={sftpPassword} onChange={(e) => setSftpPassword(e.target.value)} />
                <Input label="SSH Key" required placeholder="Enter SSH key" value={sftpSshKey} onChange={(e) => setSftpSshKey(e.target.value)} />
              </div>
            </div>
          )}

          {/* GCP sub-section */}
          {sendFileChannel === "GCP" && (
            <div className="mt-4 rounded-lg border border-[#d9e2f0] bg-[#f8fbff] p-4">
              <p className="mb-3 text-xs font-semibold text-gray-700">GCP Configuration</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Bucket Name" required placeholder="e.g. my-bucket" value={gcpBucket} onChange={(e) => setGcpBucket(e.target.value)} />
                <Input label="Project ID" required placeholder="e.g. my-project-id" value={gcpProjectId} onChange={(e) => setGcpProjectId(e.target.value)} />
                <div className="md:col-span-2">
                  <Label required>Service Account JSON</Label>
                  <textarea
                    className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
                    placeholder="Paste Service Account JSON"
                    rows={4}
                    value={gcpServiceKey}
                    onChange={(e) => setGcpServiceKey(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Azure sub-section */}
          {sendFileChannel === "AZURE" && (
            <div className="mt-4 rounded-lg border border-[#d9e2f0] bg-[#f8fbff] p-4">
              <p className="mb-3 text-xs font-semibold text-gray-700">Azure Configuration</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Storage Account Name" required placeholder="e.g. mystorageaccount" value={azureAccount} onChange={(e) => setAzureAccount(e.target.value)} />
                <Input label="Container Name" required placeholder="e.g. recordings" value={azureContainer} onChange={(e) => setAzureContainer(e.target.value)} />
                <div className="md:col-span-2">
                  <Label required>Connection String</Label>
                  <textarea
                    className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
                    placeholder="Paste connection string"
                    rows={3}
                    value={azureConnection}
                    onChange={(e) => setAzureConnection(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Local sub-section */}
          {sendFileChannel === "LOCAL" && (
            <div className="mt-4 rounded-lg border border-[#d9e2f0] bg-[#f8fbff] p-4">
              <p className="mb-3 text-xs font-semibold text-gray-700">Local Drive Configuration</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Destination Directory" required placeholder="e.g. C:\\Exports\\" value={folderPath} onChange={(e) => setFolderPath(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer ── */}
      <div className="sticky bottom-0 flex flex-shrink-0 items-center justify-between rounded-b-2xl border-t border-[#d7e1f0] bg-white/95 px-8 py-3.5 backdrop-blur">
        <div>
          <p className="text-xs text-gray-500">Save becomes available after a successful connection test and at least one filter.</p>
          <p className={`mt-0.5 text-[11px] ${isConnectionVerified ? "text-emerald-600" : "text-amber-600"}`}>
            {!hasMandatoryFilters
              ? "Add at least one filter to enable Save."
              : isConnectionVerified
                ? "Connection verified. You can save now."
                : "Run Test Connection to enable Save."}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >Cancel</button>
          <button type="button" onClick={handleTestConnection} disabled={testLoading || !canTestConnection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1a76d1] px-4 py-2 text-xs font-semibold text-[#1a76d1] hover:border-[#2C2D3F] hover:bg-[#2C2D3F] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >{testLoading ? "Testing..." : "Test Connection"}</button>
          <button type="button" onClick={handleSave} disabled={saveLoading || !isConnectionVerified || !hasMandatoryFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a76d1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2C2D3F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saveLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
