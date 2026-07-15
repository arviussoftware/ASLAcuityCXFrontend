// new code:
import { useEffect, useMemo, useState } from "react";
import CryptoJS from "crypto-js";
import { createPortal } from "react-dom"; // Add this at the top, near other imports
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CheckCircle,
  XCircle,
  BarChart2,
} from "lucide-react";
import DataTable from "../compoment/DataTableDashboard";
import DownloadConfirmPopup from "../compoment/downloadConfirmPopup";

export default function EvaluationTable() {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("Total");
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState([]);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [detailedViewData, setDetailedViewData] = useState([]);
  const itemsPerPage = 12;
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  const AES_SECRET_KEY = process.env.NEXT_PUBLIC_AES_SECRET_KEY;

  // Decrypt timezone from sessionStorage
  const getDecryptedTimezone = () => {
    const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
    if (encryptedTimezone) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData);
      } catch (err) {
        console.error("Failed to decrypt timezone:", err);
      }
    }
    return null;
  };

  // Get user data helper function
  const getUserData = () => {
    const encryptedUserData = sessionStorage.getItem("user");
    if (!encryptedUserData) {
      throw new Error("User session not found");
    }

    const bytes = CryptoJS.AES.decrypt(encryptedUserData, AES_SECRET_KEY || "");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const user = JSON.parse(decryptedData);
    const userRole = user?.userId;

    if (!userRole) {
      throw new Error("User ID missing - please login again");
    }

    return userRole;
  };

  // Fetch summary and initial data
  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      setError("");

      try {
        const userRole = getUserData();
        const timezone = getDecryptedTimezone();

        const [summaryRes, detailRes] = await Promise.all([
          fetch("/api/dashBoard1/interactionS/getEvaluationPassFailDetails", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userRole,
              timezone,
            },
            cache: "no-store",
          }),
          fetch(
            `/api/dashBoard1/interactionS/GetEvaluationDetailsByStatus?filterType=Total`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_TOKEN}`,
                loggedInUserId: userRole,
                timezone,
              },
              cache: "no-store",
            }
          ),
        ]);

        if (!summaryRes.ok || !detailRes.ok) {
          throw new Error("Failed to fetch initial data");
        }

        const summaryJson = await summaryRes.json();
        const detailJson = await detailRes.json();

        console.log("Summary Response:", summaryJson);
        console.log("Detail Response:", detailJson);

        setSummary(summaryJson.summary?.[0] || null);
        const initialData = detailJson.data || [];
        setDetails(initialData);
        setFilteredData(initialData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Error loading evaluation data.");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_TOKEN, AES_SECRET_KEY]);

  // Fetch filtered data based on current filter
  const fetchFilteredData = async (filterType = "Total") => {
    setLoading(true);
    setError("");

    try {
      const userRole = getUserData();
      const timezone = getDecryptedTimezone();

      // API endpoint properly format karo
      let apiUrl = `/api/dashBoard1/interactionS/GetEvaluationDetailsByStatus`;
      if (filterType !== "Total") {
        apiUrl += `?statusFilter=${filterType}`;
      } else {
        apiUrl += `?filterType=Total`;
      }

      console.log("Fetching data from:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
          loggedInUserId: userRole,
          timezone,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch filtered data: ${response.status}`);
      }

      const data = await response.json();
      console.log("Filtered Data Response:", data);

      const newData = data.data || [];

      // Always update filteredData with fresh data
      setFilteredData(newData);

      // If Total filter, also update details
      if (filterType === "Total") {
        setDetails(newData);
      }

      // Reset current page to 1 when filter changes
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Error loading filtered data.");
    } finally {
      setLoading(false);
    }
  };

  // Filter change par data fetch karo - but avoid conflict with modal
  useEffect(() => {
    if (filter && !showModal) {
      fetchFilteredData(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, showModal]);

  // Calculate total pages based on current filteredData
  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / itemsPerPage) || 1;
  }, [filteredData.length, itemsPerPage]);

  // Slice data for current page
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    console.log(
      `Paginating: Page ${currentPage}, Start: ${start}, End: ${end}, Total: ${filteredData.length}`
    );
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage]);

  // Pagination controls
  const goToPage = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    console.log(`Going to page: ${newPage}`);
    setCurrentPage(newPage);
  };

  // Fetch detailed view data when modal is opened
  const handleCardClick = async (statusFilter, dateFilter = "All") => {
    console.log("Card clicked:", statusFilter, dateFilter);

    // Set filter state first, but don't trigger the useEffect
    setFilter(statusFilter);
    setSelectedCard(statusFilter);
    setShowModal(true);
    setDetailedViewData([]); // Clear previous data

    try {
      const userRole = getUserData();
      const timezone = getDecryptedTimezone();

      // API URL properly construct karo
      let apiUrl = `/api/dashBoard1/interactionS/GetEvaluationDetailsByStatus`;

      if (statusFilter === "Total") {
        apiUrl += `?filterType=Total`;
      } else {
        apiUrl += `?statusFilter=${statusFilter}`;
      }

      if (dateFilter && dateFilter !== "All") {
        apiUrl += `&dateFilter=${dateFilter}`;
      }

      console.log("Modal API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
          loggedInUserId: userRole,
          timezone,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch detailed data: ${response.status}`);
      }

      const data = await response.json();
      console.log("Modal Data Response:", data);

      const modalData = data.data || [];
      setDetailedViewData(modalData);

      // Also update the main table data when opening modal
      const mainTableData = modalData || [];
      setFilteredData(mainTableData);

      if (statusFilter === "Total") {
        setDetails(mainTableData);
      }

      setCurrentPage(1); // Reset pagination

      if (modalData.length === 0) {
        console.warn("No data received for modal");
      }
    } catch (err) {
      console.error("Modal fetch error:", err);
      setError(err.message || "Error loading detailed data.");
    }
  };

  // Handle modal close and refresh table data
  const handleModalClose = () => {
    setShowModal(false);
    // Refresh the table data when modal closes
    setTimeout(() => {
      fetchFilteredData(filter);
    }, 100);
  };

  // Pagination UI - Fixed version
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const startEntry = (currentPage - 1) * itemsPerPage + 1;
    const endEntry = Math.min(currentPage * itemsPerPage, filteredData.length);
    const totalEntries = filteredData.length;

    // Don't show negative or invalid ranges
    if (startEntry > totalEntries) return null;

    return (
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>
          Showing {startEntry} to {endEntry} of {totalEntries} entries
        </span>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="p-1 border rounded-full disabled:opacity-50 hover:bg-indigo-100 disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="w-4 h-4 text-indigo-600" />
          </button>

          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 border rounded-full disabled:opacity-50 hover:bg-indigo-100 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-600" />
          </button>

          {Array.from({ length: endPage - startPage + 1 }, (_, idx) => {
            const pageNum = startPage + idx;
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`px-2 py-0.5 border rounded-full text-xs transition-colors ${
                  currentPage === pageNum
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "hover:bg-indigo-100 text-indigo-600"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 border rounded-full disabled:opacity-50 hover:bg-indigo-100 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-indigo-600" />
          </button>

          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 border rounded-full disabled:opacity-50 hover:bg-indigo-100 disabled:cursor-not-allowed"
          >
            <ChevronsRight className="w-4 h-4 text-indigo-600" />
          </button>
        </div>
      </div>
    );
  };

  // Helper for formatting date/time
  const formatDateTimeValue = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const downloadCSV = () => {
    if (!detailedViewData || detailedViewData.length === 0) return;

    const columns = Object.keys(detailedViewData[0]);

    const formatColumnName = (col) => {
      return col
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    const headers = columns.map((col) => formatColumnName(col)).join(",");

    const csvRows = detailedViewData.map((row) =>
      columns
        .map((col) => {
          let value = row[col];

          if (
            col.toLowerCase().includes("date") ||
            col.toLowerCase().includes("time")
          ) {
            value = formatDateTimeValue(value);
          }

          value =
            value === null || value === undefined
              ? "N/A"
              : String(value).replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(",")
    );

    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${selectedCard.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    if (!detailedViewData || detailedViewData.length === 0) return;

    import("xlsx").then((XLSX) => {
      const formattedData = detailedViewData.map((row) => {
        const newRow = { ...row };
        Object.keys(newRow).forEach((col) => {
          if (
            col.toLowerCase().includes("date") ||
            col.toLowerCase().includes("time")
          ) {
            newRow[col] = formatDateTimeValue(newRow[col]);
          }
        });
        return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(
        workbook,
        `${selectedCard.replace(/\s+/g, "_")}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
    });
  };

  const handleDownloadConfirm = () => {
    if (downloadType === "csv") {
      downloadCSV();
    } else if (downloadType === "excel") {
      downloadExcel();
    }
    setShowConfirmPopup(false);
    setDownloadType(null);
  };

  const handleDownloadCancel = () => {
    setShowConfirmPopup(false);
    setDownloadType(null);
  };

  // Debug info
  console.log("Current State:", {
    filter,
    currentPage,
    totalPages,
    filteredDataLength: filteredData.length,
    paginatedDataLength: paginatedData.length,
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-2 rounded-lg shadow-md border border-border flex flex-col h-full hover:shadow-lg transition-all duration-300 w-full gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-1.5 rounded-md">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
              Evaluation Details
            </h2>
            <p className="text-xs text-muted-foreground">Pass/Fail Details</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-2">
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="opacity-25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
              className="opacity-75"
            />
          </svg>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs bg-red-50 p-1.5 rounded-md mb-2">
          {error}
        </p>
      )}

      {summary && (
        <div className="mb-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Total */}
            <div
              className={`flex items-center gap-1.5 p-2 rounded-md border shadow-sm cursor-pointer transition-all duration-200 ${
                filter === "Total"
                  ? "bg-indigo-100 border-indigo-500 scale-105"
                  : "bg-card border-indigo-300 hover:shadow-md hover:scale-105"
              }`}
              onClick={() => handleCardClick("Total")}
            >
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-base font-semibold text-indigo-700">
                  {summary.TotalEvaluations}
                </p>
              </div>
            </div>

            {/* Passed */}
            <div
              className={`flex items-center gap-1.5 p-2 rounded-md border shadow-sm cursor-pointer transition-all duration-200 ${
                filter === "Passed"
                  ? "bg-green-100 border-green-500 scale-105"
                  : "bg-card border-green-300 hover:shadow-md hover:scale-105"
              }`}
              onClick={() => handleCardClick("Passed")}
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Passed</p>
                <p className="text-base font-semibold text-green-700">
                  {summary.Passed}
                </p>
              </div>
            </div>

            {/* Failed */}
            <div
              className={`flex items-center gap-1.5 p-2 rounded-md border shadow-sm cursor-pointer transition-all duration-200 ${
                filter === "Failed"
                  ? "bg-red-100 border-red-500 scale-105"
                  : "bg-card border-red-300 hover:shadow-md hover:scale-105"
              }`}
              onClick={() => handleCardClick("Failed")}
            >
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-base font-semibold text-red-700">
                  {summary.Failed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-card rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col relative transform transition-all duration-200">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex items-center justify-between rounded-t-lg shadow-sm">
                <h4 className="text-sm font-semibold text-white flex items-center">
                  {selectedCard} Agent Evaluations ({detailedViewData.length}{" "}
                  records)
                </h4>
                <button
                  className="text-white hover:bg-blue-100 hover:text-primary rounded-full p-1 transition-all duration-150 focus:ring-2 focus:ring-ring outline-none"
                  onClick={handleModalClose}
                  aria-label="Close popup"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <DataTable
                selectedCard={{
                  key: "evaluations",
                  title: `${selectedCard || "All"} Agent Evaluations`,
                  icon: () => (
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 27 27"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2l4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ),
                }}
                currentFilter={filter}
                onFilterChange={(dateFilter) => {
                  handleCardClick(selectedCard, dateFilter);
                }}
                detailData={{ evaluations: detailedViewData }}
                onDownloadClick={(type) => {
                  setDownloadType(type);
                  setShowConfirmPopup(true);
                }}
                allowCustomFilter={false}
              />
            </div>
          </div>,
          document.body // Or a div with id="modal-root" if you add one to your index.html
        )}

      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border shadow-sm">
        <table className="min-w-full text-xs text-left text-muted-foreground">
          <thead className="bg-indigo-50 sticky top-0 z-10">
            <tr className="border-b border-indigo-100">
              <th className="p-2 pl-4 font-medium text-indigo-800 border-r border-indigo-100 w-[35%]">
                Agent Name
              </th>
              <th className="p-2 font-medium text-indigo-800 border-r border-indigo-100 w-[45%]">
                Form Name
              </th>
              <th className="p-2 pr-4 font-medium text-indigo-800 w-[20%] rounded-tr-lg">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr
                  key={`${row.CallId}-${index}`}
                  className="hover:bg-indigo-50/20 transition-colors duration-100 even:bg-muted/20"
                >
                  <td className="p-2 pl-4 font-medium text-foreground border-r border-gray-50 truncate max-w-[140px]">
                    {row.AgentName || "N/A"}
                  </td>
                  <td className="p-2 text-indigo-600 border-r border-gray-50 truncate max-w-[140px]">
                    {row.form_name || "N/A"}
                  </td>
                  <td className="p-2 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.EvaluationStatus === "Passed"
                          ? "bg-green-50 text-green-600 ring-1 ring-green-100"
                          : "bg-rose-50 text-rose-600 ring-1 ring-rose-100"
                      }`}
                    >
                      {row.EvaluationStatus === "Passed" ? (
                        <svg
                          className="w-2.5 h-2.5 mr-1 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-2.5 h-2.5 mr-1 text-rose-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {row.EvaluationStatus || "N/A"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="p-4 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      No records found for {filter}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && renderPagination()}

      <DownloadConfirmPopup
        isOpen={showConfirmPopup}
        onConfirm={handleDownloadConfirm}
        onCancel={handleDownloadCancel}
        downloadType={downloadType}
        noData={!detailedViewData || detailedViewData.length === 0}
      />
    </div>
  );
}

