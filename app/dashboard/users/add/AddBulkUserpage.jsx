// app/dashboard/users/add/AddBulkUserpage.jsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import CryptoJS from "crypto-js";
import { Button } from "@/components/ui/button";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
import { Label } from "@/components/ui/label";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";
import * as XLSX from "xlsx";
import { z } from "zod";

// ── Error Modal Component ────────────────────────────────────────────────────
const ErrorModal = ({
  isOpen,
  title,
  message,
  errors = [],
  onDownload,
  onClose,
}) => {
  if (!isOpen) return null;

  // ── Categorise errors for the summary bar ──────────────────────────────
  const categorize = (errs) => {
    let duplicate = 0;
    let validation = 0;

    errs.forEach((e) => {
      const lower = e.toLowerCase();
      if (lower.includes("duplicat")) duplicate++;
      else validation++;
    });

    return { duplicate, validation };
  };

  const { duplicate, validation } = categorize(errors);

  // Show first 10 inline; rest only in the download
  const PREVIEW_LIMIT = 10;
  const previewErrors = errors.slice(0, PREVIEW_LIMIT);
  const hiddenCount = errors.length - PREVIEW_LIMIT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </span>
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Description */}
          {message && <p className="text-xs text-gray-600">{message}</p>}

          {/* Summary pills */}
          {errors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                {/* total */}
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.length} Total Error{errors.length > 1 ? "s" : ""}
              </span>

              {duplicate > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {/* duplicate */}
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                  </svg>
                  {duplicate} Duplicate{duplicate > 1 ? "s" : ""}
                </span>
              )}

              {validation > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                  {/* validation */}
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {validation} Validation Issue{validation > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Error list — scrollable, capped at PREVIEW_LIMIT */}
          {errors.length > 0 && (
            <div className="border border-red-200 rounded-md overflow-hidden">
              {/* sticky column header */}
              <div className="bg-red-50 px-3 py-1.5 border-b border-red-200">
                <p className="text-xs font-semibold text-red-600">
                  {errors.length <= PREVIEW_LIMIT
                    ? `Showing all ${errors.length} error${errors.length > 1 ? "s" : ""}`
                    : `Showing first ${PREVIEW_LIMIT} of ${errors.length} errors — download for full list`}
                </p>
              </div>

              <ul className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                {previewErrors.map((err, i) => (
                  <li
                    key={i}
                    className="flex gap-2 px-3 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <span className="shrink-0 font-mono text-red-400 select-none w-5 text-right">
                      {i + 1}.
                    </span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>

              {/* "N more" footer if truncated */}
              {hiddenCount > 0 && (
                <div className="bg-red-50 px-3 py-2 border-t border-red-200 text-center">
                  <p className="text-xs text-red-500 font-medium">
                    + {hiddenCount} more error{hiddenCount > 1 ? "s" : ""} —
                    download the file to see all
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-lg shrink-0">
          {/* left: hint text */}
          <p className="text-xs text-gray-400">
            Fix errors in your file and re-upload.
          </p>

          {/* right: buttons */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button
                type="button"
                size="sm"
                className="text-xs bg-red-500 hover:bg-red-600 text-white flex items-center gap-1.5"
                onClick={onDownload} // ← does NOT close; user can still read errors
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Error File
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Simple info/confirm modal (replaces plain alert) ─────────────────────────
const AlertModal = ({ isOpen, title, message, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-600">{message}</p>
        </div>
        <div className="flex justify-end px-5 py-3 border-t bg-gray-50 rounded-b-lg">
          <Button
            type="button"
            size="sm"
            onClick={onConfirm || onClose}
            className="text-xs"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Constants ────────────────────────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  "userName",
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "userAddress",
];

const strictEmailRegex =
  /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const bulkRowSchema = z.object({
  userLoginId: z
    .string()
    .trim()
    .nonempty("User Name is required.")
    .max(50, "User Name length exceeded."),
  email: z
    .string()
    .trim()
    .max(50, "Email length exceeded.")
    .optional()
    .refine((val) => !val || strictEmailRegex.test(val), {
      message: "Invalid email format.",
    }),
  firstName: z
    .string()
    .trim()
    .nonempty("First Name is required.")
    .max(100, "First Name length exceeded."),
  middleName: z
    .string()
    .trim()
    .max(100, "Middle Name length exceeded.")
    .optional(),
  lastName: z
    .string()
    .trim()
    .nonempty("Last Name is required.")
    .max(100, "Last Name length exceeded."),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: "Phone number must be exactly 10 digits.",
    }),
  userAddress: z
    .string()
    .trim()
    .max(512, "Address length exceeded.")
    .refine((val) => !/https?:\/\/[^\s]+/.test(val), {
      message: "Address must not contain a URL.",
    }),
});

const normalizeSheetRow = (row = {}) => ({
  userName: String(row.userName ?? "")
    .trim()
    .toLowerCase(),
  firstName: String(row.firstName ?? "").trim(),
  middleName: String(row.middleName ?? "").trim(),
  lastName: String(row.lastName ?? "").trim(),
  email: String(row.email ?? "")
    .trim()
    .toLowerCase(),
  phone: String(row.phone ?? "").trim(),
  userAddress: String(row.userAddress ?? "").trim(),
});

const validateParsedRows = (rows) => {
  const errors = [];
  const userNameRows = new Map();
  const emailRows = new Map();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const payload = {
      userLoginId: row.userName,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      userAddress: row.userAddress,
    };

    const result = bulkRowSchema.safeParse(payload);
    if (!result.success) {
      errors.push(
        `Row ${rowNumber} (${row.userName || "no username"}): ${result.error.errors
          .map((e) => e.message)
          .join(" ")}`,
      );
    }

    if (row.userName) {
      if (userNameRows.has(row.userName)) {
        errors.push(
          `User Name "${row.userName}" is duplicated in rows ${userNameRows.get(row.userName)} and ${rowNumber}.`,
        );
      } else {
        userNameRows.set(row.userName, rowNumber);
      }
    }

    if (row.email) {
      if (emailRows.has(row.email)) {
        errors.push(
          `Email "${row.email}" is duplicated in rows ${emailRows.get(row.email)} and ${rowNumber}.`,
        );
      } else {
        emailRows.set(row.email, rowNumber);
      }
    }
  });

  return errors;
};

// ── Main Page ────────────────────────────────────────────────────────────────
const AddBulkUserPage = ({ onSuccess }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [parsedUsers, setParsedUsers] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [parseError, setParseError] = useState("");
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [agentRoles, setAgentRoles] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminRoleId, setSuperAdminRoleId] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    errors: [],
    downloadFn: null,
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const [shouldRedirectAfterAlert, setShouldRedirectAfterAlert] =
    useState(false);

  // Helpers to open modals
  const showErrorModal = ({
    title,
    message,
    errors = [],
    downloadFn = null,
  }) => {
    setErrorModal({ isOpen: true, title, message, errors, downloadFn });
  };

  const showAlert = (message, title = "Notice") => {
    if (title !== "Success ✅") {
      setShouldRedirectAfterAlert(false);
    }
    setAlertModal({ isOpen: true, title, message });
  };

  const closeErrorModal = () =>
    setErrorModal((prev) => ({ ...prev, isOpen: false }));

  const closeAlertModal = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
    setShouldRedirectAfterAlert(false);
  };

  const findAgentRoleOption = useCallback(
    (availableRoles = []) => {
      const agentRole = availableRoles.find((role) =>
        agentRoles.includes(Number(role.roleId)),
      );

      return agentRole
        ? { value: agentRole.roleId, label: agentRole.roleName }
        : null;
    },
    [agentRoles],
  );

  const syncRoleSelection = useCallback(
    (availableRoles = [], previousRoles = []) => {
      const retainedRoles = previousRoles.filter((selectedRole) =>
        availableRoles.some(
          (role) => Number(role.roleId) === Number(selectedRole.value),
        ),
      );

      return retainedRoles;
    },
    [findAgentRoleOption],
  );

  const handleAlertConfirm = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

    if (shouldRedirectAfterAlert) {
      setShouldRedirectAfterAlert(false);
      onSuccess?.();
    }
  };

  // ── Clear file ───────────────────────────────────────────────────────────
  const clearSelectedFile = () => {
    setFileName("");
    setPreviewData([]);
    setParsedUsers([]);
    setUploadErrors([]);
    setIsPreviewVisible(false);
    setParseError("");
    setSelectedOrganizations([]);
    setSelectedRoles([]);
    setRoles([]);
    setResetKey((prev) => prev + 1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Map errors to rows for download ─────────────────────────────────────
  const mapErrorsToRows = (errors, rows) => {
    const errorMap = {};
    errors.forEach((err) => {
      const match = err.match(/Row (\d+)/);
      if (!match) return;
      const rowIndex = Number(match[1]) - 2;
      if (!errorMap[rowIndex]) errorMap[rowIndex] = [];
      errorMap[rowIndex].push(err);
    });
    return Object.entries(errorMap).map(([index, errList]) => ({
      ...rows[index],
      error: errList.join(" | "),
    }));
  };

  const downloadErrorFile = (errors, rows) => {
    if (!errors.length) return;
    const errorRows = mapErrorsToRows(errors, rows);
    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failed Records");
    XLSX.writeFile(wb, "failed_users.xlsx");
  };

  // ── Validate before preview/upload ──────────────────────────────────────
  const validateBeforePreview = () => {
    if (!parsedUsers.length) {
      showAlert("Please select a file first.");
      return false;
    }

    if (!selectedOrganizations.length) {
      showAlert("Please select an organization.");
      return false;
    }

    let effectiveSelectedRoles = selectedRoles;

    if (selectedRoles.length === 0) {
      const defaultAgentRole = findAgentRoleOption(roles);

      if (!defaultAgentRole) {
        showAlert("Please select any role before saving.");
        return false;
      }

      if (selectedOrganizations.length > 1) {
        showAlert(
          "No role was selected, so Agent would be applied by default. Agent users can be mapped to only one organization. Please select a single organization or choose a different role.",
        );
        return false;
      }

      const confirmDefault = window.confirm(
        "No role was selected, so Agent will be assigned by default. Click OK to continue with Agent, or Cancel to go back and select a different role.",
      );

      if (!confirmDefault) {
        return false;
      }

      effectiveSelectedRoles = [defaultAgentRole];
    }

    const isAgent = effectiveSelectedRoles.some((role) =>
      agentRoles.includes(Number(role.value)),
    );

    if (isAgent && selectedOrganizations.length > 1) {
      showAlert(
        "Agent users can be mapped to only one organization. Please select a single organization or choose a different role.",
      );
      return false;
    }

    const clientErrors = validateParsedRows(parsedUsers);

    if (clientErrors.length) {
      setUploadErrors(clientErrors);

      // Show modal with download button — NO auto-download
      showErrorModal({
        title: "Validation Failed",
        message: `${clientErrors.length} error${clientErrors.length > 1 ? "s" : ""} found in your file. Review them below and download the error report to fix your data, then re-upload.`,
        errors: clientErrors,
        downloadFn: () => downloadErrorFile(clientErrors, parsedUsers),
      });

      return false;
    }

    setUploadErrors([]);
    return true;
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    debugger;
    if (!validateBeforePreview()) return;

    setIsUploading(true);
    setParseError("");

    try {
      const effectiveSelectedRoles = selectedRoles.length
        ? selectedRoles
        : (() => {
            const defaultAgentRole = findAgentRoleOption(roles);
            return defaultAgentRole ? [defaultAgentRole] : [];
          })();

      const mappedRoleIds = effectiveSelectedRoles.map((r) => ({
        roleId: Number(r.value),
      }));
      const mappedOrgIds = selectedOrganizations.map((o) => ({
        orgId: Number(o.value),
      }));

      const encryptedUserData = sessionStorage.getItem("user");
      let currentUserId = null;
      let currentUserName = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        currentUserId = user?.userId || null;
        currentUserName = user?.userFullName || null;
      }

      const response = await fetch("/api/users/bulk-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          users: parsedUsers.map((row) => ({
            userLoginId: row.userName,
            firstName: row.firstName,
            middleName: row.middleName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            userAddress: row.userAddress,
          })),
          rolesIds: mappedRoleIds,
          orgIds: mappedOrgIds,
          currentUserId,
          currentUserName,
        }),
      });

      //const result = await response.json();
      let result;
      try {
        result = await response.json();
      } catch {
        showAlert(
          "The upload may have completed, but the server response could not be read. Please refresh the Users list to confirm before re-uploading.",
          "Notice",
        );
        return;
      }

      if (response.ok && result.success) {
        if (result.partialSuccess && result.errors?.length) {
          // ✅ Partial: some added, some failed — show errors with success count in title
          showErrorModal({
            title: `Partial Upload — ${result.successCount} of ${result.totalCount} Added`,
            message: result.message,
            errors: result.errors,
            downloadFn: () => downloadErrorFile(result.errors, parsedUsers),
          });
          // Don't clear file so user can fix & re-upload failed rows
        } else {
          // ✅ Full success
          setShouldRedirectAfterAlert(true);
          showAlert(
            result.message || "Users uploaded successfully.",
            "Success ✅",
          );
          clearSelectedFile();
        }
      } else {
        if (result.errors?.length) {
          showErrorModal({
            title: "Upload Failed",
            message:
              result.message ||
              `${result.errors.length} record(s) failed to upload.`,
            errors: result.errors,
            downloadFn: () => downloadErrorFile(result.errors, parsedUsers),
          });
        } else {
          showAlert(result.message || "Upload failed.", "Error");
        }
      }
    } catch (error) {
      showAlert(
        error?.message || "Bulk upload failed due to an unexpected error.",
        "Error",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("agentRoles");
    if (stored) setAgentRoles(JSON.parse(stored));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Not authenticated");
        const me = await res.json();
        if (!alive) return;
        setIsSuperAdmin(!!me?.isSuperAdmin);
        setSuperAdminRoleId(me?.superAdminRoleId ?? null);
      } catch {
        if (!alive) return;
        setIsSuperAdmin(false);
        setSuperAdminRoleId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrganizations.length) {
      setRoles([]);
      setSelectedRoles([]);
      setIsPreviewVisible(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/userRoles", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        });
        const data = await res.json();
        const incoming = data.roles || [];
        const filtered =
          isSuperAdmin || !superAdminRoleId
            ? incoming
            : incoming.filter(
                (r) => Number(r.roleId) !== Number(superAdminRoleId),
              );
        setRoles(filtered);
        setSelectedRoles((prev) => syncRoleSelection(filtered, prev));
      } catch (err) {
        console.error(err);
      }
    };

    fetchRoles();
  }, [isSuperAdmin, selectedOrganizations, syncRoleSelection]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRoleChange = (selected) => {
    if (!selected || selected.length === 0) {
      setSelectedRoles([]);
      return;
    }
    let filtered = selected;
    if (!isSuperAdmin && superAdminRoleId) {
      filtered = selected.filter(
        (r) => Number(r.value) !== Number(superAdminRoleId),
      );
    }
    const agentRole = filtered.find((r) =>
      agentRoles.includes(Number(r.value)),
    );
    setSelectedRoles(agentRole ? [agentRole] : filtered);
  };

  const handleOrganizationChange = (selected) => {
    setIsPreviewVisible(false);
    setSelectedOrganizations(selected || []);
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "bulk_users_template.xlsx");
  };

  const ALLOWED_EXTENSIONS = [".xlsx", ".csv"];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = "." + file.name.split(".").pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      setParseError(
        `"${file.name}" is not a supported file type. Please upload a .xlsx or .csv file.`,
      );
      setFileName("");
      setPreviewData([]);
      setParsedUsers([]);
      setUploadErrors([]);
      setIsPreviewVisible(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileName(file.name);
    setParseError("");
    setPreviewData([]);
    setParsedUsers([]);
    setUploadErrors([]);
    setIsPreviewVisible(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rows.length) {
          setParseError("The file is empty or has no data rows.");
          return;
        }

        const fileHeaders = Object.keys(rows[0]);
        const missing = TEMPLATE_COLUMNS.filter(
          (col) => !fileHeaders.includes(col),
        );
        if (missing.length) {
          setParseError(
            `Missing required columns: ${missing.join(", ")}. Please use the provided template.`,
          );
          return;
        }

        const normalizedRows = rows.map(normalizeSheetRow);
        const rowErrors = validateParsedRows(normalizedRows);

        setUploadErrors(rowErrors);
        setParsedUsers(normalizedRows);
        setPreviewData(normalizedRows);
      } catch {
        setParseError(
          "Failed to read the file. Please upload a valid .xlsx or .csv file.",
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePreviewUpload = () => {
    if (!validateBeforePreview()) return;
    setPreviewData(parsedUsers);
    setIsPreviewVisible(true);
  };

  const errorStyle = { color: "red", fontSize: "0.675rem" };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative" }}>
      {isUploading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "3px solid #e5e7eb",
              borderTopColor: "var(--brand-primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        </div>
      )}
      {/* ── Modals ── */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
        onDownload={errorModal.downloadFn}
        onClose={closeErrorModal}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onClose={closeAlertModal}
        onConfirm={handleAlertConfirm}
      />

      {/* ── Page content ── */}
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label className="text-xs font-semibold">
            Upload Users via Excel / CSV
          </Label>

          <p className="text-xs text-muted-foreground">
            Accepted formats: <strong>.xlsx</strong>, <strong>.csv</strong>
          </p>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center border rounded-md px-3 py-2 text-xs cursor-pointer w-[300px] bg-white hover:border-gray-400"
            >
              <span className="font-medium mr-2">Choose File</span>
              <span className="text-muted-foreground truncate">
                {fileName || "No file chosen"}
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleDownloadTemplate}
            >
              Download Format
            </Button>

            {(fileName ||
              previewData.length > 0 ||
              uploadErrors.length > 0) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={clearSelectedFile}
              >
                Remove File
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <Label className="text-xs">Organizations *</Label>
              <TreeDropdown
                key={resetKey}
                value={selectedOrganizations}
                onChange={handleOrganizationChange}
                isMulti={true}
              />
            </div>

            <div>
              <Label className="text-xs">Roles</Label>
              <RoleMultiSelect
                key={resetKey}
                roles={roles}
                selectedRoles={selectedRoles}
                onChange={handleRoleChange}
                isDisabled={!selectedOrganizations.length}
                placeholder={
                  !selectedOrganizations.length
                    ? "Select an organization first"
                    : "Select"
                }
              />
              {/* Shown only when Role is actually empty */}
              {selectedRoles.length === 0 &&
                selectedOrganizations.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    If you leave Role empty, Agent will be selected by default.
                  </p>
                )}

              {/* Shown only when user explicitly picked an Agent role */}
              {selectedRoles.some((role) =>
                agentRoles.includes(Number(role.value)),
              ) && (
                <p className="text-xs text-primary mt-1">
                  {selectedOrganizations.length > 1 &&
                    "Agent is selected. Please keep only one organization for Agent users."}
                </p>
              )}
            </div>
          </div>

          {parseError && <p style={errorStyle}>{parseError}</p>}
        </div>

        {isPreviewVisible && previewData.length > 0 && (
          <div className="grid gap-3">
            <div className="rounded border bg-slate-50 p-4">
              <Label className="text-xs font-semibold">Upload Summary</Label>
              <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                <div>
                  <p className="font-medium text-slate-600">Organizations</p>
                  <p>
                    {selectedOrganizations.map((org) => org.label).join(", ")}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-600">Roles</p>
                  <p>
                    {(selectedRoles.length
                      ? selectedRoles
                      : (() => {
                          const defaultAgentRole = findAgentRoleOption(roles);
                          return defaultAgentRole ? [defaultAgentRole] : [];
                        })()
                    )
                      .map((role) => role.label)
                      .join(", ")}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-600">Users in File</p>
                  <p>{previewData.length}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold">
                Preview ({previewData.length} user
                {previewData.length > 1 ? "s" : ""})
              </Label>
              <div className="overflow-x-auto rounded border max-h-[420px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted/80 sticky top-0">
                    <tr>
                      {TEMPLATE_COLUMNS.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                        mappedOrganizations
                      </th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                        mappedRoles
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={`${row.userName}-${i}`} className="border-t">
                        {TEMPLATE_COLUMNS.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-1.5 whitespace-nowrap"
                          >
                            {row[col] ?? "-"}
                          </td>
                        ))}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {selectedOrganizations
                            .map((org) => org.label)
                            .join(", ")}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {(selectedRoles.length
                            ? selectedRoles
                            : (() => {
                                const defaultAgentRole =
                                  findAgentRoleOption(roles);
                                return defaultAgentRole
                                  ? [defaultAgentRole]
                                  : [];
                              })()
                          )
                            .map((role) => role.label)
                            .join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {parsedUsers.length > 0 && !parseError && (
          <div className="flex justify-end gap-2">
            {isPreviewVisible && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsPreviewVisible(false)}
              >
                Back to Edit
              </Button>
            )}

            {!isPreviewVisible ? (
              <Button
                type="button"
                size="sm"
                onClick={handlePreviewUpload}
                style={{ backgroundColor: "var(--brand-primary)" }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--brand-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--brand-primary)")
                }
              >
                Preview Upload
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isUploading}
                onClick={handleUpload}
                style={{ backgroundColor: "var(--brand-primary)" }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--brand-secondary)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--brand-primary)")
                }
              >
                {isUploading ? "Uploading..." : "Upload Users"}
              </Button>
            )}
          </div>
        )}

        {/* OR Divider */}
        {/*<div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">
            OR IMPORT DIRECTLY
          </span>
          <div className="flex-1 border-t" />
        </div>*/}

        {/* Active Directory */}
        {/*<div className="grid gap-2">
          <Label className="text-xs font-semibold">
            Step 3: Import from Active Directory
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Domain"
              className="border p-2 text-xs rounded"
            />
            <input
              placeholder="Username"
              className="border p-2 text-xs rounded"
            />
            <input
              type="password"
              placeholder="Password"
              className="border p-2 text-xs rounded"
            />
            <input
              placeholder="LDAP URL"
              className="border p-2 text-xs rounded"
            />
          </div>
          <Button size="sm" variant="outline">
            Fetch Users
          </Button>
        </div>*/}
      </div>
    </div>
  );
};

export default AddBulkUserPage;
