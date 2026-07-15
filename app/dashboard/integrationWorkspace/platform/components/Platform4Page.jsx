"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Settings2,
  X,
} from "lucide-react";
import CryptoJS from "crypto-js";
import { Input, Label, SectionHeader, Select } from "./Platform13PageControl";
import IntegrationDestinationFields from "./IntegrationDestinationFields";

const PLATFORM_ID = 4;
const SCHEDULE_TYPE_OPTIONS = [
  { label: "Daily", value: "DAILY" },
  { label: "Hourly", value: "HOURLY" },
];

const S3_STORAGE_CLASSES = [
  "STANDARD",
  "STANDARD_IA",
  "ONEZONE_IA",
  "INTELLIGENT_TIERING",
  "GLACIER",
  "GLACIER_IR",
  "DEEP_ARCHIVE",
];

const parseRegionFromConnectEndpoint = (value) => {
  try {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    const host = text.startsWith("http")
      ? new URL(text).host
      : text.replace(/^https?:\/\//, "").split("/")[0];
    const match = host.match(/^connect\.([a-z0-9-]+)\.amazonaws\.com$/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
};

function FeedbackModal({ open, type = "info", title, message, onClose }) {
  if (!open) return null;
  const isSuccess = type === "success";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#d7e1f0] bg-white shadow-[0_18px_40px_rgba(17,39,82,0.2)]">
        <div className="flex items-center justify-between border-b border-[#e8eef7] px-5 py-4">
          <p
            className={`text-sm font-semibold ${isSuccess ? "text-[var(--brand-primary)]" : "text-[var(--brand-secondary)]"}`}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end border-t border-[#e8eef7] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  required,
  placeholder,
  value,
  onChange,
  icon,
  hint,
  className = "",
}) {
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
          className={`w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

const decodeRowFromUrl = (dataParam) => {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(dataParam)));
  } catch {
    return null;
  }
};

const safeTrim = (value) => String(value ?? "").trim();

const toDatetimeLocal = (value) => {
  try {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
};

const parseUserFromSession = () => {
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
};

const getLoggedInUserId = () => {
  const user = parseUserFromSession();
  const userId = user?.userId ?? user?.UserId ?? user?.id ?? null;
  const asNumber = Number(userId);
  return Number.isFinite(asNumber) && asNumber > 0 ? String(asNumber) : "1";
};

const getCurrentUserName = () => {
  const user = parseUserFromSession();
  return user?.userName || user?.username || user?.name || "";
};

const extractCreatedAppId = (json) =>
  json?.data?.output?.appid ??
  json?.data?.output?.output?.appid ??
  json?.output?.appid ??
  null;

export default function Platform4Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFilter = searchParams?.get("returnFilter") || "CCaaS";
  const urlMode = searchParams?.get("mode");
  const urlData = searchParams?.get("data");
  const [rootOrgId, setRootOrgId] = useState(null);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    nextUrl: null,
  });

  const backUrl =
    returnFilter && returnFilter !== "All"
      ? `/dashboard/integrationWorkspace?filter=${encodeURIComponent(returnFilter)}`
      : "/dashboard/integrationWorkspace";

  const initialForm = useMemo(
    () => ({
      Instance_Name: "",
      Intance_Id: "",
      Region_Endpoint: "",
      TimeZone: "",
      Start_Time: "",
      End_Time: "",
      Frequency: "",
      HourlyInterval: "",
      FileFormat: "",
      Transcription: "YES",
      DestDirectory: "",
      FolderStructure: "",
      SendFileChannel: "",
      // GCP
      GcpBucket: "",
      GcpProjectId: "",
      GcpServiceKey: "",
      // Azure
      AzureAccount: "",
      AzureContainer: "",
      AzureConnection: "",

      // S3
      BucketRegion: "",
      BucketName: "",
      AccessKey: "",
      SecretKey: "",
      StorageClass: "",

      // SFTP
      SftpServerName: "",
      SftpBaseFolder: "",
      SftpUserId: "",
      SftpPassword: "",
      SftpSshKey: "",

      OAuthTokenUrl: "",
      OAuthBaseUrl: "",
      OAuthRedirectUri: "",
      OAuthClientId: "",
      OAuthClientSecret: "",
      Token: "",
      TokenType: "",
      TokenExpiresInSeconds: "",
      RefreshToken: "",
      RefreshTokenExpiresInSeconds: "",
      ServiceName: "connect",
      AWSRegion: "",
    }),
    [],
  );

  const [formMode, setFormMode] = useState(() =>
    urlMode === "edit" ? "edit" : "add",
  );
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false);
  const [timeZoneOptions, setTimeZoneOptions] = useState([]);
  const [timeZoneLoading, setTimeZoneLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fetchRootOrganization = async () => {
    const selectedOrgId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("selectedOrgId") || ""
        : "";
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
      if (!res.ok)
        return { orgId: Number(selectedOrgId) || null, orgName: null };
      const result = await res.json();
      const root = result?.organizations?.[0] || null;
      return {
        orgId: Number(root?.id) || Number(selectedOrgId) || null,
        orgName: root?.name || root?.organizationName || null,
      };
    } catch {
      return { orgId: Number(selectedOrgId) || null, orgName: null };
    }
  };

  useEffect(() => {
    (async () => {
      const root = await fetchRootOrganization();
      setRootOrgId(root?.orgId ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setTimeZoneLoading(true);
        const res = await fetch("/api/timezone", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const r = await res.json();
        if (res.ok && r.success) {
          const opts = Array.isArray(r.data)
            ? r.data
                .map((i) => i?.TimeZone || i?.timezone || i?.name || "")
                .filter(Boolean)
            : [];
          setTimeZoneOptions(opts);
        } else {
          setTimeZoneOptions([]);
        }
      } catch (e) {
        console.error(e);
        setTimeZoneOptions([]);
      } finally {
        setTimeZoneLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const row = decodeRowFromUrl(urlData);
    if (!row) return;

    const normalizedInterval = Number(
      row?.intervalInMinute ?? row?.IntervalInMinute ?? row?.interval ?? NaN,
    );
    const derivedScheduleType =
      Number.isFinite(normalizedInterval) && normalizedInterval > 0
        ? normalizedInterval % 1440 === 0
          ? "DAILY"
          : normalizedInterval % 60 === 0
            ? "HOURLY"
            : "DAILY"
        : "";

    setFormMode(urlMode === "edit" ? "edit" : "add");
    setEditId(row?.Id ?? row?.id ?? row?.appid ?? null);
    setForm({
      Instance_Name:
        row?.Instance_Name ?? row?.InstanceName ?? row?.instanceName ?? "",
      Intance_Id:
        row?.Intance_Id ??
        row?.AWSConnectInstanceId ??
        row?.awsConnectInstanceId ??
        row?.instanceId ??
        row?.instanceid ??
        "",
      Region_Endpoint:
        row?.Region_Endpoint ??
        row?.sourceregionendpoint ??
        row?.sourceRegionEndpoint ??
        row?.regionEndpoint ??
        "",
      TimeZone: row?.TimeZone ?? row?.timezone ?? row?.timeZone ?? "",
      Start_Time: toDatetimeLocal(
        row?.Start_Time ?? row?.dtLastFetchDateTime ?? row?.startTime ?? "",
      ),
      End_Time: toDatetimeLocal(
        row?.End_Time ?? row?.ExpiryTime ?? row?.endTime ?? "",
      ),
      Frequency:
        row?.Frequency ??
        row?.frequency ??
        row?.ScheduleType ??
        row?.scheduleType ??
        derivedScheduleType ??
        "",
      HourlyInterval:
        String(
          row?.HourlyInterval ??
            row?.hourlyInterval ??
            (derivedScheduleType === "HOURLY" &&
            Number.isFinite(normalizedInterval)
              ? normalizedInterval / 60
              : ""),
        ) || "",
      FileFormat:
        row?.FileFormat ??
        row?.fileFormat ??
        row?.ExportFormat ??
        row?.exportFormat ??
        "",
      Transcription:
        String(
          row?.Transcription ??
            row?.transcription ??
            row?.IsTranscription ??
            row?.isTranscription ??
            "YES",
        ).toUpperCase() === "NO"
          ? "NO"
          : "YES",
      DestDirectory:
        row?.DestDirectory ??
        row?.destDirectory ??
        row?.Destdirectory ??
        row?.destdirectory ??
        row?.FolderPath ??
        row?.folderPath ??
        "",
      FolderStructure:
        row?.FolderStructure ??
        row?.folderStructure ??
        row?.FolderStrtucture ??
        row?.folderStrtucture ??
        "",
      SendFileChannel:
        row?.SendFileChannel ??
        row?.sendFileChannel ??
        row?.sendFile ??
        row?.Send_File_Channel ??
        "",

      GcpBucket: row?.GcpBucket ?? row?.gcpBucket ?? row?.GCPBucket ?? "",
      GcpProjectId:
        row?.GcpProjectId ?? row?.gcpProjectId ?? row?.GCPProjectId ?? "",
      GcpServiceKey:
        row?.GcpServiceKey ?? row?.gcpServiceKey ?? row?.GCPServiceKey ?? "",
      AzureAccount:
        row?.AzureAccount ??
        row?.azureAccount ??
        row?.AzureStorageAccount ??
        "",
      AzureContainer:
        row?.AzureContainer ??
        row?.azureContainer ??
        row?.AzureStorageContainer ??
        "",
      AzureConnection:
        row?.AzureConnection ??
        row?.azureConnection ??
        row?.AzureConnectionString ??
        "",

      BucketRegion:
        row?.BucketRegion ?? row?.bucketRegion ?? row?.S3BucketRegion ?? "",
      BucketName:
        row?.BucketName ??
        row?.bucketName ??
        row?.sourcebucketname ??
        row?.SourceBucketName ??
        row?.S3BucketName ??
        "",
      AccessKey: row?.AccessKey ?? row?.accessKey ?? row?.S3AccessKey ?? "",
      SecretKey: row?.SecretKey ?? row?.secretKey ?? row?.S3SecretKey ?? "",
      StorageClass:
        row?.StorageClass ?? row?.storageClass ?? row?.S3StorageClass ?? "",

      SftpServerName: row?.SftpServerName ?? row?.sftpServerName ?? "",
      SftpBaseFolder: row?.SftpBaseFolder ?? row?.sftpBaseFolder ?? "",
      SftpUserId: row?.SftpUserId ?? row?.sftpUserId ?? "",
      SftpPassword: row?.SftpPassword ?? row?.sftpPassword ?? "",
      SftpSshKey: row?.SftpSshKey ?? row?.sftpSshKey ?? "",

      OAuthTokenUrl:
        row?.OAuthTokenUrl ??
        row?.tokenUrl ??
        row?.TokenUrl ??
        row?.Tokenurl ??
        row?.Tokenurl ??
        row?.oauthTokenUrl ??
        "",
      OAuthBaseUrl:
        row?.OAuthBaseUrl ??
        row?.baseUrl ??
        row?.BaseUrl ??
        row?.oauthBaseUrl ??
        "",
      OAuthRedirectUri:
        row?.OAuthRedirectUri ??
        row?.redirectUri ??
        row?.RedirectUri ??
        row?.Redirect_URI ??
        row?.oauthRedirectUri ??
        "",
      OAuthClientId:
        row?.OAuthClientId ??
        row?.SourceAccessKeyAmazonConnect ??
        row?.sourceAccessKeyAmazonConnect ??
        row?.clientId ??
        row?.ClientId ??
        row?.oauthClientId ??
        "",
      OAuthClientSecret:
        row?.OAuthClientSecret ??
        row?.SourceSecretKeyAmazonConnect ??
        row?.sourceSecretKeyAmazonConnect ??
        row?.ClientSecret ??
        row?.clientSecret ??
        row?.oauthClientSecret ??
        "",
      Token: row?.Token ?? row?.token ?? "",
      TokenType: row?.TokenType ?? row?.token_type ?? row?.tokenType ?? "",
      TokenExpiresInSeconds: String(
        row?.TokenExpiresInSeconds ?? row?.tokenExpiresInSeconds ?? "",
      ),
      RefreshToken:
        row?.RefreshToken ?? row?.refresh_token ?? row?.refreshToken ?? "",
      RefreshTokenExpiresInSeconds: String(
        row?.RefreshTokenExpiresInSeconds ??
          row?.refresh_token_expiresInSec ??
          row?.refreshTokenExpiresInSeconds ??
          "",
      ),
      ServiceName:
        row?.ServiceName ??
        row?.serviceName ??
        row?.Service_Name ??
        row?.service ??
        "connect",
      AWSRegion:
        row?.AwsConnectRegion ??
        row?.awsConnectRegion ??
        row?.AWSRegion ??
        row?.awsRegion ??
        row?.Region ??
        row?.region ??
        "",
    });
  }, [urlData, urlMode]);

  const validateForSave = () => {
    const next = {};
    if (!safeTrim(form.Instance_Name))
      next.Instance_Name = "Instance Name is required.";
    if (!safeTrim(form.Intance_Id))
      next.Intance_Id = "Instance Id is required.";
    if (!safeTrim(form.Region_Endpoint))
      next.Region_Endpoint = "Region Endpoint is required.";

    const derivedRegion = parseRegionFromConnectEndpoint(form.Region_Endpoint);
    if (!safeTrim(form.AWSRegion) && !derivedRegion)
      next.AWSRegion = "AWS Region is required.";

    if (!safeTrim(form.OAuthBaseUrl))
      next.OAuthBaseUrl = "Base URL is required.";
    if (!safeTrim(form.OAuthClientId))
      next.OAuthClientId = "Access Key is required.";
    if (!safeTrim(form.OAuthClientSecret))
      next.OAuthClientSecret = "Secret Key is required.";

    const channel = String(form.SendFileChannel || "").toUpperCase();
    if (channel === "S3") {
      if (!safeTrim(form.BucketRegion))
        next.BucketRegion = "Bucket Region is required.";
      if (!safeTrim(form.BucketName))
        next.BucketName = "Bucket Name is required.";
      if (!safeTrim(form.AccessKey)) next.AccessKey = "Access Key is required.";
      if (!safeTrim(form.SecretKey)) next.SecretKey = "Secret Key is required.";
      if (!safeTrim(form.StorageClass))
        next.StorageClass = "Storage Class is required.";
    }
    if (channel === "SFTP") {
      if (!safeTrim(form.SftpServerName))
        next.SftpServerName = "Server Name is required.";
      if (!safeTrim(form.SftpBaseFolder))
        next.SftpBaseFolder = "Base Folder is required.";
      if (!safeTrim(form.SftpUserId)) next.SftpUserId = "User Id is required.";
      if (!safeTrim(form.SftpPassword))
        next.SftpPassword = "Password is required.";
      if (!safeTrim(form.SftpSshKey)) next.SftpSshKey = "SSH Key is required.";
    }
    if (channel === "GCP") {
      if (!safeTrim(form.GcpBucket))
        next.GcpBucket = "Bucket Name is required.";
      if (!safeTrim(form.GcpProjectId))
        next.GcpProjectId = "Project ID is required.";
      if (!safeTrim(form.GcpServiceKey))
        next.GcpServiceKey = "Service Account JSON is required.";
    }
    if (channel === "AZURE") {
      if (!safeTrim(form.AzureAccount))
        next.AzureAccount = "Storage Account Name is required.";
      if (!safeTrim(form.AzureContainer))
        next.AzureContainer = "Container Name is required.";
      if (!safeTrim(form.AzureConnection))
        next.AzureConnection = "Connection String is required.";
    }
    if (channel === "LOCAL") {
      if (!safeTrim(form.DestDirectory))
        next.DestDirectory = "Destination Directory is required.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateForTest = () => {
    const next = {};
    if (!safeTrim(form.Intance_Id))
      next.Intance_Id = "Instance Id is required.";
    if (!safeTrim(form.OAuthClientId))
      next.OAuthClientId = "Access Key is required.";
    if (!safeTrim(form.OAuthClientSecret))
      next.OAuthClientSecret = "Secret Key is required.";
    if (!safeTrim(form.OAuthBaseUrl))
      next.OAuthBaseUrl = "Base URL is required.";
    if (!safeTrim(form.Start_Time)) next.Start_Time = "Start Time is required.";
    if (!safeTrim(form.End_Time)) next.End_Time = "Expiry Time is required.";

    const derivedRegion = parseRegionFromConnectEndpoint(form.Region_Endpoint);
    if (!safeTrim(form.AWSRegion) && !derivedRegion) {
      next.AWSRegion =
        "AWS Region is required (or provide Connect endpoint like connect.us-east-1.amazonaws.com).";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const showFeedback = (type, title, message, nextUrl = null) =>
    setFeedback({ open: true, type, title, message, nextUrl });

  const handleFeedbackClose = () => {
    const nextUrl = feedback?.nextUrl;
    setFeedback((prev) => ({ ...prev, open: false, nextUrl: null }));
    if (nextUrl) router.push(nextUrl);
  };

  const canSave = !saving;
  const canSaveAfterTest = hasVerifiedOnce || isConnectionVerified;

  const handleTestConnection = async () => {
    if (!validateForTest()) return;
    setTestLoading(true);
    setIsConnectionVerified(false);
    try {
      const token = process.env.NEXT_PUBLIC_API_TOKEN;
      const startEpoch = Math.floor(new Date(form.Start_Time).getTime() / 1000);
      const endEpoch = Math.floor(new Date(form.End_Time).getTime() / 1000);
      const derivedRegion = parseRegionFromConnectEndpoint(
        form.Region_Endpoint,
      );
      const trimmedBaseUrl = safeTrim(form.OAuthBaseUrl);
      const connectUrlFromBase = trimmedBaseUrl
        ? `${trimmedBaseUrl.replace(/\/+$/, "")}/search-contacts`
        : "";
      const res = await fetch(
        "/api/integrationWorkspace/amazon-connect/test-connection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            loggedInUserId: getLoggedInUserId(),
          },
          body: JSON.stringify({
            AccessKey: form.OAuthClientId,
            SecretKey: form.OAuthClientSecret,
            AWSRegion: form.AWSRegion || derivedRegion || "",
            ServiceName: "connect",
            InstanceId: form.Intance_Id,
            connectUrl: connectUrlFromBase,
            TimeRange: {
              Type: "INITIATION_TIMESTAMP",
              StartTime: startEpoch,
              EndTime: endEpoch,
            },
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Test connection failed.");
      }
      setIsConnectionVerified(true);
      setHasVerifiedOnce(true);
      showFeedback(
        "success",
        "Connection Verified",
        json?.message || "Connection verified.",
      );
    } catch (e) {
      console.error(e);
      setIsConnectionVerified(false);
      showFeedback(
        "error",
        "Test Connection Failed",
        e?.message || "Failed to test connection.",
      );
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForSave()) return;
    setSaving(true);
    try {
      const token = process.env.NEXT_PUBLIC_API_TOKEN;
      const createdBy = getCurrentUserName();
      const endpoint =
        formMode === "edit"
          ? "/api/integrationWorkspace/amazon-connect/update"
          : "/api/integrationWorkspace/amazon-connect/save";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          loggedInUserId: getLoggedInUserId(),
        },
        body: JSON.stringify({
          platformid: PLATFORM_ID,
          OrgId: rootOrgId,
          ...(formMode === "edit"
            ? { Id: editId, modifiedBy: createdBy }
            : { createdBy }),
          ...form,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save configuration.");
      }

      const successMessage =
        json?.message || "Configuration saved successfully.";

      // Match Platform 13 flow:
      // - Edit mode: save only (no next pages)
      // - Add mode: after save go to Column Mapping
      if (formMode === "edit") {
        showFeedback("success", "Saved", successMessage, backUrl);
        return;
      }

      const createdAppId = extractCreatedAppId(json);
      try {
        if (
          typeof window !== "undefined" &&
          createdAppId !== null &&
          createdAppId !== undefined
        ) {
          sessionStorage.setItem("lastIntegrationAppId", String(createdAppId));
        }
      } catch {}

      if (
        createdAppId !== null &&
        createdAppId !== undefined &&
        String(createdAppId).trim() !== ""
      ) {
        const nextUrl = `/dashboard/integrationWorkspace/column-mapping/4?appid=${createdAppId}&returnFilter=${encodeURIComponent(returnFilter)}`;
        showFeedback("success", "Saved", successMessage, nextUrl);
        return;
      }

      showFeedback("success", "Saved", successMessage, backUrl);
    } catch (e) {
      console.error(e);
      showFeedback(
        "error",
        "Save Failed",
        e?.message || "Failed to save configuration.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(circle at 8% -10%, rgba(26,118,209,0.08), transparent 36%), linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)",
      }}
    >
      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={handleFeedbackClose}
      />
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
              <span className="text-[14px] font-semibold text-gray-900">
                Amazon Connect Configuration
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#64748b]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1 border border-[#e2e8f0]">
              <Cloud className="h-3.5 w-3.5 text-[#94a3b8]" />
              Amazon Connect
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto w-full overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_36px_rgba(17,39,82,0.10)]">
          <div className="border-b border-[#eef3f8] bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8fd_100%)] px-6 py-4">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
              Amazon Connect Configuration
            </p>
            <p className="mt-1 text-[12px] text-[#64748b]">
              Fill in details and save the configuration.
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <SectionHeader
                  icon={Settings2}
                  tag="SOURCE"
                  title="Source Configuration"
                />
              </div>
              <Input
                label="Instance Name"
                required
                placeholder="Enter instance name"
                value={form.Instance_Name}
                onChange={setField("Instance_Name")}
              />
              {errors.Instance_Name ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.Instance_Name}
                </p>
              ) : null}

              <Input
                label="Instance Id"
                required
                placeholder="Enter instance id"
                value={form.Intance_Id}
                onChange={setField("Intance_Id")}
              />
              {errors.Intance_Id ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.Intance_Id}
                </p>
              ) : null}

              <Input
                label="AWS Region"
                required
                placeholder="e.g. us-east-1"
                value={form.AWSRegion}
                onChange={setField("AWSRegion")}
              />
              {errors.AWSRegion ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.AWSRegion}
                </p>
              ) : null}

              <Input
                label="Region Endpoint"
                required
                placeholder="e.g. https://connect.us-east-1.amazonaws.com/search-contacts"
                value={form.Region_Endpoint}
                onChange={setField("Region_Endpoint")}
              />
              {errors.Region_Endpoint ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.Region_Endpoint}
                </p>
              ) : null}

              <div className="md:col-span-2">
                <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                  OAuth Endpoints
                </p>
                <p className="text-[12px] text-[#64748b]">
                  Authentication URLs and redirect URLs
                </p>
              </div>

              <Input
                label="Token URL"
                placeholder="https://auth.example.com/oauth/token"
                icon={<Link2 className="h-3.5 w-3.5" />}
                value={form.OAuthTokenUrl}
                onChange={setField("OAuthTokenUrl")}
              />
              {errors.OAuthTokenUrl ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.OAuthTokenUrl}
                </p>
              ) : null}

              <Input
                label="Base URL"
                required
                placeholder="https://api.example.com/v1"
                icon={<Link2 className="h-3.5 w-3.5" />}
                value={form.OAuthBaseUrl}
                onChange={setField("OAuthBaseUrl")}
              />
              {errors.OAuthBaseUrl ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.OAuthBaseUrl}
                </p>
              ) : null}

              <Input
                label="Redirect URL"
                placeholder="https://yourapp.com/auth/callback"
                icon={<Link2 className="h-3.5 w-3.5" />}
                value={form.OAuthRedirectUri}
                onChange={setField("OAuthRedirectUri")}
              />
              {errors.OAuthRedirectUri ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.OAuthRedirectUri}
                </p>
              ) : null}

              <div className="md:col-span-2 mt-2">
                <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                  Access Keys
                </p>
                <p className="text-[12px] text-[#64748b]">
                  AWS access key and secret key
                </p>
              </div>

              <Input
                label="Access Key"
                required
                placeholder="AKIAIOSFODNN7EXAMPLE"
                icon={<KeyRound className="h-3.5 w-3.5" />}
                value={form.OAuthClientId}
                onChange={setField("OAuthClientId")}
              />
              {errors.OAuthClientId ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.OAuthClientId}
                </p>
              ) : null}

              <PasswordInput
                label="Secret Key"
                required
                placeholder="••••••••••••••••"
                icon={<KeyRound className="h-3.5 w-3.5" />}
                value={form.OAuthClientSecret}
                onChange={setField("OAuthClientSecret")}
              />
              {errors.OAuthClientSecret ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.OAuthClientSecret}
                </p>
              ) : null}

              <div className="md:col-span-2 mt-2">
                <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                  Access & Refresh Tokens
                </p>
                <p className="text-[12px] text-[#64748b]">
                  Token values and expiry durations
                </p>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Token"
                  placeholder="Paste access token"
                  value={form.Token}
                  onChange={setField("Token")}
                />
              </div>

              <Input
                label="Token Type"
                placeholder="e.g. Bearer"
                value={form.TokenType}
                onChange={setField("TokenType")}
              />

              <Input
                label="Token Expires In (seconds)"
                type="number"
                placeholder="e.g. 3600"
                value={form.TokenExpiresInSeconds}
                onChange={setField("TokenExpiresInSeconds")}
              />

              <Input
                label="Refresh Token"
                placeholder="Paste refresh token"
                value={form.RefreshToken}
                onChange={setField("RefreshToken")}
              />

              <Input
                label="Refresh Token Expires In (seconds)"
                type="number"
                placeholder="e.g. 86400"
                value={form.RefreshTokenExpiresInSeconds}
                onChange={setField("RefreshTokenExpiresInSeconds")}
              />

              <Select
                label="MetaData File Frequency"
                placeholder="Select schedule type"
                value={form.Frequency}
                onChange={setField("Frequency")}
                options={SCHEDULE_TYPE_OPTIONS}
              />

              <Select
                label="Transcription"
                placeholder="Select"
                value={form.Transcription}
                onChange={setField("Transcription")}
                options={[
                  { label: "Yes", value: "YES" },
                  { label: "No", value: "NO" },
                ]}
              />

              {String(form.Frequency || "").toUpperCase() === "HOURLY" ? (
                <Input
                  label="Hourly Interval"
                  required
                  type="number"
                  placeholder="Enter hours"
                  min="1"
                  max="48"
                  hint="Allowed range is 1 to 48 hours."
                  value={form.HourlyInterval}
                  onChange={setField("HourlyInterval")}
                />
              ) : null}

              <Select
                label="Time Zone"
                placeholder={
                  timeZoneLoading ? "Loading time zones..." : "Select time zone"
                }
                value={form.TimeZone}
                onChange={setField("TimeZone")}
                options={timeZoneOptions}
                disabled={timeZoneLoading || timeZoneOptions.length === 0}
              />

              <Input
                label="Start Time"
                type="datetime-local"
                value={form.Start_Time}
                onChange={setField("Start_Time")}
              />
              {errors.Start_Time ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.Start_Time}
                </p>
              ) : null}

              <Input
                label="Expiry Time"
                type="datetime-local"
                value={form.End_Time}
                onChange={setField("End_Time")}
              />
              {errors.End_Time ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {errors.End_Time}
                </p>
              ) : null}

              <div className="md:col-span-2 mt-4">
                <SectionHeader
                  icon={Cloud}
                  tag="DESTINATION"
                  title="Destination Configuration"
                />
              </div>

              <IntegrationDestinationFields
                showFileFormat={false}
                fileFormatValue={form.FileFormat}
                onFileFormatChange={setField("FileFormat")}
                showDestDirectory
                destDirectoryValue={form.DestDirectory}
                onDestDirectoryChange={setField("DestDirectory")}
                folderStructureValue={form.FolderStructure}
                onFolderStructureChange={setField("FolderStructure")}
                sendFileChannelValue={form.SendFileChannel}
                onSendFileChannelChange={setField("SendFileChannel")}
                showSendFileChannel={false}
              />

              <Select
                label="Send File"
                placeholder="Select channel"
                value={form.SendFileChannel}
                onChange={setField("SendFileChannel")}
                options={[
                  { label: "S3", value: "S3" },
                  { label: "SFTP", value: "SFTP" },
                  { label: "GCP", value: "GCP" },
                  { label: "Azure", value: "AZURE" },
                  { label: "Local Drive", value: "LOCAL" },
                ]}
              />

              {String(form.SendFileChannel || "").toUpperCase() === "S3" ? (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">
                    S3 Configuration
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label="File Format"
                      placeholder="Select file format"
                      value={form.FileFormat}
                      onChange={setField("FileFormat")}
                      options={[
                        { label: "MP3", value: "MP3" },
                        { label: "MP4", value: "MP4" },
                        { label: "WAV", value: "WAV" },
                      ]}
                    />

                    <Input
                      label="Bucket Region"
                      required
                      placeholder="e.g. us-east-1"
                      value={form.BucketRegion}
                      onChange={setField("BucketRegion")}
                    />
                    {errors.BucketRegion ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.BucketRegion}
                      </p>
                    ) : null}

                    <Input
                      label="Bucket Name"
                      required
                      placeholder="e.g. my-recordings-bucket"
                      value={form.BucketName}
                      onChange={setField("BucketName")}
                    />
                    {errors.BucketName ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.BucketName}
                      </p>
                    ) : null}

                    <Input
                      label="Access Key"
                      required
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={form.AccessKey}
                      onChange={setField("AccessKey")}
                    />
                    {errors.AccessKey ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.AccessKey}
                      </p>
                    ) : null}

                    <Input
                      label="Secret Key"
                      required
                      type="password"
                      placeholder="••••••••••••••••"
                      value={form.SecretKey}
                      onChange={setField("SecretKey")}
                    />
                    {errors.SecretKey ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SecretKey}
                      </p>
                    ) : null}

                    <Select
                      label="Storage Class"
                      required
                      placeholder="Select storage class"
                      value={form.StorageClass}
                      onChange={setField("StorageClass")}
                      options={S3_STORAGE_CLASSES.map((v) => ({
                        label: v,
                        value: v,
                      }))}
                    />
                    {errors.StorageClass ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.StorageClass}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {String(form.SendFileChannel || "").toUpperCase() === "SFTP" ? (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">
                    SFTP Configuration
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Server Name"
                      required
                      placeholder="e.g. sftp.example.com"
                      value={form.SftpServerName}
                      onChange={setField("SftpServerName")}
                    />
                    <Input
                      label="Base Folder"
                      required
                      placeholder="e.g. /uploads/recordings"
                      value={form.SftpBaseFolder}
                      onChange={setField("SftpBaseFolder")}
                    />
                    <Input
                      label="User ID"
                      required
                      placeholder="e.g. sftp_user"
                      value={form.SftpUserId}
                      onChange={setField("SftpUserId")}
                    />
                    <PasswordInput
                      label="Password"
                      required
                      placeholder="••••••••••••••••"
                      value={form.SftpPassword}
                      onChange={setField("SftpPassword")}
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="SSH Key"
                        required
                        placeholder="Paste your SSH public key here"
                        value={form.SftpSshKey}
                        onChange={setField("SftpSshKey")}
                      />
                    </div>
                    {errors.SftpServerName ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SftpServerName}
                      </p>
                    ) : null}
                    {errors.SftpBaseFolder ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SftpBaseFolder}
                      </p>
                    ) : null}
                    {errors.SftpUserId ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SftpUserId}
                      </p>
                    ) : null}
                    {errors.SftpPassword ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SftpPassword}
                      </p>
                    ) : null}
                    {errors.SftpSshKey ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.SftpSshKey}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {String(form.SendFileChannel || "").toUpperCase() === "GCP" ? (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">
                    GCP Configuration
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Bucket Name"
                      required
                      placeholder="e.g. my-bucket"
                      value={form.GcpBucket}
                      onChange={setField("GcpBucket")}
                    />
                    {errors.GcpBucket ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.GcpBucket}
                      </p>
                    ) : null}

                    <Input
                      label="Project ID"
                      required
                      placeholder="e.g. my-project-id"
                      value={form.GcpProjectId}
                      onChange={setField("GcpProjectId")}
                    />
                    {errors.GcpProjectId ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.GcpProjectId}
                      </p>
                    ) : null}

                    <div className="md:col-span-2">
                      <Label required>Service Account JSON</Label>
                      <textarea
                        className="w-full rounded-lg border border-[#d9e2f0] bg-[#fbfcff] px-3 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 hover:border-[#b8c9e4] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
                        placeholder="Paste Service Account JSON"
                        rows={4}
                        value={form.GcpServiceKey}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            GcpServiceKey: e.target.value,
                          }));
                        }}
                      />
                      {errors.GcpServiceKey ? (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.GcpServiceKey}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {String(form.SendFileChannel || "").toUpperCase() === "AZURE" ? (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">
                    Azure Configuration
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Storage Account Name"
                      required
                      placeholder="e.g. mystorageaccount"
                      value={form.AzureAccount}
                      onChange={setField("AzureAccount")}
                    />
                    {errors.AzureAccount ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.AzureAccount}
                      </p>
                    ) : null}

                    <Input
                      label="Container Name"
                      required
                      placeholder="e.g. recordings"
                      value={form.AzureContainer}
                      onChange={setField("AzureContainer")}
                    />
                    {errors.AzureContainer ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.AzureContainer}
                      </p>
                    ) : null}

                    <div className="md:col-span-2">
                      <PasswordInput
                        label="Connection String"
                        required
                        placeholder="Paste connection string"
                        value={form.AzureConnection}
                        onChange={setField("AzureConnection")}
                      />
                      {errors.AzureConnection ? (
                        <p className="mt-1 text-[11px] font-semibold text-red-600">
                          {errors.AzureConnection}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {String(form.SendFileChannel || "").toUpperCase() === "LOCAL" ? (
                <div className="md:col-span-2 mt-2 rounded-xl border border-[#d7e1f0] bg-[#f8fbff] p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-700">
                    Local Drive Configuration
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Destination Directory"
                      required
                      placeholder="e.g. C:\\Exports\\"
                      value={form.DestDirectory}
                      onChange={setField("DestDirectory")}
                    />
                    {errors.DestDirectory ? (
                      <p className="md:col-span-2 -mt-3 text-[11px] font-semibold text-red-600">
                        {errors.DestDirectory}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#eef3f8] bg-white/95 px-6 py-4">
            <div>
              <p className="text-xs text-gray-500">
                Save becomes available after a successful connection test.
              </p>
              <p
                className={`mt-0.5 text-[11px] ${canSaveAfterTest ? "text-emerald-600" : "text-amber-600"}`}
              >
                {canSaveAfterTest
                  ? "Connection verified. You can save now."
                  : "Run Test Connection to enable Save."}
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
                {testLoading
                  ? "Testing..."
                  : canSaveAfterTest
                    ? "Verified"
                    : "Test Connection"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || !canSaveAfterTest}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
