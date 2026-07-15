"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CryptoJS from "crypto-js";
import { Settings2, X } from "lucide-react";
import { Input, Label, SectionHeader } from "./Platform13PageControl";

function FeedbackModal({ open, type = "info", title, message, onOk, onCancel }) {
  if (!open) return null;
  const isSuccess = type === "success";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#d7e1f0] bg-white shadow-[0_18px_40px_rgba(17,39,82,0.2)]">
        <div className="flex items-center justify-between border-b border-[#e8eef7] px-5 py-4">
          <p className={`text-sm font-semibold ${isSuccess ? "text-[var(--brand-primary)]" : "text-[var(--brand-secondary)]"}`}>
            {title}
          </p>
          <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end border-t border-[#e8eef7] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="mr-2 rounded-md bg-[#f1f5f9] px-4 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#e2e8f0]"
          >
            Cancel
          </button>
          <button type="button" onClick={onOk} className="rounded-md bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-secondary)]">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

const decodeRowFromUrl = (dataParam) => {
  if (!dataParam) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(dataParam)));
  } catch { }
  try {
    return JSON.parse(atob(dataParam));
  } catch { }
  return null;
};

const parseUserFromSession = () => {
  try {
    const enc = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    if (!enc) return null;
    const bytes = CryptoJS.AES.decrypt(enc, "");
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const getLoggedInUserId = () => {
  const user = parseUserFromSession();
  const userId = user?.userId ?? user?.UserId ?? null;
  const n = Number(userId);
  return Number.isFinite(n) && n > 0 ? String(n) : "1";
};

export default function SimcommRecorderPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlMode = searchParams?.get("mode") || "add";
  const urlData = searchParams?.get("data") || "";
  const returnFilter = searchParams?.get("returnFilter") || "All";

  const platformId = Number(params?.platformId || 6);
  const formMode = urlMode === "edit" ? "edit" : "add";
  const backUrl = `/dashboard/integrationWorkspace?filter=${encodeURIComponent(returnFilter)}`;

  const decodedRow = useMemo(() => decodeRowFromUrl(urlData), [urlData]);

  const [form, setForm] = useState({ baseUrl: "", instanceName: "", pairingMode: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, type: "info", title: "", message: "" });
  const [pendingRedirect, setPendingRedirect] = useState(false);

  const showFeedback = (type, title, message) =>
    setFeedback({ open: true, type, title, message });

  useEffect(() => {
    if (formMode !== "edit") return;

    const appid =
      decodedRow?.appid ?? decodedRow?.AppId ?? decodedRow?.appId ?? decodedRow?.id ?? decodedRow?.Id ?? null;

    const coerceBool = (raw) => {
      if (raw === true) return true;
      if (raw === false) return false;
      if (raw === 1 || raw === 0) return Boolean(raw);
      if (typeof raw === "string") {
        const s = raw.trim().toLowerCase();
        if (!s) return false;
        if (["1", "true", "yes", "y", "on"].includes(s)) return true;
        if (["0", "false", "no", "n", "off"].includes(s)) return false;
      }
      const n = Number(raw);
      if (Number.isFinite(n)) return Boolean(n);
      return false;
    };

    let ignore = false;
    const controller = new AbortController();

    (async () => {
      // Prefer fresh fetch by id so checkbox state always reflects DB.
      if (appid) {
        try {
          const res = await fetch(
            `/api/integrationWorkspace/Simcoom-recorder/${encodeURIComponent(String(appid))}`,
            {
              headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
              signal: controller.signal,
              cache: "no-store",
            },
          );
          const json = await res.json().catch(() => ({}));
          const row = json?.data || null;
          if (!ignore && res.ok && row) {
            const baseUrl =
              row?.baseUrl ?? row?.BaseUrl ?? row?.BASEURL ?? row?.url ?? row?.URL ?? "";
            const instanceName =
              row?.instanceName ?? row?.InstanceName ?? row?.INSTANCE ?? row?.instance ?? row?.Instance ?? "";
            const pairingModeRaw =
              row?.pairingMode ??
              row?.PairingMode ??
              row?.EnablePairingMode ??
              row?.enablePairingMode ??
              false;
            setForm({
              baseUrl: String(baseUrl || ""),
              instanceName: String(instanceName || ""),
              pairingMode: coerceBool(pairingModeRaw),
            });
            return;
          }
        } catch {
          // fall back to decoded row
        }
      }

      if (!decodedRow || ignore) return;
      const baseUrl =
        decodedRow?.baseUrl ?? decodedRow?.BaseUrl ?? decodedRow?.BASEURL ?? decodedRow?.url ?? decodedRow?.URL ?? "";
      const instanceName =
        decodedRow?.instanceName ?? decodedRow?.InstanceName ?? decodedRow?.INSTANCE ?? decodedRow?.instance ?? decodedRow?.Instance ?? "";
      const pairingModeRaw =
        decodedRow?.pairingMode ??
        decodedRow?.PairingMode ??
        decodedRow?.EnablePairingMode ??
        decodedRow?.enablePairingMode ??
        false;
      setForm({
        baseUrl: String(baseUrl || ""),
        instanceName: String(instanceName || ""),
        pairingMode: coerceBool(pairingModeRaw),
      });
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [decodedRow, formMode]);

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!String(form.baseUrl || "").trim()) next.baseUrl = "Base URL is required";
    if (!String(form.instanceName || "").trim()) next.instanceName = "Recorder Name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const selectedOrgId =
        typeof window !== "undefined" ? sessionStorage.getItem("selectedOrgId") || "" : "";

      const appid =
        decodedRow?.appid ?? decodedRow?.AppId ?? decodedRow?.appId ?? decodedRow?.id ?? decodedRow?.Id ?? null;

      const payload =
        formMode === "edit"
          ? {
            baseUrl: String(form.baseUrl || "").trim(),
            instanceName: String(form.instanceName || "").trim(),
            EnablePairingMode: Boolean(form.pairingMode),
            UpdatedBy: getLoggedInUserId(),
          }
          : {
            PlatformId: platformId,
            baseUrl: String(form.baseUrl || "").trim(),
            instanceName: String(form.instanceName || "").trim(),
            EnablePairingMode: Boolean(form.pairingMode),
            Organization: selectedOrgId ? Number(selectedOrgId) : null,
            Createdby: getLoggedInUserId(),
          };

      const res = await fetch(
        formMode === "edit"
          ? `/api/integrationWorkspace/Simcoom-recorder/${encodeURIComponent(String(appid || ""))}`
          : "/api/integrationWorkspace/Simcoom-recorder",
        {
          method: formMode === "edit" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await res.json().catch(() => null);
      const serverMessage =
        result?.message ||
        result?.Message ||
        result?.error ||
        result?.Error ||
        null;

      if (!res.ok) {
        throw new Error(serverMessage || `Save failed (HTTP ${res.status})`);
      }
      if (!result?.success) {
        throw new Error(serverMessage || "Save failed.");
      }

      showFeedback("success", "Saved", result?.message || "Configuration saved successfully.");
      setPendingRedirect(true);
    } catch (e) {
      const msg = e?.message || "Save failed";
      setErrors((prev) => ({ ...prev, _form: msg }));
      setPendingRedirect(false);
      showFeedback("error", "Save Failed", msg);
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
        onCancel={() => {
          setFeedback((p) => ({ ...p, open: false }));
          setPendingRedirect(false);
        }}
        onOk={() => {
          setFeedback((p) => ({ ...p, open: false }));
          if (pendingRedirect) {
            setPendingRedirect(false);
            router.push(backUrl);
          }
        }}
      />

      {/* Header */}
      <header className="mx-4 mt-4 flex-shrink-0 rounded-2xl border border-[#d7e1f0] bg-white/95 px-6 shadow-[0_8px_22px_rgba(17,39,82,0.08)] backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backUrl)}
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
              <span className="text-[14px] font-semibold text-gray-900">Integration Configuration</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#64748b]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1 border border-[#e2e8f0]">
              <Settings2 className="h-3.5 w-3.5 text-[#94a3b8]" />
              Simcomm Recorder
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-4 mt-4 flex-1">
        <div className="rounded-2xl border border-[#d7e1f0] bg-white/95 shadow-[0_10px_28px_rgba(17,39,82,0.08)]">
          {/* Card Header */}
          <div className="border-b border-[#e8eef7] px-6 py-4">
            <SectionHeader icon={Settings2} tag="Simcomm Recorder" title="Connection Details" />
            <p className="mt-1 text-[12px] text-[#64748b]">Provide Simcomm Recorder connection settings.</p>
          </div>

          {/* Card Body */}
          <div className="px-6 py-5">
            {/* Form error */}
            {errors._form && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                {errors._form}
              </div>
            )}

            {/* ✅ All fields inside ONE grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Base URL */}
              <div>
                <Label required>Base URL</Label>
                <Input
                  value={form.baseUrl}
                  onChange={setField("baseUrl")}
                  placeholder="https://your-simcomm-host"
                />
                {errors.baseUrl && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.baseUrl}</p>
                )}
              </div>

              {/* Recorder Name */}
              <div>
                <Label required>Recorder Name</Label>
                <Input
                  value={form.instanceName}
                  onChange={setField("instanceName")}
                  placeholder="e.g. PROD-1"
                />
                {errors.instanceName && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600">{errors.instanceName}</p>
                )}
              </div>

              {/* Pairing Mode — inside grid with col-span-2 */}
              <div className="col-span-1 md:col-span-2">
                <label
                  className="flex items-center gap-3 cursor-pointer w-full rounded-xl border border-[#d7e1f0] bg-[#f8fafc] px-4 py-3 hover:bg-[#f1f5fd] transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: form.pairingMode ? "var(--brand-primary)" : "#fff",
                      borderColor: form.pairingMode ? "var(--brand-primary)" : "#d7e1f0",
                    }}
                  >
                    {form.pairingMode && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.pairingMode || false}
                    onChange={(e) => setForm((prev) => ({ ...prev, pairingMode: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-[#0f172a]">Enable Pairing Mode</p>
                    <p className="text-[11px] text-[#64748b]">Configure as part of recorder pair</p>
                  </div>
                </label>
              </div>

            </div>
            {/* END grid */}

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-[#e8eef7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => router.push(backUrl)}
                className="rounded-xl border border-[#d7e1f0] bg-white px-4 py-2 text-[12px] font-bold text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl bg-[var(--brand-primary)] px-5 py-2 text-[12px] font-bold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast (legacy) */}
      {toast && null}
    </div>
  );
}
