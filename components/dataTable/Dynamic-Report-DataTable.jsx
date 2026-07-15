import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

const DynamicReportDataTable = ({
  data,
  totalCount,
  pageNo,
  rowCountPerPage,
  onPageChange,
  onRowCountChange,
  scrollHeight = "calc(100vh - 360px)",
}) => {
  const pageCount = Math.ceil(totalCount / rowCountPerPage);
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    // Format options
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleString("en-GB", options);
    // Example output: "02/09/2025, 03:19 PM"
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {data.length > 0 && (
        <div
          className="min-h-0 flex-1 overflow-auto"
          style={{ maxHeight: scrollHeight }}
        >
          <div className="w-full min-w-max">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-muted sticky top-0 z-10">
                <tr className="border-b border-border">
                  {Object.keys(data[0]).map((colName) => (
                    <th
                      key={colName}
                      className="px-4 py-2 text-left text-foreground text-sm font-medium bg-muted"
                    >
                      {colName.replace(/([a-z])([A-Z])/g, "$1 $2")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-border hover:bg-muted transition-colors duration-200"
                  >
                    {Object.entries(row).map(([colName, value], colIndex) => (
                      <td key={colIndex} className="px-4 py-2 text-foreground">
                        <div
                          className={`group relative ${
                            colName === "Description"
                              ? "max-w-none"
                              : "max-w-[180px]"
                          }`}
                        >
                          <div
                            className={`text-xs ${
                              colName === "Description"
                                ? "whitespace-normal break-words"
                                : "truncate"
                            }`}
                          >
                            {colName === "EvaluationDate"
                              ? formatDateTime(value)
                              : value}
                          </div>

                          {colName !== "Description" && (
                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg max-w-[400px] whitespace-normal break-words z-[9999] pointer-events-none">
                              {colName === "EvaluationDate"
                                ? formatDateTime(value)
                                : value}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="mt-4 shrink-0 text-xs">
        {totalCount > 0 && (
          <div className="flex justify-between items-center flex-wrap gap-y-2 w-full">
            <div>
              Page {pageNo} of {pageCount} | Total Records: {totalCount}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <label className="mr-1">Rows per page:</label>
              <select
                value={rowCountPerPage}
                onChange={(e) => onRowCountChange(Number(e.target.value))}
                className="text-[11px] border border-border rounded px-1.5 py-0.5"
              >
                {[2, 5, 10, 15, 20, 50, 100].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onPageChange(1)}
                disabled={pageNo === 1}
                className="p-1 disabled:opacity-50"
                aria-label="First page"
              >
                <DoubleArrowLeftIcon />
              </button>

              <button
                onClick={() => onPageChange(pageNo - 1)}
                disabled={pageNo === 1}
                className="p-1 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </button>

              <button
                onClick={() => onPageChange(pageNo + 1)}
                disabled={pageNo >= pageCount}
                className="p-1 disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </button>

              <button
                onClick={() => onPageChange(pageCount)}
                disabled={pageNo >= pageCount}
                className="p-1 disabled:opacity-50"
                aria-label="Last page"
              >
                <DoubleArrowRightIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicReportDataTable;
