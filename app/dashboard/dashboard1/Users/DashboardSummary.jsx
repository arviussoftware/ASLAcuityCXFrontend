"use client";
import { useEffect, useState, useRef } from "react";
import CryptoJS from "crypto-js";
import { Users, UserCheck, UserX, ShieldCheck, Building2 } from "lucide-react";
import DownloadConfirmPopup from "../compoment/downloadConfirmPopup";
import DataTable from "../compoment/DataTableDashboard";

export default function DashboardSummary() {
  const [summaryData, setSummaryData] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const tableRef = useRef(null);
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    if (selectedCard && tableRef.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedCard]);

  useEffect(() => {
    const fetchData = async () => {
      let userId = null;
      const encryptedUserData = sessionStorage.getItem("user");

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      if (!userId) {
        console.warn("User ID missing");
        setLoading(false);
        return;
      }

      try {
        const [summaryRes, detailRes] = await Promise.all([
          fetch("/api/dashBoard1/usersM", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
            },
            cache: "no-store",
          }),
          fetch("/api/dashBoard1/usersM/user_data_table", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
            },
            cache: "no-store",
          }),
        ]);

        const summaryJson = await summaryRes.json();
        const detailJson = await detailRes.json();

        if (summaryRes.ok) {
          setSummaryData(summaryJson.data);
        }
        if (detailRes.ok) {
          setDetailData(detailJson.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <svg
          className="animate-spin h-6 w-6 text-blue-500 mr-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-red-500 font-medium text-sm">No data found</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: summaryData.TotalUsers || 0,
      icon: Users,
      key: "allUsers",
    },
    {
      title: "Active Users",
      value: summaryData.ActiveUsers || 0,
      icon: UserCheck,
      key: "activeUsers",
    },
    {
      title: "Inactive Users",
      value: summaryData.InactiveUsers || 0,
      icon: UserX,
      key: "inactiveUsers",
    },
    {
      title: "Unique Roles",
      value: summaryData.TotalUniqueRoles || 0,
      icon: ShieldCheck,
      key: "roleSummary",
    },
    {
      title: "Organizations",
      value: summaryData.TotalOrganizations || 0,
      icon: Building2,
      key: "orgSummary",
    },
  ];

  const handleDownloadClick = (type) => {
    setDownloadType(type);
    setShowConfirmPopup(true);
  };

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value; // agar valid date nahi hua toh original return

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;  
};

 const downloadCSV = () => {
  const list = detailData[selectedCard.key];
  const columns = list.length > 0 ? Object.keys(list[0]) : [];
  const formatColumnName = (col) => {
    return col
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const headers = columns.map((col) => formatColumnName(col)).join(",");
  const csvRows = list.map((row) =>
     columns
      .map((col) => {
        let value = row[col];
        if (col === "is_active") {
          if (value === true || String(value).toLowerCase() === "true") {
            value = "Active";
          } else if (value === false || String(value).toLowerCase() === "false") {
            value = "Inactive";
          }
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
    `${selectedCard.title.replace(/\s+/g, "_")}_${formatDateTime()}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadExcel = () => {
  import("xlsx").then((XLSX) => {
    let list = detailData[selectedCard.key].map((row) => {
      let newRow = { ...row };
 if ("is_active" in newRow) {
  let val = newRow["is_active"];

  if (val === true || String(val).toLowerCase() === "true") {
    newRow["is_active"] = "Active";
  } else if (val === false || String(val).toLowerCase() === "false") {
    newRow["is_active"] = "Inactive";
  }
}



      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(list);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(
      workbook,
      `${selectedCard.title.replace(/\s+/g, "_")}_${formatDateTime()}.xlsx`
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
    <div className="px-4 py-8 max-w-7xl mx-auto relative -mt-4">
      {/* POPUP MODAL */}
      {selectedCard && detailData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative transform transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.2s ease forwards" }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex items-center justify-between rounded-t-lg shadow-sm">
              <h4 className="text-sm font-semibold text-white flex items-center">
                <selectedCard.icon className="h-4 w-4 text-white mr-1.5" />
                {selectedCard.title}
              </h4>
              <button
                className="text-white hover:bg-blue-100 hover:text-primary rounded-full p-1 transition-all duration-150 focus:ring-2 focus:ring-ring outline-none"
                onClick={() => setSelectedCard(null)}
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

            {/* Modal Body */}
            <div className="flex-1 p-0 overflow-y-auto custom-scrollbar relative">
              <DataTable
                selectedCard={selectedCard}
                detailData={detailData}
                onDownloadClick={handleDownloadClick}
                showFilterDropdown={false}
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
              />
              <DownloadConfirmPopup
                isOpen={showConfirmPopup}
                onConfirm={handleDownloadConfirm}
                onCancel={handleDownloadCancel}
                downloadType={downloadType}
                noData={detailData?.[selectedCard?.key]?.length === 0}
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CARDS - blurred and disabled when popup open */}
      <div
        className={`${
          selectedCard ? "filter blur-sm pointer-events-none select-none" : ""
        }`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
          {cards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedCard(card)}
              className={`cursor-pointer bg-card rounded-lg shadow-sm border border-border p-4 text-center hover:shadow-md hover:border-blue-400 transition-all duration-150 ${
                selectedCard?.title === card.title
                  ? "border-blue-500"
                  : "border-border"
              }`}
            >
              <div className="flex justify-center mb-2">
                <card.icon className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {card.title}
              </h3>
              <p className="text-lg font-semibold text-blue-500">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
