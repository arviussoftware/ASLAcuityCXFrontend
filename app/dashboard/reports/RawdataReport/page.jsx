"use client";
import React, { useState, useEffect } from "react";
import { notFound, useSearchParams } from "next/navigation";
import CryptoJS from "crypto-js";
import { useTable } from "react-table";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { DownloadIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import withAuth from "@/components/withAuth";
import "@/components/Styles/AvgScoreByAgent.css";
import * as XLSX from "xlsx";
import ReportFilters from "@/components/filters_report";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

function RawdataReportsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  //const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gridData, setGridData] = useState([]);
  const [sectionMap, setSectionMap] = useState({});
  const [status, setStatus] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [questionHeaders, setQuestionHeaders] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "evaluation"
  }`;
  const [selectedForms, setSelectedForms] = useState([]);
  // const [startDate, setStartDate] = useState(null);
  // const [endDate, setEndDate] = useState(null);
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedAgents, setSelectedAgents] = useState([]);
  const enabledFilters = ["form", "organization", "agent"];
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
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
            loggedInUserId: userId,
            moduleId: 10, 
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        const data = await response.json();
        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);
      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true);
      }
    };

    fetchPrivileges();
  }, []);

  //useEffect(() => {
  //   getDecryptedUserId
  //  if (startDate && endDate) {
  //fetchFormAnswers();
  // }
  //}, []);

  function getDecryptedUserId() {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      if (!encryptedUserData) return null;

      const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      const user = JSON.parse(decryptedData);
      return user.userFullName || null;
    } catch (error) {
      console.error("Error decrypting user data:", error);
      return null;
    }
  }

  const toIST = (date) => {
    if (!date) return null;
    const utc = new Date(date).getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utc + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  const fetchFormAnswers = async (statusParam) => {
    try {
      const [startDate, endDate] = dateRange;
      setLoading(true);
      const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

      let timezone = null;

      if (encryptedTimezone) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          timezone = JSON.parse(decryptedData);
        } catch (err) {
          console.error("Failed to decrypt timezone:", err);
        }
      }
      const encryptedUserData = sessionStorage.getItem("user");
      let loggedInUserId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        loggedInUserId = user?.userId || null;
      }

      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const response = await fetch("/api/reports/RawDataReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId,
          timezone,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          filter: filterType,
          startDate: startDate ? toIST(startDate) : null,
          endDate: endDate ? toIST(endDate) : null,
          //formIds: selectedForms.map(f => f.value),
          formIds: selectedForms.value,
          organizationIds: selectedOrganizations.map(o => o.value),
          agentIds: selectedAgents.map(o => o.value),
          ActiveStatus: statusParam
        }),
      });


      const result = await response.json();

      if (response.ok && result.success) {
        const { data, sectionMap } = generateFormattedData(result.RawData);
        setGridData(data);
        setSectionMap(sectionMap);
        setQuestionHeaders(questionHeaders);

      } else {
        setGridData([]);
      }
    } catch (error) {
      console.error("Error fetching form answers:", error);
      setGridData([]);
    } finally {
      setLoading(false);
    }
  };

  const generateFormattedData = (formAnswers) => {
    const rows = {};
    const sectionMap = {};
    let questionIdCounter = 0;

    formAnswers.forEach((item) => {
      const interactionId = item.interaction_id || "N/A";
      const evaluatorId = item.EvaluatorName || "UnknownEvaluator";
      const section = item.SectionDetails || "No Category";
      const subsection = item.SubsectionDetails || "No Subcategory";

      // ✅ Composite rowKey ensures uniqueness per interaction + evaluator
      const rowKey = `${interactionId}__${evaluatorId}`;

      if (!rows[rowKey]) {
        rows[rowKey] = {
          ...item,
          _sectionData: {},
          _subsectionData: {},
          _qa: {}, // hold answers by section/subsection/question
        };
      }

      // Section-level
      if (!rows[rowKey]._sectionData[section]) {
        rows[rowKey]._sectionData[section] = {
          SectionScore: item.SectionScore || "",
          SectionComment: item.SectionComment || "",
        };
      }

      // Subsection-level
      const subKey = `${section}__${subsection}`;
      if (!rows[rowKey]._subsectionData[subKey]) {
        rows[rowKey]._subsectionData[subKey] = {
          SubsectionScore: item.subsectionScore || "",
          SubsectionComment: item.SubSectionComment || "",
        };
      }

      // Question-level (namespaced)
      let question = item.Question;
      if (!question || question === "No Question") {
        question = `No Question ${questionIdCounter++}`;
      }

      if (!rows[rowKey]._qa[section]) rows[rowKey]._qa[section] = {};
      if (!rows[rowKey]._qa[section][subsection]) rows[rowKey]._qa[section][subsection] = {};

      rows[rowKey]._qa[section][subsection][question] = {
        answer: item.Answer || "",
        score: item.Score != null ? item.Score : "",
        comment: item.Comment || "",
      };

      // Build sectionMap
      if (!sectionMap[section]) sectionMap[section] = {};
      if (!sectionMap[section][subsection]) sectionMap[section][subsection] = [];
      if (!sectionMap[section][subsection].includes(question)) {
        sectionMap[section][subsection].push(question);
      }
    });

    return {
      data: Object.values(rows), // ✅ now you’ll get one row per evaluator per interaction
      sectionMap,
    };
  };

  const columns = React.useMemo(() => {
    if (!gridData || gridData.length === 0 || !sectionMap) return [];

    // ✅ Exclude SectionDetails, SectionScore, SectionComment
    const baseKeys = Object.keys(gridData[0]).filter(
      (key) =>
        typeof gridData[0][key] !== "object" &&
        key !== "SectionDetails" &&
        key !== "SectionDetails" &&
        key !== "SectionScore" &&
        key !== "SectionComment" &&
        key !== "SubsectionDetails" &&
        key !== "subsectionScore" &&
        key !== "SubSectionComment" &&
        key !== "Question" &&
        key !== "Answer" &&
        key !== "Comment" &&
        key !== "Score"
    );

    const baseColumns = baseKeys.map((key) => ({
      Header: key,
      accessor: key,
    }));


    // 🔹 status === "0" ➜ Only section level with score/comment
    if (status === "0") {
      const sectionColumns = Object.entries(sectionMap).map(([section]) => ({
        Header: section,
        columns: [
          {
            Header: "Category Score",
            accessor: (row) => row._sectionData?.[section]?.SectionScore ?? "",
            id: `${section}_score`,
          },
          {
            Header: "Category Comment",
            accessor: (row) => row._sectionData?.[section]?.SectionComment ?? "",
            id: `${section}_comment`,
          },
        ],
      }));
      return [...baseColumns, ...sectionColumns];
    }

    // 🔹 status === "1" ➜ Section → Subsection only, show Subsection Score/Comment (NO questions)
    if (status === "1") {
      const subsectionColumns = Object.entries(sectionMap).map(([section, subsections]) => ({
        Header: section,
        columns: Object.entries(subsections).map(([subsection]) => {
          const subKey = `${section}__${subsection}`;
          return {
            Header: subsection,
            columns: [
              {
                Header: "Subcategory Score",
                accessor: (row) => row._subsectionData?.[subKey]?.SubsectionScore ?? "",
                id: `${subKey}_subscore`,
              },
              {
                Header: "Subcategory Comment",
                accessor: (row) => row._subsectionData?.[subKey]?.SubsectionComment ?? "",
                id: `${subKey}_subcomment`,
              },
            ],
          };
        }),
      }));
      return [...baseColumns, ...subsectionColumns];
    }

    const questionColumns = Object.entries(sectionMap).map(([section, subsections]) => ({
      Header: section,
      columns: Object.entries(subsections).map(([subsection, questions]) => ({
        Header: subsection,
        columns: questions.flatMap((question, qIndex) => ({
          Header: question,
          columns: [
            {
              Header: "Answer",
              accessor: (row) => row._qa?.[section]?.[subsection]?.[question]?.answer ?? "",
              id: `${section}_${subsection}_${qIndex}_answer`,
            },
            {
              Header: "Score",
              accessor: (row) => row._qa?.[section]?.[subsection]?.[question]?.score ?? "",
              id: `${section}_${subsection}_${qIndex}_score`,
            },
            {
              Header: "Comment",
              accessor: (row) => row._qa?.[section]?.[subsection]?.[question]?.comment ?? "",
              id: `${section}_${subsection}_${qIndex}_comment`,
            },
          ]
        })),
      })),
    }));

    return [...baseColumns, ...questionColumns];
  }, [gridData, sectionMap, status]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns: columns || [], data: gridData || [] });

  if (!privilegesLoaded) return <p className="text-xs text-muted-foreground">Loading...</p>;
  if (!hasPrivilege(1)) return notFound();

  const CustomDateInput = React.forwardRef(
    ({ value, onClick, placeholder }, ref) => (
      <button
        type="button"
        onClick={onClick}
        ref={ref}
        className={`border border-border px-3 py-1.5 rounded-md text-xs w-36 text-left ${!value ? "text-muted-foreground" : "text-foreground"
          }`}
      >
        {value || placeholder}
      </button>
    )
  );
  CustomDateInput.displayName = "CustomDateInput";

  const handleSearch = () => {

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
    if (!selectedForms || selectedForms.length === 0) {
      alert("Please select evaluation form.");
      return;
    }
    fetchFormAnswers();
  };

  const handleStatusChange = (event) => {
    const newStatus = event.target.value || null;
    setStatus(newStatus);
    fetchFormAnswers(newStatus); // use the new value directly
  };

  const dateTime = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true
  }).replace("AM", "am").replace("PM", "pm");

  const handleResetFilters = () => {
    setFilterType("");
    setSelectedForms([]);
    setSelectedOrganizations([]);
    setGridData([]);

  };

  const exportToExcelReport = (gridData, sectionMap, fileName, status, userName) => {
    if (!gridData || gridData.length === 0) return;
    if (status == null || status === "") {
      status = "2";
    }

    const baseKeys = Object.keys(gridData[0]).filter(
      (key) =>
        typeof gridData[0][key] !== "object" &&
        ![
          "SectionDetails",
          "SectionScore",
          "SectionComment",
          "SubsectionDetails",
          "subsectionScore",
          "SubSectionComment",
          "Question",
          "Answer",
          "Comment",
          "Score",
          "_qa"
        ].includes(key)
    );

    const worksheetData = [];
    const merges = [];

    const headerRow1 = [];
    const headerRow2 = [];
    const headerRow3 = [];
    const headerRow4 = [];

    const sectionEntries = Object.entries(sectionMap);
    let colIndex = 0;

    // ➤ Add base column headers
    baseKeys.forEach((key) => {
      headerRow1.push("");
      headerRow2.push("");
      headerRow3.push("");
      headerRow4.push(key);
    });

    colIndex = baseKeys.length;

    // ➤ Status: Section-level
    if (status === "0") {
      sectionEntries.forEach(([section]) => {
        headerRow1.push(section, "");
        headerRow2.push("", "");
        headerRow3.push("Category Score", "Category Comment");
        headerRow4.push("", "");

        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        merges.push({ s: { r: 1, c: colIndex }, e: { r: 1, c: colIndex + 1 } });

        colIndex += 2;
      });

      worksheetData.push(headerRow1, headerRow2, headerRow3, headerRow4);
    }

    // ➤ Status: Subsection-level
    if (status === "1") {
      sectionEntries.forEach(([section, subsections]) => {
        const subsectionEntries = Object.entries(subsections);
        const sectionStart = colIndex;
        let sectionSpan = 0;

        subsectionEntries.forEach(([subsection]) => {
          headerRow2.push(subsection, "");
          headerRow3.push("Subcategory Score", "Subcategory Comment");
          headerRow4.push("", "");

          merges.push({ s: { r: 1, c: colIndex }, e: { r: 1, c: colIndex + 1 } });

          colIndex += 2;
          sectionSpan += 2;
        });

        headerRow1[sectionStart] = section;
        for (let i = sectionStart + 1; i < sectionStart + sectionSpan; i++) {
          headerRow1[i] = "";
        }

        merges.push({
          s: { r: 0, c: sectionStart },
          e: { r: 0, c: sectionStart + sectionSpan - 1 },
        });
      });

      worksheetData.push(headerRow1, headerRow2, headerRow3, headerRow4);
    }

    // ➤ Status: Question-level (Detailed)
    if (status === "2") {
      sectionEntries.forEach(([section, subsections]) => {
        const sectionStartCol = colIndex;
        let sectionColSpan = 0;

        Object.entries(subsections).forEach(([subsection, questions]) => {
          const subsectionStartCol = colIndex;
          let subsectionColSpan = 0;

          questions.forEach((question) => {
            // Add question headers
            headerRow1.push("", "", "");
            headerRow2.push("", "", "");
            headerRow3.push(question, "", "");
            headerRow4.push("Answer", "Score", "Comment");

            // Merge question cells
            merges.push({ s: { r: 2, c: colIndex }, e: { r: 2, c: colIndex + 2 } });

            colIndex += 3;
            subsectionColSpan += 3;
            sectionColSpan += 3;
          });

          // Set subsection label and merge
          headerRow2[subsectionStartCol] = subsection;
          merges.push({
            s: { r: 1, c: subsectionStartCol },
            e: { r: 1, c: subsectionStartCol + subsectionColSpan - 1 }
          });
        });

        // Set section label and merge
        headerRow1[sectionStartCol] = section;
        merges.push({
          s: { r: 0, c: sectionStartCol },
          e: { r: 0, c: sectionStartCol + sectionColSpan - 1 }
        });
      });

      worksheetData.push(headerRow1, headerRow2, headerRow3, headerRow4);
    }

    // ➤ Add data rows
    gridData.forEach((row) => {
      const flatRow = [];

      baseKeys.forEach((key) => {
        flatRow.push(row[key] ?? "");
      });

      if (status === "0") {
        sectionEntries.forEach(([section]) => {
          flatRow.push(
            row._sectionData?.[section]?.SectionScore ?? "",
            row._sectionData?.[section]?.SectionComment ?? ""
          );
        });
      }

      if (status === "1") {
        sectionEntries.forEach(([section, subsections]) => {
          Object.keys(subsections).forEach((subsection) => {
            const subKey = `${section}__${subsection}`;
            flatRow.push(
              row._subsectionData?.[subKey]?.SubsectionScore ?? "",
              row._subsectionData?.[subKey]?.SubsectionComment ?? ""
            );
          });
        });
      }

      if (status === "2") {
        sectionEntries.forEach(([section, subsections]) => {
          Object.entries(subsections).forEach(([subsection, questions]) => {
            questions.forEach((question) => {
              const q = row._qa?.[section]?.[subsection]?.[question] || {};
              flatRow.push(q.answer ?? "", q.score ?? "", q.comment ?? "");
            });
          });
        });
      }

      worksheetData.push(flatRow);
    });

    // ➤ Build worksheet and add footer
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!merges"] = merges;

    // Auto column widths
    worksheet["!cols"] = worksheetData[0].map(() => ({ wch: 25 }));

    // Add footer
    const footerStartRow = worksheetData.length + 2;
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [],
        [],
        [`Generated by: ${userName}`],
        [`Generated on: ${dateTime}`],
      ],
      { origin: `A${footerStartRow}` }
    );

    // ➤ Create and export workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleExport = async (format) => {
    if (!gridData || gridData.length === 0) {
      alert("No data available to export.");
      return;
    }
    const user = getDecryptedUserId();

    const fileName = `Raw_Data_Report_${dateTime}`;

    switch (format) {
      case "excel":
        exportToExcelReport(gridData, sectionMap, fileName, status, user);
        break;

      default:
        alert("Unsupported export format.");
    }

    //setDropdownOpen(false);
  };

  return (
    <div className="reports-container">
      <div className="flex flex-col md:flex-col gap-4 mb-4">
        <div className="flex items-center justify-between gap-4">
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
              Raw Data Report
            </h1>
          </div>

          <div className="flex items-center gap-2 relative">
            <select
              value={status || ""}
              onChange={handleStatusChange}
              className="px-2 py-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-48 text-xs"
            >
              <option value="">Select Filter</option>
              <option value="0">Category wise Report</option>
              <option value="1">Subcategory wise Report</option>
              <option value="2">Question wise Report</option>
            </select>
            <button
              onClick={() => handleExport("excel")}
              className="bg-blue-700 text-white px-3 py-2 text-xs rounded-md hover:bg-blue-600 focus:outline-none flex items-center gap-1"
            >
              <DownloadIcon className="w-4 h-4" /> Export
            </button>

          </div>
        </div>
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
          handleViewReport={handleSearch}
          handleResetFilters={handleResetFilters}
          isRawDataReport={true}
        />
      </div>


      <div className="overflow-auto border border-border rounded-lg">
        <table {...getTableProps()} className="min-w-full text-xs text-foreground border-collapse">
          <thead className="bg-secondary text-foreground">
            {headerGroups.map((headerGroup, idx) => (
              <tr key={idx} {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column, colIdx) => (
                  <th
                    key={colIdx}
                    {...column.getHeaderProps()}
                    className="px-4 py-3 border border-border text-left font-semibold"
                  >
                    {column.render("Header")}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-xs text-blue-500">
                  Loading data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-4 text-xs text-muted-foreground">
                  No data available.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                prepareRow(row);
                return (
                  <tr key={i} {...row.getRowProps()} className={i % 2 === 0 ? "bg-card" : "bg-muted"}>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} {...cell.getCellProps()} className="px-4 py-2 border border-border">
                        {cell.render("Cell")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withAuth(RawdataReportsPage);




