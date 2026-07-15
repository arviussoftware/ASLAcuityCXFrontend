"use client";
import React from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { useTable } from "react-table";

function ReportsGrid({ gridData, selectedFormName, setGridData }) {
  const columns = React.useMemo(() => {
    if (!gridData || gridData.length === 0) return [];

    const baseHeaders = [
      {
        Header: "Interaction Details",
        columns: [
          { Header: "InteractionId", accessor: "InteractionId" },
          { Header: "FormName", accessor: "FormName" },
        ],
      },
    ];

    const questionHeaders = {
      Header: "Q/A",
      columns: Object.keys(gridData[0])
        .filter((key) => key !== "InteractionId" && key !== "FormName")
        .map((key) => ({
          Header: key,
          accessor: (row) => row[key], // Handle keys with spaces/special characters
        })),
    };

    return [...baseHeaders, questionHeaders];
  }, [gridData]);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data: gridData || [], // Default to empty array if gridData is null/undefined
    });

  const downloadGridDataAsExcel = () => {
    if (!gridData || gridData.length === 0) {
      console.error("No data available to download.");
      alert("No data available to download.");
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(gridData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        `Form_${selectedFormName}`
      );
      XLSX.writeFile(workbook, `Form_${selectedFormName}_Answers.xlsx`);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      alert("An error occurred while downloading the Excel file.");
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold"></h3>
        <div className="flex gap-2">
          {/* Download Button */}
          <button
            onClick={downloadGridDataAsExcel}
            className={`bg-blue-500 text-white px-4 py-2 rounded flex items-center ${
              !gridData || gridData.length === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={!gridData || gridData.length === 0}
          >
            <Download />
          </button>
        </div>
      </div>

      {/* Render the grid */}
      {gridData && gridData.length > 0 ? (
        <div className="overflow-x-auto">
          <table
            {...getTableProps()}
            className="min-w-full border-collapse border border-border text-sm"
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
      ) : (
        <p className="text-center text-muted-foreground">
          No data available to display.
        </p>
      )}
    </div>
  );
}

export default ReportsGrid;

