// components/dataTable/data-table-toolbar.jsx
import React from "react";
import { Skeleton } from "../ui/skeleton";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import CreateBtn from "../create-btn";
import { DataTableViewOptions } from "./data-table-view-options";
import CryptoJS from "crypto-js";

const formatExportDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit", // ✅ Include seconds
    hour12: true,
  };

  return date.toLocaleString("en-US", options);
};

function formatDateTime(dateTime) {
  if (!dateTime) return "";
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  return new Date(dateTime).toLocaleString("en-US", options);
}

function sanitizeURLs(value) {
  if (typeof value === "string" && value.includes("://")) {
    return value.replace("://", "");
  }
  return value;
}

function maskPhone(value) {
  if (!value) return value;

  const str = String(value);

  // Keep first 2 and last 2 digits
  if (str.length >= 6) {
    return (
      str.substring(0, 2) +
      "*".repeat(str.length - 4) +
      str.substring(str.length - 2)
    );
  }

  return "*".repeat(str.length);
}

function formatDataForExport(data, columns) {
  const dateFields = [
    "audioStartTime",
    "audioEndTime",
    "localStartTime",
    "localEndTime",
    "evaluation_date",
  ];

  return data.map((item) => {
    const formattedItem = {};
    // columns.forEach((col) => {
    //   if (dateFields.includes(col.key)) {
    //     formattedItem[col.label] = formatExportDateTime(item[col.key]);
    //   } else {
    //     formattedItem[col.label] = sanitizeURLs(item[col.key]);
    //   }
    // });
    columns.forEach((col) => {
      const key = col.key;

      if (dateFields.includes(key)) {
        formattedItem[col.label] = formatExportDateTime(item[key]);
      } else if (key.toLowerCase() === "ani" || key.toLowerCase() === "dnis") {
        formattedItem[col.label] = maskPhone(item[key]);
      } else {
        formattedItem[col.label] = sanitizeURLs(item[key]);
      }
    });
    return formattedItem;
  });
}

