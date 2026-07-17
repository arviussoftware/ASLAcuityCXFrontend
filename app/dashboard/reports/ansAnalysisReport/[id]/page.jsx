"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import DatePicker from "react-datepicker";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "react-datepicker/dist/react-datepicker.css";
import "@/components/Styles/AvgScoreByAgent.css";
import { ChevronLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useTable } from "react-table";
import CryptoJS from 'crypto-js';
import { notFound } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

function ReportsPage() {
  const { id: formId } = useParams(); // Get formId from the URL
  const [loading, setLoading] = useState(false);
  const [gridData, setGridData] = useState(null);
  const [selectedFormName, setSelectedFormName] = useState("");
  const [filter, setFilter] = useState("Today");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);

  useEffect(() => {
    const today = new Date();
    switch (filter) {
      case "Today": {
        setStartDate(new Date(today));
        setEndDate(new Date(today));
        break;
      }
      case "Yesterday": {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        setStartDate(new Date(yesterday));
        setEndDate(new Date(yesterday));
        break;
      }
      case "DayBeforeYesterday": {
        const dayBeforeYesterday = new Date();
        dayBeforeYesterday.setDate(today.getDate() - 2);
        setStartDate(new Date(dayBeforeYesterday));
        setEndDate(new Date(dayBeforeYesterday));
        break;
      }
      case "ThisMonth": {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of the current month
        setStartDate(new Date(firstDayOfMonth));
        setEndDate(new Date(lastDayOfMonth));
        break;
      }

      default:
        break;
    }
  }, [filter]);
  
  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 10,
            orgId: sessionStorage.getItem("selectedOrgId") || "", // Users module
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);

      } catch (err) {
        console.warn("Error fetching privileges:", err);
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);

  const fetchFormAnswers = async (formId) => {
    try {

      setLoading(true);

      const encryptedUserData = sessionStorage.getItem("user");

      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const formattedStartDate = startDate
        ? startDate.toISOString().split("T")[0]
        : null;
      const formattedEndDate = endDate
        ? endDate.toISOString().split("T")[0]
        : null;

      const response = await fetch("/api/reports/questionAnswerreports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          formId,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {

        setSelectedFormName(result.formName || "Unknown Form");
        const formattedData = generateFormattedData(
          result.formAnswers || [],
          formId,
          result.formName
        );
        setGridData(formattedData || []);
      } else {
        // console.error("Invalid API response structure:", result);
        // setSelectedFormName("Unknown Form");

        setSelectedFormName(result.message);
        setGridData(null);
      }
    } catch (error) {
      console.error("Error fetching form answers:", error);
      setSelectedFormName("Unknown Form");
      setGridData(null);
    } finally {
      setLoading(false);
    }
  };




  // useEffect(() => {
  //   if (formId && startDate && endDate) {
  //     fetchFormAnswers(formId);
  //   }
  // }, [formId, startDate, endDate]);

  const generateFormattedData = (formAnswers, formId, formName) => {
    const headers = new Set();
    const rows = {};
    formAnswers.forEach((item) => {
      const interactionId = item.interactionId || "N/A";
      if (!rows[interactionId]) {
        rows[interactionId] = {
          InteractionId: interactionId,
          FormName: formName,
        };
      }
      const question = item.question || "No Question";
      headers.add(question);
      rows[interactionId][question] = item.answer || "No answer provided";
    });
    return Object.values(rows);
  };

  // ReportsGrid Component code here
  const columns = React.useMemo(() => {
    if (!gridData || gridData.length === 0) return [];
    const baseHeaders = [
      {
        Header: "Interaction Details",
        columns: [
          { Header: "InteractionId", accessor: "InteractionId" },
          // { Header: "FormName", accessor: "FormName" },
        ],
      },
    ];

    const questionHeaders = {
      Header: "Q/A",
      columns: Object.keys(gridData[0])
        .filter((key) => key !== "InteractionId" && key !== "FormName")
        .map((key) => ({
          Header: key,
          accessor: (row) => row[key],
        })),
    };
    return [...baseHeaders, questionHeaders];
  }, [gridData]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data: gridData || [],
    });

  const downloadGridDataAsExcel = () => {
    if (!gridData || gridData.length === 0) {
      alert("No data available to download.");
      return;
    }

    const truncatedSheetName = selectedFormName
      .slice(0, 31) // Truncate to 31 characters
      .replace(/[:\\/?*[\]]/g, ""); // Remove invalid characters for Excel sheet names

    const worksheet = XLSX.utils.json_to_sheet(gridData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, truncatedSheetName);

    const fileName = `Form_${selectedFormName.replace(/[:\\/?*[\]]/g, "")}_Answers.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };
  useEffect(() => {
    if (formId && startDate && endDate && privilegesLoaded && hasPrivilege(1)) {
      fetchFormAnswers(formId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, startDate, endDate, privilegesLoaded]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }
  return (
    <div className="reports-container">
      <div className="flex justify-between items-center mb-4">
        <Link href="/dashboard/reports/ansAnalysisReport" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="filter-section">
          <select
            className="filter-dropdown"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="DayBeforeYesterday">Day Before Yesterday</option>
            <option value="ThisMonth">This Month</option>
            <option value="Custom">Custom</option>
          </select>

          {filter === "Custom" && (
            <div className="flex items-center justify-center gap-4 text-xs">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                className="w-full border border-border rounded-lg p-2"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => {
                  if (startDate && date < startDate) {
                    alert("End date cannot be less than start date.");
                  } else {
                    setEndDate(date);
                  }
                }}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                className="w-full border border-border rounded-lg p-2"
              />
            </div>
          )}
          <button
            onClick={downloadGridDataAsExcel}
            className="bg-blue-500 text-white px-2 py-1 rounded flex items-center"
            disabled={!gridData || gridData.length === 0}
          >
            <Download />
          </button>
        </div>
      </div>

      {/* Display a message when there is no grid data */}
      {!gridData && selectedFormName && (
        <div className="text-center text-red-500 my-4">
          {selectedFormName}
        </div>
      )}

      {gridData && (
        <div className="overflow-x-auto">
          <table
            {...getTableProps()}
            className="min-w-full border-collapse border border-border text-xs"
          >
            <thead>
              {headerGroups.map((headerGroup) => (
                <tr key={headerGroup.id} {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <th
                      key={column.id}
                      {...column.getHeaderProps()}
                      className="border border-border bg-muted px-2 py-1"
                    >
                      {column.render("Header")}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map((row) => {
                prepareRow(row);
                return (
                  <tr key={row.id} {...row.getRowProps()}>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.column.id}
                        {...cell.getCellProps()}
                        className="border px-2 py-1"
                      >
                        {cell.render("Cell")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


}

export default withAuth(ReportsPage);
