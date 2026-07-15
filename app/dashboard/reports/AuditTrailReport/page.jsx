"use client";

import React, { useEffect, useState } from "react";
import "jspdf-autotable";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, usePathname, useSearchParams } from "next/navigation";
import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import "@/components/Styles/AvgScoreByAgent.css";
import ReportFilters from "@/components/filters_report";
import DynamicReportDataTable from "@/components/dataTable/Dynamic-Report-DataTable";
import {
  exportToCSVReport,
  exportToExcelReport,
  exportToPDFReport,
} from "@/components/dataTable/exportReport";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

function AuditTrailReport() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [rowCountPerPage, setRowCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [actionOptions, setActionOptions] = useState([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentUserFullName, setCurrentUserFullName] = useState(null);
  const [hasViewedReport, setHasViewedReport] = useState(false);
  const enabledFilters = ["action"];
  const ReportName = pathname.split("/").pop();
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "audit"
  }`;

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  const toIST = (date) => {
    if (!date) return null;
    const utc = new Date(date).getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utc + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  useEffect(() => {
    console.log("actionOptions state =", actionOptions);
  }, [actionOptions]);

  const getUserContext = () => {
    const encryptedUserData = sessionStorage.getItem("user");
    if (!encryptedUserData) {
      return { userId: null, userFullName: null };
    }

    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const user = JSON.parse(decryptedData);

    return {
      userId: user?.userId || null,
      userFullName: user?.userFullName || null,
    };
  };

  const fetchPrivileges = async () => {
    try {
      const { userId } = getUserContext();

      const response = await fetch("/api/privileges", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: parseInt(userId, 10),
          moduleId: 10,
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch privileges");
      }

      const result = await response.json();
      setPrivileges(result.privileges || []);
      setPrivilegesLoaded(true);
    } catch (error) {
      console.error("Error fetching privileges:", error);
      setPrivilegesLoaded(true);
    }
  };

  const fetchActionOptions = async () => {
    try {
      const { userId } = getUserContext();

      const response = await fetch("/api/reports/AuditTrailReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          queryType: 2,
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok && result?.success) {
        setActionOptions(result.data.actionOptions || []);
      }
    } catch (error) {
      console.error("Error fetching audit actions:", error);
    }
  };

  useEffect(() => {
    fetchPrivileges();
    fetchActionOptions();
  }, []);

  const validateDateFilter = () => {
    if (!filterType || filterType.trim() === "") {
      alert("Please select Date filter");
      return false;
    }

    if (filterType === "DATE_RANGE") {
      const [startDate, endDate] = dateRange;

      if (!startDate || !endDate) {
        alert("Please select both start and end dates for custom filter.");
        return false;
      }

      if (startDate > endDate) {
        alert("Start date cannot be after end date.");
        return false;
      }
    }

    return true;
  };

  const fetchData = async (queryTypeOverride = 0) => {
    const [startDate, endDate] = dateRange;
    setLoading(true);

    try {
      const { userId, userFullName } = getUserContext();
      setCurrentUserFullName(userFullName);

      const response = await fetch("/api/reports/AuditTrailReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          filter: filterType,
          StartDate: startDate ? toIST(startDate) : null,
          EndDate: endDate ? toIST(endDate) : null,
          actionType: selectedAction || null,
          pageNo,
          rowCountPerPage,
          queryType: queryTypeOverride,
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch audit report");
      }

      if (queryTypeOverride === 0) {
        setData(result.data.auditData || []);
        setTotalCount(result.data.totalCount || 0);
      }

      return result.data.auditData || [];
    } catch (error) {
      console.error("Error fetching audit report:", error);
      if (queryTypeOverride === 0) {
        setData([]);
        setTotalCount(0);
      }
      alert(error.message || "Failed to fetch audit report.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasViewedReport) {
      fetchData(0);
    }
  }, [pageNo, rowCountPerPage]);

  const handleViewReport = () => {
    if (!validateDateFilter()) {
      return;
    }

    setPageNo(1);
    setHasViewedReport(true);
    fetchData(0);
  };

  const handleResetFilters = () => {
    setData([]);
    setTotalCount(0);
    setFilterType("");
    setDateRange([new Date(), new Date()]);
    setActiveFilter("");
    setSelectedAction("");
    setPageNo(1);
    setHasViewedReport(false);
  };

  const handleExport = async (format) => {
    if (!validateDateFilter()) {
      return;
    }

    const { userFullName } = getUserContext();
    const exportData = await fetchData(1);

    if (!exportData || exportData.length === 0) {
      alert("No data available for download.");
      return;
    }

    const fileNameDate = new Date().toISOString().split("T")[0];
    const fileName = `${ReportName}_${fileNameDate}`;

    switch (format) {
      case "excel":
        exportToExcelReport(
          exportData,
          userFullName || currentUserFullName,
          fileName,
        );
        break;
      case "csv":
        exportToCSVReport(
          exportData,
          userFullName || currentUserFullName,
          fileName,
        );
        break;
      case "pdf":
        exportToPDFReport(
          exportData,
          userFullName || currentUserFullName,
          fileName,
        );
        break;
      default:
        alert("Unsupported export format selected.");
    }
  };

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
      style={{ height: "calc(100vh - 112px)" }}
    >
      <div className="relative z-20 shrink-0 overflow-visible">
        <div className="flex items-center justify-between gap-4">
          {/*<div className="flex items-center gap-2">
            <Link href={backHref} passHref>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shadow-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>*/}

          <div className="flex-1 text-center">
            <h1 className="text-xl md:text-base font-semibold">
              Audit Trail Report
            </h1>
          </div>

          <div className="relative group" tabIndex={0}>
            <button
              onClick={() => {
                if (!data || data.length === 0) {
                  alert("No data available to export.");
                  setShowExportDropdown(false);
                } else {
                  setShowExportDropdown((prev) => !prev);
                }
              }}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white px-2 py-2 text-xs rounded-md focus:outline-none flex items-center gap-1"
            >
              Export ▼
            </button>

            {showExportDropdown && (
              <div
                className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-md shadow-lg z-20 text-xs opacity-0 group-focus-within:opacity-100 pointer-events-none group-focus-within:pointer-events-auto transition-opacity duration-200"
                onMouseLeave={() => setShowExportDropdown(false)}
              >
                <button
                  onClick={() => {
                    handleExport("excel");
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted"
                >
                  Download Excel
                </button>
                <button
                  onClick={() => {
                    handleExport("csv");
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    handleExport("pdf");
                    setShowExportDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted"
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        <ReportFilters
          enabledFilters={enabledFilters}
          filterType={filterType}
          setFilterType={setFilterType}
          dateRange={dateRange}
          setDateRange={setDateRange}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedFormNames={[]}
          setSelectedFormNames={() => {}}
          selectedOrganizations={[]}
          setSelectedOrganizations={() => {}}
          selectedAgents={[]}
          setSelectedAgents={() => {}}
          actionOptions={actionOptions}
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          handleViewReport={handleViewReport}
          handleResetFilters={handleResetFilters}
        />
      </div>

      <div className="relative z-0 mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card p-5 shadow-md">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="loading-message">Loading...</p>
          </div>
        ) : !hasViewedReport ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="no-data-message">No data available</p>
          </div>
        ) : data && data.length > 0 ? (
          <DynamicReportDataTable
            data={data}
            totalCount={totalCount}
            pageNo={pageNo}
            rowCountPerPage={rowCountPerPage}
            scrollHeight="calc(100vh - 360px)"
            onPageChange={setPageNo}
            onRowCountChange={(count) => {
              setRowCountPerPage(count);
              setPageNo(1);
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="no-data-message">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(AuditTrailReport);
