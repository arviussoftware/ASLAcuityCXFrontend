"use client";

import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";

import { FaSearch } from "react-icons/fa";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import withAuth from "@/components/withAuth";
import "@/components/Styles/AvgScoreByAgent.css";
import { useSearchParams, usePathname } from "next/navigation";
import DynamicReportDataTable from "@/components/dataTable/Dynamic-Report-DataTable";
import {
  exportToExcelReport,
  exportToCSVReport,
  exportToPDFReport,
} from "@/components/dataTable/exportReport";
import ReportFilters from "@/components/filters_report";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

function DeletedUserReport() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [data, setData] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [rowCountPerPage, setRowCountPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentUserFullName, setCurrentUserFullName] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [hasViewedReport, setHasViewedReport] = useState(false);

  const ReportName = pathname.split("/").pop();
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "user"
  }`;

  const toIST = (date) => {
    if (!date) return null;
    const utc = new Date(date).getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utc + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  const getUserContext = () => {
    const encryptedUserData = sessionStorage.getItem("user");
    if (!encryptedUserData) {
      return { userId: null, userFullName: null };
    }

    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return {
      userId: user?.userId || null,
      userFullName: user?.userFullName || null,
    };
  };

  const fetchRoles = async () => {
    try {
      const { userId } = getUserContext();
      const response = await fetch("/api/userRoles/byOrg", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const result = await response.json();
      setRoles(result.roles || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
    }
  };

  useEffect(() => {
    fetchRoles();
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

      const res = await fetch("/api/reports/DeletedUserReport", {
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
          search: searchText?.trim() || null,
          roleFilter: selectedRoles.map((role) => role.value),
          organizationIds: selectedOrganizations.map((org) => org.value),
          pageNo: queryTypeOverride === 1 ? 1 : pageNo,
          rowCountPerPage,
          queryType: queryTypeOverride,
        }),
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch deleted users");
      }

      if (queryTypeOverride === 0) {
        setData(result.data.users || []);
        setTotalCount(result.data.totalCount || 0);
      }

      return result.data.users || [];
    } catch (error) {
      console.error(error);
      if (queryTypeOverride === 0) {
        setData([]);
        setTotalCount(0);
      }
      alert(error.message || "Failed to fetch deleted users.");
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
    setSearchText("");
    setFilterType("");
    setDateRange([new Date(), new Date()]);
    setActiveFilter("");
    setSelectedOrganizations([]);
    setSelectedRoles([]);
    setPageNo(1);
    setHasViewedReport(false);
  };

  const handleExport = async (format) => {
    if (!validateDateFilter()) {
      return;
    }

    try {
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
          alert("Unsupported export format.");
      }
    } catch (error) {
      console.error("Error during export:", error);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="relative z-20 shrink-0 overflow-visible">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href={backHref} passHref>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shadow-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold md:text-base">
              Deleted Users Report
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

        <div className="mb-4">
          <ReportFilters
            leadingContent={
              <div className="flex min-w-[260px] flex-col">
                <div className="flex min-w-[260px] flex-col">
                  <label className="mb-1 text-[11px] text-muted-foreground">
                    Search
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setPageNo(1);
                          setHasViewedReport(true);
                          fetchData(0);
                        }
                      }}
                      placeholder="Search deleted users"
                      className="w-full border border-border pl-3 pr-10 py-1.5 rounded-md text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setPageNo(1);
                        setHasViewedReport(true);
                        fetchData(0);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <FaSearch size={12} />
                    </button>
                  </div>
                </div>
              </div>
            }
            enabledFilters={["organization", "role"]}
            filterType={filterType}
            setFilterType={setFilterType}
            dateRange={dateRange}
            setDateRange={setDateRange}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            selectedFormNames={[]}
            setSelectedFormNames={() => {}}
            selectedOrganizations={selectedOrganizations}
            setSelectedOrganizations={(selected) =>
              setSelectedOrganizations(selected || [])
            }
            selectedAgents={[]}
            setSelectedAgents={() => {}}
            roles={roles}
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
            handleViewReport={handleViewReport}
            handleResetFilters={handleResetFilters}
          />
        </div>
      </div>

      <div className="relative z-0 mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card p-5 shadow-md">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="loading-message">Loading...</p>
          </div>
        ) : !hasViewedReport ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="no-data-message">No data avaliable.</p>
          </div>
        ) : data.length > 0 ? (
          <DynamicReportDataTable
            data={data}
            totalCount={totalCount}
            pageNo={pageNo}
            rowCountPerPage={rowCountPerPage}
            scrollHeight="calc(100vh - 420px)"
            onPageChange={setPageNo}
            onRowCountChange={(count) => {
              setRowCountPerPage(count);
              setPageNo(1);
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="no-data-message">No deleted users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(DeletedUserReport);
