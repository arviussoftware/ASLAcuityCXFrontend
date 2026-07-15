import React, { useMemo, useState } from "react";

const DataTable = ({
  selectedCard,
  detailData,
  onDownloadClick,
  showFilterDropdown = true,
  onFilterChange = () => { },
  currentFilter: parentFilter = "All",
  allowCustomFilter = true
}) => {
  const [currentFilter, setCurrentFilter] = useState(parentFilter);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!selectedCard || !detailData) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No selection or data available.
      </div>
    );
  }
  
  const list = detailData[selectedCard.key] || [];
   
  if (!Array.isArray(list)) return null;

  const columns = list.length > 0 ? Object.keys(list[0]) : [];
  const formatColumnName = (col) => {
    return col
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined)
      return <span className="text-muted-foreground italic">N/A</span>;

    const colLower = column.toLowerCase();

    if (colLower === "status" && typeof value === "number") {
      const statusMap = {
        0: { text: "Draft", color: "bg-muted text-foreground" },
        1: { text: "Preview", color: "bg-blue-100 text-blue-800" },
        2: { text: "Hidden", color: "bg-yellow-100 text-yellow-800" },
        3: { text: "Staged", color: "bg-purple-100 text-purple-800" },
        5: { text: "Published", color: "bg-green-100 text-green-800" },
      };
      const { text, color } = statusMap[value] || {
        text: "Unknown",
        color: "bg-red-100 text-red-800",
      };
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
        >
          {text}
        </span>
      );
    }
    // Check if it's a valid date string
    const isDateLike =
      typeof value === "string" &&
      value.length >= 6 && // Minimum check to avoid short numbers
      !["callid", "agentname", "evaluator", "score", "timetaken", "time taken (s)", "form_name","username"].includes(
        colLower.replace(/\s/g, "")
      ) &&
      !isNaN(Date.parse(value));

    if (isDateLike) {
      const date = new Date(value);
      const formatted = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
      return <span>{formatted}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <span
              key={i}
              className="bg-muted text-foreground px-2 py-0.5 rounded-md text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    if (typeof value === "string") {
      const lower = value.toLowerCase();
      const colLower = column.toLowerCase();
      if (colLower.includes("user") || colLower.includes("agent")) {
        return (
          <div className="flex items-center">
            <span className="text-sm">{value}</span>
          </div>
        );
      }
      if (
        colLower.includes("status") ||
        colLower.includes("evaluationstatus")
      ) {
        const isPassed = lower === "passed";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPassed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
              }`}
          >
            {isPassed ? (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Passed
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Failed
              </>
            )}
          </span>
        );
      }
    }
    if (typeof value === "boolean") {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
        >
          {value ? (
            <>
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Active
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Inactive
            </>
          )}
        </span>
      );
    }

    return <span className="text-foreground">{value.toString()}</span>;
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
      {/* Table Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-50 to-white border-b border-border px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <selectedCard.icon className="h-6 w-6 text-primary mr-3" />
          <div>
            <h4 className="text-lg font-semibold text-foreground">
              {selectedCard.title} Details
            </h4>
            <p className="text-xs text-muted-foreground">
              Detailed view of all records
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">

          {showFilterDropdown && (
            <>
              <select
                value={currentFilter}
                onChange={(e) => {
                  const filterType = e.target.value;
                  setCurrentFilter(filterType); // local state update

                  if (filterType !== "Custom") {
                    setStartDate("");
                    setEndDate("");
                    if (typeof onFilterChange === "function") {
                      onFilterChange(filterType, null, null);
                    }
                  }
                }}
                className="text-xs border border-border bg-card rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="All">All</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                {/* <option value="Custom">Custom</option> */}
                {allowCustomFilter && ( // ✅ show only if allowed
                  <option value="Custom">Custom</option>
                )}
              </select>

              {currentFilter === "Custom" && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      onFilterChange("Custom", val, endDate);
                    }}
                    className="border rounded px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
                  />
                  <label className="text-sm text-muted-foreground">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndDate(val);
                      onFilterChange("Custom", startDate, val);
                    }}
                    className="border rounded px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}
            </>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            {list.length} records
          </span>
          <button
            onClick={() => onDownloadClick("csv")}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors duration-200 focus:ring-2 focus:ring-ring outline-none"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            CSV
          </button>
          <button
            onClick={() => onDownloadClick("excel")}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-full transition-colors duration-200 focus:ring-2 focus:ring-green-300 outline-none"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Table Container with Scrollbar */}
      <div className="relative max-h-[400px] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y min-h-[200px] divide-gray-200">
          <thead className="bg-muted sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map((column, colIdx) => (
                <th
                  key={colIdx}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider group"
                >
                  <div className="flex items-center justify-between">
                    <span>{formatColumnName(column)}</span>
                    <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-muted-foreground transition-opacity">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-100">
              {list.length === 0 ? (
        <tr>
          <td colSpan={columns.length} className="px-6 py-4 text-center text-muted-foreground">
            No data available
          </td>
        </tr>
      ):(list.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`transition-colors duration-150 ${rowIdx % 2 === 0 ? "bg-card" : "bg-muted"
                  } hover:bg-blue-50 hover:shadow-sm`}
              >
                {columns.map((column, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 text-sm text-foreground">
                    <div className="flex items-center">
                      {colIdx === 0 && (
                        <span className="text-muted-foreground mr-3 font-mono text-xs w-4 text-right">
                          {rowIdx + 1}.
                        </span>
                      )}
                      <div className="min-w-0">
                        {formatCellValue(row[column], column)}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        /* Custom Scrollbar Styling */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) hsl(var(--muted));
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground));
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
};

export default DataTable;

