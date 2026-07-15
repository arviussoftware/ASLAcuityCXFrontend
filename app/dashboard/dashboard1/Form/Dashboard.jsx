"use client";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import {
  FileText,
  CheckCircle,
  FolderClosed,
  Search,
  EyeOff,
} from "lucide-react";
import DataTable from "../compoment/DataTableDashboard";
import DownloadConfirmPopup from "../compoment/downloadConfirmPopup";

// Sirf Date format (DD/MM/YYYY)
const formatDateTimeValue = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value; // agar valid date nahi hua toh original return

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;  
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [userRole, setUserRole] = useState(null);  
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

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
          setUserRole(userId);
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
        const res = await fetch("/api/dashBoard1/Form/FormDashboardSummary", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userId,
          },
          cache: "no-store",
        });

        const json = await res.json();
        if (res.ok) {
          setData(json.data);
        } else {
          console.error("Failed to fetch dashboard:", json.message);
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

  const handleCardClick = async (type, modalTitle) => {
    if (!userRole) return;

    try {
      const res = await fetch(`/api/dashBoard1/Form/FormDataTable?formType=${type}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
          loggedInUserId: userRole,
        },
        cache: "no-store",
      });

      const json = await res.json();
      if (res.ok) {
        setModalData(json.data);
        setModalTitle(modalTitle);
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
        <p className="text-muted-foreground text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-60">
        <p className="text-destructive font-medium">No data found</p>
      </div>
    );
  }

  const cards = [
    { 
      title: "Total Forms", 
      value: data.TotalForms || 0, 
      icon: FileText, 
      type: "total",
      modalTitle: "Total Form"
    },
    { 
      title: "Published", 
      value: data.Published || 0, 
      icon: CheckCircle, 
      type: "published",
      modalTitle: "Published Form"
    },
    { 
      title: "Drafts", 
      value: data.Drafts || 0, 
      icon: FolderClosed, 
      type: "draft",
      modalTitle: "Draft Form"
    },
    { 
      title: "Staged", 
       value: data.Staged || 0, 
      icon: Search, 
      type: "staged",
      modalTitle: "Staged Form"
    },
    { 
      title: "Hidden", 
      value: data.Hidden || 0, 
      icon: EyeOff, 
      type: "hidden",
      modalTitle: "Hidden Form"
    },
  ];

 const downloadCSV = () => {
    if (!modalData || modalData.length === 0) return;

    const STATUS_MAP = {
      0: "Draft",
      1: "Review",
      2: "Hidden",
      3: "S taged",
      5: "Published",
    };

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
          if (col.toLowerCase() === "status" && value in STATUS_MAP) {
          value = STATUS_MAP[value];
        }
          // Agar column naam me date/time hai to format karo
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
      `${modalTitle.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 const downloadExcel = () => {
    if (!modalData || modalData.length === 0) return;

    import("xlsx").then((XLSX) => {
      const STATUS_MAP = {
        0: "Draft",
        1: "Review",
        2: "Hidden",
        3: "Staged",
        5: "Published",
      };
      const formattedData = modalData.map((row) => {
        const newRow = { ...row };
        Object.keys(newRow).forEach((col) => {
        if (col.toLowerCase() === "status" && newRow[col] in STATUS_MAP) {
          newRow[col] = STATUS_MAP[newRow[col]];
        }
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
        `${modalTitle.replace(/\s+/g, "_")}_${new Date()
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
  
  return (
    <div className="px-4 py-8 max-w-7xl mx-auto relative -mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            onClick={() => handleCardClick(card.type, card.modalTitle)}
            className="bg-card rounded-lg shadow-sm border border-border p-4 text-center hover:shadow-md hover:border-blue-400 transition-all duration-150 cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <card.icon className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              {card.title}
            </h3>
            <p className="text-xl font-semibold text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className=" bg-card rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col relative transform transition-all duration-200">
             <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 flex items-center justify-between rounded-t-lg shadow-sm">
                 <h4 className="text-sm font-semibold text-white flex items-center">
                {modalTitle}
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
            
            <DataTable
              selectedCard={{ title: modalTitle, key: "records", icon: () => null }}
              detailData={{ records: modalData }}
              onDownloadClick={(type) => {
                      setDownloadType(type);
                      setShowConfirmPopup(true);
                    }}
              showFilterDropdown={false}
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
  );
}
