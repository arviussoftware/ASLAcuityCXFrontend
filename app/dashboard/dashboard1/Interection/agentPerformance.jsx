"use client";

import { useEffect, useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import CryptoJS from "crypto-js";
import { format, parseISO, subDays, isBefore } from "date-fns";
import {
  AlertCircle,
  Loader2,
  BarChart2,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { Tooltip as ReactTooltip } from "react-tooltip";
import DownloadConfirmPopup from "../compoment/downloadConfirmPopup";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AgentPerformancePage = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "EvaluationDate",
    direction: "desc",
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("weekly");
  const itemsPerPage = 7;

  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });

  useEffect(() => {
    const today = new Date();
    let startDate;

    switch (filterType) {
      case "daily":
        startDate = subDays(today, 1);
        break;
      case "weekly":
        startDate = subDays(today, 7);
        break;
      case "monthly":
        startDate = subDays(today, 30);
        break;
      case "All":
        return;
      case "custom":
        return;
      default:
        return; // Do not auto-update
    }

    setDateRange({ startDate, endDate: today });
  }, [filterType]);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setIsLoading(true);
      setError(null);

      const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

      if (!API_TOKEN) {
        setError("Configuration error. Please contact support.");
        setIsLoading(false);
        return;
      }

      let userId = null;
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId;
        }
      } catch (error) {
        console.error("Decryption failed:", error);
        setError("Failed to decrypt user data. Please log in again.");
        setIsLoading(false);
        return;
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

      if (!userId) {
        setError("User authentication required.");
        setIsLoading(false);
        return;
      }

      if (isBefore(dateRange.endDate, dateRange.startDate)) {
        setError("End date must be after start date.");
        setPerformanceData([]);
        setIsLoading(false);
        return;
      }

      try {
        const startDateStr = format(dateRange.startDate, "yyyy-MM-dd");
        const endDateStr = format(dateRange.endDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/dashBoard1/interactionS/agentPerformance?filterType=${filterType}&startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
              timezone,
            },
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (response.ok) {
          setPerformanceData(json?.data || []);
        } else {
          console.error("API error:", json.message);
          setError(json.message || "Failed to load performance data.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("An error occurred while fetching performance data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableData = [...performanceData];
    if (filter) {
      sortableData = sortableData.filter((entry) =>
        entry.AgentName?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "EvaluationDate") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sortableData;
  }, [performanceData, sortConfig, filter]);

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = [
      "Agent",
      "Eval Date",
      "Avg Score",
      "Avg Time (s)",
      "Calls",
      "Trend",
    ];

    const rows = sortedData.map((entry) => {
      const row = [
        entry.AgentName || "N/A",
        entry.EvaluationDate
          ? format(parseISO(entry.EvaluationDate), "dd/MM/yy") // ✅ Fixed here
          : "N/A",
        entry.AvgScore ?? "N/A",
        entry.AvgEvalTimeInSec ?? "N/A",
        entry.EvaluatedCalls ?? "0",
        entry.PerformanceTrend ?? "N/A",
      ];

      // Quote each field to handle commas and empty values
      return row.map((val) => `"${val}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "agent_performance.csv";
    link.click();
  };

  const renderTrendIcon = (trend, index) => {
    // Normalize the trend value for comparison
    const normalizedTrend = trend?.toLowerCase()?.trim();

    switch (normalizedTrend) {
      case "first eval":
        return (
          <div
            data-tooltip-id={`trend-${index}`}
            data-tooltip-content="First Eval"
            className="flex justify-center"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <ReactTooltip id={`trend-${index}`} place="top" />
          </div>
        );
      case "dipped":
        return (
          <div
            data-tooltip-id={`trend-${index}`}
            data-tooltip-content="Dipped"
            className="flex justify-center"
          >
            <TrendingDown className="w-4 h-4 text-red-500" />
            <ReactTooltip id={`trend-${index}`} place="top" />
          </div>
        );
      case "improved":
        return (
          <div
            data-tooltip-id={`trend-${index}`}
            data-tooltip-content="Improved"
            className="flex justify-center"
          >
            <TrendingUp className="w-4 h-4 text-green-500" />
            <ReactTooltip id={`trend-${index}`} place="top" />
          </div>
        );
      case "consistent":
        return (
          <div
            data-tooltip-id={`trend-${index}`}
            data-tooltip-content="Consistent"
            className="flex justify-center"
          >
            <Minus className="w-4 h-4 text-blue-500" />
            <ReactTooltip id={`trend-${index}`} place="top" />
          </div>
        );
      default:
        return (
          <div
            data-tooltip-id={`trend-${index}`}
            data-tooltip-content={trend || "Unknown"}
            className="flex justify-center"
          >
            <span className="text-muted-foreground">-</span>
            <ReactTooltip id={`trend-${index}`} place="top" />
          </div>
        );
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col h-full hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col gap-3 mb-4">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1 widget-drag-handle cursor-move select-none">
          <BarChart2 className="w-5 h-5 text-primary" />
          Agent Performance
        </h2>

        {/* TOP ROW — Search / Filter / Download */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {filterType !== "All" && (
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search agents..."
              className="border rounded px-2 py-1 text-xs w-32"
            />
          )}

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded px-2 py-1 text-xs bg-card text-foreground"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="All">Custom</option>
          </select>

          <button
            onClick={() => setShowExportModal(true)}
            className="text-sm border px-3 py-1 rounded text-primary border-blue-600 hover:bg-blue-50 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* SECOND ROW — Custom Date Range */}
        <div
          className={`transition-all duration-300 overflow-hidden
      ${filterType === "All" ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}
    `}
        >
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 p-2 rounded border">
            <span className="text-xs text-foreground font-medium">
              Select Date Range:
            </span>

            <input
              type="date"
              value={format(dateRange.startDate, "yyyy-MM-dd")}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  startDate: new Date(e.target.value),
                }))
              }
              className="border rounded px-2 py-1 text-xs min-w-[120px]"
            />

            <span className="text-xs text-muted-foreground">to</span>

            <input
              type="date"
              value={format(dateRange.endDate, "yyyy-MM-dd")}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  endDate: new Date(e.target.value),
                }))
              }
              className="border rounded px-2 py-1 text-xs min-w-[120px]"
            />
          </div>
        </div>
      </div>

      <DownloadConfirmPopup
        isOpen={showExportModal}
        onConfirm={() => {
          exportToCSV();
          setShowExportModal(false);
        }}
        onCancel={() => setShowExportModal(false)}
        downloadType="csv"
        noData={sortedData.length === 0}
      />

      {isLoading ? (
        <div className="text-center text-sm text-primary">
          <Loader2 className="animate-spin inline-block mr-2" />
          Loading performance data...
        </div>
      ) : error ? (
        <div className="text-center text-destructive text-sm">
          <AlertCircle className="inline-block mr-1" />
          {error}
        </div>
      ) : sortedData.length === 0 ? (
        <div
          className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded-md"
          role="alert"
        >
          <div className="flex items-center gap-1.5 text-red-700">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            <p className="text-xs font-medium">No performance data found.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-blue-100 text-blue-900 text-left">
                  {[
                    { key: "AgentName", label: "Agent" },
                    { key: "EvaluationDate", label: "Eval Date" },
                    { key: "AvgScore", label: "Avg Score" },
                    { key: "AvgEvalTimeInSec", label: "Avg Call Time" },
                    { key: "EvaluatedCalls", label: "Calls" },
                    { key: "PerformanceTrend", label: "Trend" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 py-2 cursor-pointer whitespace-nowrap hover:bg-blue-200 transition-all"
                    >
                      {label}{" "}
                      {sortConfig.key === key &&
                        (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((entry, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-card" : "bg-muted"}
                  >
                    <td className="px-3 py-2 text-foreground font-medium text-xs">
                      {entry.AgentName || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium text-xs">
                      {entry.EvaluationDate
                        ? format(parseISO(entry.EvaluationDate), "dd MMM yyyy")
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium text-xs">
                      {entry.AvgScore}
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium text-xs">
                      {(() => {
                        const seconds = parseInt(entry.AvgCallDuration);
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        return `${mins} min ${secs} sec`;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium text-xs">
                      {entry.EvaluatedCalls || 0}
                    </td>
                    <td className="px-3 py-2">
                      {renderTrendIcon(entry.PerformanceTrend, index)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex justify-between items-center mt-3 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
            >
              ← Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentPerformancePage;

