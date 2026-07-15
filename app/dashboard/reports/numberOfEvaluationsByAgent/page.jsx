"use client";
import "jspdf-autotable";
import Link from "next/link";
import CryptoJS from "crypto-js";
import { ChevronLeft } from "lucide-react";
import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import "@/components/Styles/AvgScoreByAgent.css";
import React, { useState, useEffect } from "react";
import ChartReport from "@/components/chart_report";
import { notFound, usePathname, useSearchParams } from "next/navigation";
import ReportFilters from "@/components/filters_report";
import DynamicReportDataTable from "@/components/dataTable/Dynamic-Report-DataTable";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import {
  exportToExcelReport,
  exportToCSVReport,
  exportToPDFReport,
  exportToPDFImageReport,
  exportToPNGReport,
} from "@/components/dataTable/exportReport";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

function ReportsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [pageNo, setPageNo] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [privileges, setPrivileges] = useState([]);
  const [showGraph, setShowGraph] = useState(false);
  const [chartType, setChartType] = useState("bar");
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [currentUserFullName, setCurrentUserFullName] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const enabledFilters = ["form", "agent"];

  // Consolidated filter state
  const ReportName = pathname.split("/").pop();
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "evaluation"
  }`;
  const [filterType, setFilterType] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedForms, setSelectedForms] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [rowCountPerPage, setRowCountPerPage] = useState(10);
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);

  const fetchPrivileges = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      const response = await fetch(`/api/privileges`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: parseInt(userId),
          moduleId: 10, 
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch privileges");
      const pre_data = await response.json();
      setPrivileges(pre_data.privileges || []);
      setPrivilegesLoaded(true);
    } catch (err) {
      console.error("Error fetching privileges:", err);
      setPrivilegesLoaded(true);
    }
  };

  useEffect(() => {
    fetchPrivileges();
  }, []);

  const fetchData = async () => {
    const [startDate, endDate] = dateRange;
    setLoading(true);
    try {
      let userId = null;
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      let timezone = null;
      const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

      if (encryptedTimezone) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          timezone = JSON.parse(decryptedData);
        } catch (err) {
          console.error("Failed to decrypt timezone:", err);
        }
      }

      const response = await fetch("/api/reports/numberOfEvaluationsByAgent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          timezone,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          filter: filterType,
          StartDate: startDate ? toIST(startDate) : null,
          EndDate: endDate ? toIST(endDate) : null,
          formIds: selectedForms.map((f) => f.value),
          organizationIds: selectedOrganizations.map((o) => o.value),
          agentIds: selectedAgents.map((a) => a.value),
          pageNo: pageNo,
          rowCountPerPage: rowCountPerPage,
          queryType: 0,
        }),
        cache: "no-store",
      });
      const result = await response.json();
      if (response.ok) {
        setData(result.data.NumberOfEvaluationsByAgent || []);
        setTotalCount(result.data.totalCount || 0);
      } else {
        console.error("Failed to fetch data:", result.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNo, rowCountPerPage]);

  const handleResetFilters = () => {
    setData([]);
    setFilterType("");
    setDateRange([new Date(), new Date()]);
    setShowGraph(false);
    setActiveFilter("");
    setSelectedForms([]);
    setSelectedOrganizations([]);
    setSelectedAgents([]);
  };

  const handleViewReport = () => {
    setPageNo(1);

    // Validate filters
    if (!filterType || filterType.trim() === "") {
      alert("Please select the Date filter");
      return;
    }

    if (filterType === "DATE_RANGE") {
      if (!dateRange[0] || !dateRange[1]) {
        alert("Please select both start and end dates for custom filter.");
        return;
      }
      if (dateRange[0] > dateRange[1]) {
        alert("Start date cannot be after end date.");
        return;
      }
    }

    // if (selectedForms.length === 0) {
    //   alert("Please select at least one form.");
    //   return;
    // }

    // if (selectedOrganizations.length === 0) {
    //   alert("Please select at least one organization.");
    //   return;
    // }

    // if (selectedAgents.length === 0) {
    //   alert("Please select at least one agent.");
    //   return;
    // }

    fetchData();
  };

  const generateBlueShades = (count) => {
    const baseHue = 210;
    const saturation = 100;
    const lightnessStart = 85;
    const lightnessEnd = 40;
    const step = (lightnessStart - lightnessEnd) / Math.max(count - 1, 1);

    return Array.from(
      { length: count },
      (_, i) => `hsl(${baseHue}, ${saturation}%, ${lightnessStart - i * step}%)`
    );
  };

  const chartData = {
    labels: data.map((row) => row.AgentName),
    datasets: [
      {
        label: "Evaluation Count by Agent",
        data: data.map((row) => row.EvaluationCount),
        backgroundColor: generateBlueShades(data.length),
        borderColor: "#007fff",
        borderWidth: 1,
        formNames: data.map((row) => row.FormName),
      },
    ],
  };

  const toIST = (date) => {
    if (!date) return null;
    const utc = new Date(date).getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utc + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  const handleExport = async (format) => {
    try {
      let userId = null;
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
        setCurrentUserFullName(user.userFullName);
      }
      const [startDate, endDate] = dateRange;

      const response = await fetch("/api/reports/numberOfEvaluationsByAgent", {
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
          formIds: selectedForms.map((f) => f.value),
          organizationIds: selectedOrganizations.map((o) => o.value),
          agentIds: selectedAgents.map((a) => a.value),
          pageNo: pageNo,
          rowCountPerPage: rowCountPerPage,
          queryType: 1,
        }),
        cache: "no-store",
      });

      const result = await response.json();
      const exportData = result.data.NumberOfEvaluationsByAgent || [];
      if (!exportData || exportData.length === 0) {
        alert("No data available for download.");
        return;
      }

      const fileNameDate = new Date().toISOString().split("T")[0];
      const fileName = `${ReportName}_${fileNameDate}`;

      switch (format) {
        case "excel":
          exportToExcelReport(exportData, currentUserFullName, fileName);
          break;
        case "csv":
          exportToCSVReport(exportData, currentUserFullName, fileName);
          break;
        case "pdf":
          exportToPDFReport(exportData, currentUserFullName, fileName);
          break;
        case "chartpdf":
          exportToPDFImageReport(exportData, currentUserFullName, fileName);
          break;
        case "chartpng":
          exportToPNGReport(exportData, currentUserFullName, fileName);
          break;
        default:
          alert("Unsupported export format selected.");
      }
    } catch (error) {
      console.error("Error during export:", error);
    }
  };

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  return (
    <div className="reports-container">
      {/* Top bar with back, title, graph toggle and export */}
      <div className="flex flex-col md:flex-col gap-4 mb-4">
        {/* First Row: Back, Title, Graph Toggle, Export */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back */}
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

          {/* Center: Title */}
          <div className="flex-1 text-center">
            <h1 className="text-xl md:text-base font-semibold">
              Agent wise Number of Evaluations Report
            </h1>
          </div>

          {/* Right: Graph Toggle and Export */}
          <div className="flex items-center gap-2">
            {/* Show Graph Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => setShowGraph((prev) => !prev)}
                className="border border-border text-foreground px-2 py-2 text-xs rounded-md hover:bg-muted focus:outline-none whitespace-nowrap"
              >
                {showGraph ? "Show Table" : "Show Graph"}
              </button>

              {showGraph && (
                <div className="flex items-center gap-1">
                  <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Chart:
                  </label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="text-[11px] px-2 py-1 border border-border rounded-md"
                  >
                    <option value="bar">Bar</option>
                    <option value="pie">Pie</option>
                    <option value="doughnut">Donut</option>
                  </select>
                </div>
              )}
            </div>

            {/* Export Button */}
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
                className="bg-blue-700 text-white px-2 py-2 text-xs rounded-md hover:bg-blue-600 focus:outline-none flex items-center gap-1"
              >
                Export ▼
              </button>
              {showExportDropdown && (
                <div
                  className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-md shadow-lg z-20 text-xs opacity-0 group-focus-within:opacity-100 pointer-events-none group-focus-within:pointer-events-auto transition-opacity duration-200"
                  onMouseLeave={() => setShowExportDropdown(false)}
                >
                  {!showGraph ? (
                    <>
                      <button
                        onClick={() => {
                          handleExport("excel");
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted"
                        disabled={!data || data.length === 0}
                      >
                        Download Excel
                      </button>
                      <button
                        onClick={() => {
                          handleExport("csv");
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted"
                        disabled={!data || data.length === 0}
                      >
                        Download CSV
                      </button>
                      <button
                        onClick={() => {
                          handleExport("pdf");
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted"
                        disabled={!data || data.length === 0}
                      >
                        Download PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleExport("chartpdf");
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => {
                          handleExport("chartpng");
                          setShowExportDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-muted"
                      >
                        Download Graph Image
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row: Filters */}
        <ReportFilters
          enabledFilters={enabledFilters} // ✅ pass here
          filterType={filterType}
          setFilterType={setFilterType}
          dateRange={dateRange}
          setDateRange={setDateRange}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          selectedFormNames={selectedForms}
          setSelectedFormNames={setSelectedForms}
          selectedOrganizations={selectedOrganizations}
          setSelectedOrganizations={setSelectedOrganizations}
          selectedAgents={selectedAgents}
          setSelectedAgents={setSelectedAgents}
          handleViewReport={handleViewReport}
          handleResetFilters={handleResetFilters}
        />
      </div>

      {/* Show Graph and Data Table */}
      <div className="mt-5 bg-card border border-border rounded-lg p-5 shadow-md">
        {loading ? (
          <p className="loading-message">Loading...</p>
        ) : data && data.length > 0 ? (
          showGraph ? (
            <div>
              <ChartReport
                chartType={chartType}
                chartData={chartData}
                title="Agent wise Number of Evaluations Report"
                footerNote="Agent wise Number of Evaluations"
                xAxisLabel="Agent Name"
                yAxisLabel="Count"
                tooltipCallback={(context) => {
                  const value = context.dataset.data[context.dataIndex];
                  const label = context.label;
                  const formName = context.dataset.formNames[context.dataIndex];
                  return [
                    `Agent Name: ${label}`,
                    `Form Name: ${formName}`,
                    `Evaluation Count: ${value}`,
                  ];
                }}
              />
              {/* ✅ Pagination under chart */}
              <DynamicReportDataTable
                data={[]} // no table data here
                totalCount={totalCount}
                pageNo={pageNo}
                rowCountPerPage={rowCountPerPage}
                onPageChange={setPageNo}
                onRowCountChange={(count) => {
                  setRowCountPerPage(count);
                  setPageNo(1);
                }}
              />
            </div>
          ) : (
            <div>
              <DynamicReportDataTable
                data={data}
                totalCount={totalCount}
                pageNo={pageNo}
                rowCountPerPage={rowCountPerPage}
                onPageChange={setPageNo}
                onRowCountChange={(count) => {
                  setRowCountPerPage(count);
                  setPageNo(1);
                }}
              />
            </div>
          )
        ) : (
          <p className="no-data-message">No data available</p>
        )}
      </div>
    </div>
  );
}

export default withAuth(ReportsPage);


