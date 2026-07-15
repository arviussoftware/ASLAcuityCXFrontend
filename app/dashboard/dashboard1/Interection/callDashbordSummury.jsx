"use client";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import {
  PhoneCall,
  CheckCircle,
  Timer,
  BarChart,
  Clock,
  DivideSquare,
} from "lucide-react";
import DataTable from "../compoment/DataTableDashboard";
import DownloadConfirmPopup from "../compoment/downloadConfirmPopup";

const formatDateTimeValue = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value; // agar valid date nahi hua toh original return

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatTimeTaken = (value) => {
  if (!value) return "N/A";

  // Already number hai
  if (!isNaN(value)) {
    return Number(value);
  }

  // Agar date string hai
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.getSeconds(); // Sirf seconds part
  }

  return value;
};

export default function CallMetricsDashboard() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [filterType, setFilterType] = useState("All");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchSummary = async () => {
      const encryptedUserData = sessionStorage.getItem("user");

      if (!encryptedUserData) {
        console.warn("No user in session storage");
        setLoading(false);
        return;
      }

      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        const userRole = user?.userId;

        if (!userRole) {
          console.warn("Invalid user ID");
          setLoading(false);
          return;
        }

        setUserId(userRole);

        const res = await fetch(
          "/api/dashBoard1/interactionS/callEvaluationMetrics",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userRole,
            },
            cache: "no-store",
          },
        );

        const json = await res.json();
        if (res.ok) {
          setSummaryData(json.data);
        } else {
          console.error("Summary fetch failed:", json.message);
        }
      } catch (err) {
        console.error("Error in summary fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = async (
    type,
    title,
    selectedFilterType = "All",
    startDate = "",
    endDate = "",
  ) => {
    if (!userId) return;

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

    setFilterType(selectedFilterType);
    setModalTitle(type);

    let queryParams = `metricType=${type}&filterType=${selectedFilterType}`;
    if (selectedFilterType === "Custom") {
      queryParams += `&startDate=${startDate}&endDate=${endDate}`;
    }

    try {
      const res = await fetch(
        `/api/dashBoard1/interactionS/GetMetricCallDetails?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userId,
            timezone,
          },
          cache: "no-store",
        },
      );

      const json = await res.json();
      if (res.ok) {
        setModalData(json.data);
        setModalOpen(true);
      } else {
        console.error("Detail fetch failed:", json.message);
      }
    } catch (err) {
      console.error("Error in detail fetch:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-muted-foreground text-sm animate-pulse">
          Loading metrics...
        </p>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-destructive font-medium">No metrics found</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Calls",
      value: summaryData.TotalCalls || 0,
      icon: PhoneCall,
      type: "TotalCalls",
    },
    {
      title: "Evaluated Calls",
      value: summaryData.EvaluatedCalls || 0,
      icon: CheckCircle,
      type: "EvaluatedCalls",
    },
    {
      title: "Avg. Eval Time (s)",
      value: summaryData.AvgEvalTime?.toFixed(2) || 0,
      icon: Timer,
      type: "AvgEvalTime",
    },
    {
      title: "Avg. Eval Score",
      value: summaryData.AvgEvalScore?.toFixed(2) || 0,
      icon: BarChart,
      type: "AvgEvalScore",
    },
    // {
    //   title: "Avg. Call Duration",
    //   value: summaryData.AvgCallDuration?.toFixed(2) || 0,
    //   icon: Clock,
    //   type: "AvgCallDuration",
    // },
    // {
    //   title: "Avg. Hold Per Call",
    //   value: summaryData.AvgHoldPerCall?.toFixed(2) || 0,
    //   icon: DivideSquare,
    //   type: "AvgHoldPerCall",
    // },
  ];

  const downloadCSV = () => {
    if (!modalData || modalData.length === 0) return;

    const columns = Object.keys(modalData[0]);

    const formatColumnName = (col) => {
      return col
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    const headers = columns.map((col) => formatColumnName(col)).join(",");

    const csvRows = modalData.map((row) =>
      columns
        .map((col) => {
          let value = row[col];

          // Special case for Time Taken (s)
          if (col === "Time Taken (s)") {
            value = formatTimeTaken(value);
          }
          if (col === "Avg.  Time (s)") {
            value = formatTimeTaken(value);
          }
          // Format other date/time columns
          else if (
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
        .join(","),
    );

    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${modalTitle.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    if (!modalData || modalData.length === 0) return;

    import("xlsx").then((XLSX) => {
      const formattedData = modalData.map((row) => {
        const newRow = { ...row };
        Object.keys(newRow).forEach((col) => {
          if (col === "Time Taken (s)") {
            newRow[col] = formatTimeTaken(newRow[col]);
          }
          if (col === "Avg.  Time (s)") {
            newRow[col] = formatTimeTaken(newRow[col]);
          } else if (
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
        `${modalTitle.replace(/\s+/g, "_")}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
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

  return (
    <div className="px-4 py-8 max-w-7xl mx-auto">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-card rounded-lg shadow-sm border border-border p-4 text-center hover:shadow-md hover:border-blue-400 transition-all duration-150 cursor-pointer"
            onClick={() => handleCardClick(card.type, card.title)}
          >
            <div className="flex justify-center mb-2">
              <card.icon className="h-6 w-6 text-blue-500" />
            </div>
            <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {card.title}
            </h4>
            <p className="text-xl font-semibold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Modal (Optional Display) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {modalTitle} Details
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-destructive text-sm"
              >
                Close
              </button>
            </div>
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className=" bg-card rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col relative transform transition-all duration-200">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex items-center justify-between rounded-t-lg shadow-sm">
                    <h4 className="text-sm font-semibold text-white flex items-center">
                      {modalTitle} Details
                    </h4>
                    <button
                      className="text-white hover:bg-blue-100 hover:text-primary rounded-full p-1 transition-all duration-150 focus:ring-2 focus:ring-ring outline-none"
                      onClick={() => setModalOpen(false)}
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
                  {/* <DataTable
                    selectedCard={{
                      title: modalTitle,
                      key: "records",
                      icon: () => null,
                    }} 
                    detailData={{ records: modalData }}
                    onDownloadClick={(type) => {
                      setDownloadType(type);
                      setShowConfirmPopup(true);
                    }}

                    onFilterClick={(type) => {
                      setFilterType(type);
                    }}
                  /> */}
                  <DataTable
                    selectedCard={{
                      title: modalTitle,
                      key: "records",
                      icon: () => null,
                    }}
                    detailData={{ records: modalData }}
                    currentFilter={filterType}
                    onFilterChange={(type, startDate, endDate) => {
                      setFilterType(type);
                      handleCardClick(
                        modalTitle.replace(/\s/g, ""),
                        modalTitle,
                        type,
                        startDate,
                        endDate,
                      );
                    }}
                    onDownloadClick={(type) => {
                      setDownloadType(type);
                      setShowConfirmPopup(true);
                    }}
                  />

                  <DownloadConfirmPopup
                    isOpen={showConfirmPopup}
                    onConfirm={handleDownloadConfirm}
                    onCancel={handleDownloadCancel}
                    downloadType={downloadType}
                    noData={!modalData || modalData.length === 0}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