async function exportToExcel(data, columns, fileName) {
  const formattedData = formatDataForExport(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, fileName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

function exportToCSV(data, columns, fileName) {
  const formattedData = formatDataForExport(data, columns);
  const csvContent = [
    columns.map((col) => col.label).join(","),
    ...formattedData.map((row) =>
      columns
        .map(
          (col) =>
            `"${(row[col.label] != null
              ? row[col.label].toString()
              : ""
            ).replace(/"/g, '""')}"`,
        )
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff", csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${fileName}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(data, columns, fileName) {
  const formattedData = formatDataForExport(data, columns);
  const wrappedData = formattedData.map((row) => {
    const wrappedRow = { ...row };
    if (row["Role"]) {
      const rolesArray = row["Role"].split(",");
      wrappedRow["Role"] = rolesArray
        .map(
          (role, index) => `${role.trim()}${(index + 1) % 5 === 0 ? "\n" : ""}`,
        )
        .join(", ");
    }
    if (row["Organization"]) {
      const orgArray = row["Organization"].split(",");
      wrappedRow["Organization"] = orgArray
        .map(
          (org, index) => `${org.trim()}${(index + 1) % 5 === 0 ? "\n" : ""}`,
        )
        .join(", ");
    }
    return wrappedRow;
  });

  const doc = new jsPDF({ orientation: "landscape", format: "a3" });
  const columnLabels = columns.map((col) => col.label);
  const rows = wrappedData.map((row) =>
    columnLabels.map((label) => row[label]),
  );
  const originalWarn = console.warn;
  console.warn = () => {}; // Silence internal autoTable warnings about page fit
  try {
    doc.autoTable({
      head: [columnLabels],
      body: rows,
      startY: 10,
      styles: {
        fontSize: 8,
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      columnStyles: {
        Role: { cellWidth: "auto" },
        Organization: { cellWidth: "auto" },
      },
      theme: "grid",
      tableWidth: "auto",
      margin: { top: 10, bottom: 10, left: 10, right: 10 },
    });
  } finally {
    console.warn = originalWarn;
  }
  doc.save(`${fileName}.pdf`);
}

export function DataTableToolbar({
  table,
  showCreateBtn = false,
  loading,
  onCreate,
  createBasePath,
  exportType,
  allowedExportTypes,
  exportStatus,
  exportSearch,
  exportRoleFilter,
  exportOrganizationFilter,
  exportPlatformFilter,
  daterange,
  OrganizationFilter,
  pageType,
  filters,
  formFilter,
  evaluatorFilter,
  agentNameFilter, // 👈 Add this
  instanceNameFilter,
  privilegeId,
  useModal, // ✅ ADD
  onModalOpen, // ✅ ADD
}) {
  const handleExport = async (format) => {
    if (format === "select") return;

    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let currentUserId = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          currentUserId = user?.userId || null;
        } catch (err) {
          console.error("Failed to decrypt user data:", err);
        }
      }

      const fromDate = daterange?.startDate?.toISOString() ?? null;
      const toDate = daterange?.endDate?.toISOString() ?? null;

      let apiUrl = "";
      let bodyData = {};
      let fileName = "";
      let dataKey = "";
      let exportData = [];
      let columns = [];

      switch (exportType) {
        case "Users":
          apiUrl = `/api/users`;
          bodyData = {
            page: 1,
            perPage: 10000,
            search: exportSearch,
            queryType: 1,
            currentUserId,
            isActive: exportStatus,
            ...(exportRoleFilter?.length && {
              roleFilter: exportRoleFilter.join(","),
            }),
            ...(exportOrganizationFilter?.length && {
              organizationFilter: exportOrganizationFilter
                .map((org) => org.value)
                .join(","),
            }),
            ...(exportPlatformFilter?.length && {
              platformFilter: exportPlatformFilter
                .map((platform) =>
                  Number(platform?.platformId ?? platform?.value),
                )
                .filter((platformId) => !Number.isNaN(platformId))
                .join(","),
            }),
          };
          fileName = "Users_Data";
          dataKey = "users";
          break;

        case "Interaction":
          apiUrl = `/api/interactions`;
          bodyData = {
            pageNo: 1,
            rowCountPerPage: 100000,
            queryType: 1,
            fromDate,
            toDate,
            callId: filters?.callId || null,
            ucid: filters?.ucid || null,
            agent: filters?.agent || null,
            extensions: filters?.extensions || null,
            formIds: formFilter?.map((opt) => Number(opt.value)) || null,
            evaluatorIds:
              evaluatorFilter?.map((opt) => Number(opt.value)) || null,
            organizationIds: OrganizationFilter?.map((opt) => ({
              organizationId: Number(opt.value),
            })),
            agentNameIds:
              agentNameFilter?.map((opt) => ({ agentsId: opt.value })) || null,
            instanceNameIds:
              instanceNameFilter?.map((opt) => ({
                appid: Number(opt.appid),
                PlatformId: Number(opt.platformId),
              })) || null,
            platformIds:
              exportPlatformFilter?.map((opt) => ({
                PlatformId: Number(opt?.platformId ?? opt?.value),
              })) || null,
            privilegeId,
            currentUserId,
            timezone: sessionStorage.getItem("selectedTimezone")
              ? JSON.parse(
                  CryptoJS.AES.decrypt(
                    sessionStorage.getItem("selectedTimezone"),
                    "",
                  ).toString(CryptoJS.enc.Utf8),
                )
              : null,
            ActiveStatus: 0,
          };
          fileName = "Interaction_Data";
          dataKey = "interactions";
          break;

        case "Evaluation":
          apiUrl = `/api/interactions`;
          bodyData = {
            pageNo: 1,
            rowCountPerPage: 100000,
            queryType: 1,
            fromDate,
            toDate,
            callId: filters?.callId || null,
            ucid: filters?.ucid || null,
            agent: filters?.agent || null,
            extensions: filters?.extensions || null,
            formIds: formFilter?.map((opt) => Number(opt.value)) || null,
            evaluatorIds:
              evaluatorFilter?.map((opt) => Number(opt.value)) || null,
            organizationIds: OrganizationFilter?.map((opt) => ({
              organizationId: Number(opt.value),
            })),
            agentNameIds:
              agentNameFilter?.map((opt) => ({ agentsId: opt.value })) || null,
            instanceNameIds:
              instanceNameFilter?.map((opt) => ({
                appid: Number(opt.appid),
                PlatformId: Number(opt.platformId),
              })) || null,
            platformIds:
              exportPlatformFilter?.map((opt) => ({
                PlatformId: Number(opt?.platformId ?? opt?.value),
              })) || null,
            privilegeId,
            currentUserId,
            timezone: sessionStorage.getItem("selectedTimezone")
              ? JSON.parse(
                  CryptoJS.AES.decrypt(
                    sessionStorage.getItem("selectedTimezone"),
                    "",
                  ).toString(CryptoJS.enc.Utf8),
                )
              : null,
            ActiveStatus: 1,
          };
          fileName = "Evaluation_Data";
          dataKey = "interactions"; // backend uses this key
          break;

        case "AgentOrganization":
          apiUrl = `/api/agentorganization`;
          bodyData = {
            page: 1,
            perPage: 10000,
            search: exportSearch,
            queryType: 1,
            currentUserId,
            isActive: exportStatus,
          };
          fileName = "Agent_Organization_Data";
          dataKey = "mappings";
          break;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: currentUserId,
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) throw new Error("Failed to export data");

      const res = await response.json();
      exportData = res?.[dataKey] || res?.data?.[dataKey] || [];

      if (!exportData.length) {
        alert(`No data to export for ${exportType}`);
        return;
      }

      // Build dynamic columns
      const firstRow = exportData[0];
      columns = Object.keys(firstRow).map((key) => ({
        key,
        label: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase()),
      }));

      switch (format) {
        case "excel":
          exportToExcel(exportData, columns, fileName);
          break;
        case "csv":
          exportToCSV(exportData, columns, fileName);
          break;
        case "pdf":
          exportToPDF(exportData, columns, fileName);
          break;
      }
    } catch (error) {
      console.error("Export Error:", error);
    }
  };

  // const exportOptions = [
  //   { value: "select", label: "Download Reports" },
  //   ...[
  //     { value: "excel", label: "Download Excel", type: "excel" },
  //     { value: "csv", label: "Download CSV", type: "csv" },
  //     { value: "pdf", label: "Download PDF", type: "pdf" },
  //   ].filter((option) => allowedExportTypes.includes(option.type)),
  // ];
  const allExportOptions = [
    { value: "excel", label: "Download Excel", type: "excel" },
    { value: "csv", label: "Download CSV", type: "csv" },
    { value: "pdf", label: "Download PDF", type: "pdf" },
  ];

  // Exclude PDF if Interaction
  const filteredExportOptions =
    exportType === "Interaction"
      ? allExportOptions.filter((opt) => opt.type !== "pdf")
      : allExportOptions;

  const exportOptions = [
    { value: "select", label: "Download Reports" },
    ...filteredExportOptions.filter((option) =>
      allowedExportTypes.includes(option.type),
    ),
  ];

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between flex-wrap space-x-2">
        <div className="flex items-center justify-end space-x-2 mt-[0px] w-full">
          {loading ? (
            <Skeleton className="h-8 w-[50px] lg:w-[100px]">
              <span className="opacity-0">0</span>
            </Skeleton>
          ) : (
            <>
              {pageType !== "AgentOrganization" && (
                <DataTableViewOptions table={table} />
              )}

              {exportOptions.length > 1 && (
                <select
                  key={table}
                  onChange={(e) => handleExport(e.target.value)}
                  className="px-2 py-1 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-48 text-xs"
                >
                  {exportOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {showCreateBtn && (
                <CreateBtn
                  onClick={onCreate}
                  basePath={createBasePath}
                  useModal={useModal} // ✅ ADD
                  onModalOpen={onModalOpen} // ✅ ADD
                />
              )}

              {/* 🧩 NEW: Show Delete Button when users selected */}
              {table.options.meta?.hasDeletePrivilege &&
                table.options.meta?.selectedForDelete?.length > 0 && (
                  <button
                    onClick={() =>
                      table.options.meta?.onBulkDelete?.(
                        table.options.meta.selectedForDelete,
                      )
                    }
                    className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600"
                  >
                    Delete {table.options.meta.selectedForDelete.length} User
                    {table.options.meta.selectedForDelete.length > 1 ? "s" : ""}
                  </button>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
