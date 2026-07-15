// app/dashboard/reports/UsermgmtReport/page.jsx
// app/dashboard/reports/UsermgmtReport/page.jsx
"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams, usePathname } from "next/navigation";
import withAuth from "@/components/withAuth";
import "@/components/Styles/AvgScoreByAgent.css";
import FilteredUsersForm from "@/app/dashboard/dashboard1/Users/FilteredUsersForm";
import {
  exportToExcelReport,
  exportToCSVReport,
  exportToPDFReport,
} from "@/components/dataTable/exportReport";
import { useState } from "react";
import CryptoJS from "crypto-js";

function UserMgmtReport() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentUserFullName, setCurrentUserFullName] = useState(null);

  const ReportName = pathname.split("/").pop();
  const backHref = `/dashboard/reports?tab=${searchParams?.get("tab") || "user"}`;

  const handleExport = async (format) => {
    try {
      let userId = null;
      let userName = null; // 👈 local variable

      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        userId = user?.userId;
        userName = user?.userFullName; // 👈 read directly
        setCurrentUserFullName(userName); // optional, keep or remove
      }

      const queryParams = new URLSearchParams();
      const res = await fetch(
        `/api/dashBoard1/usersM/getFilteredUsers?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
          },
          cache: "no-store",
        },
      );

      const text = await res.text();
      if (!text) {
        alert("No data available for download.");
        return;
      }

      const result = JSON.parse(text);
      const exportData = result?.data?.users || [];

      if (!exportData.length) {
        alert("No data available for download.");
        return;
      }

      const fileNameDate = new Date().toISOString().split("T")[0];
      const fileName = `${ReportName}_${fileNameDate}`;

      switch (format) {
        case "excel":
          exportToExcelReport(exportData, userName, fileName);
          break; // 👈 userName
        case "csv":
          exportToCSVReport(exportData, userName, fileName);
          break;
        case "pdf":
          exportToPDFReport(exportData, userName, fileName);
          break;
        default:
          alert("Unsupported export format.");
      }
    } catch (error) {
      console.error("Error during export:", error);
    }
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back button */}
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
              User Management Report
            </h1>
          </div>

          {/* Right: Export */}
          <div className="relative group" tabIndex={0}>
            <button
              onClick={() => setShowExportDropdown((prev) => !prev)}
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
      </div>

      {/* Content */}
      <FilteredUsersForm />
    </div>
  );
}

export default withAuth(UserMgmtReport);
