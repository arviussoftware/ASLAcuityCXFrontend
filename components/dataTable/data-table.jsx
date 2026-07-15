// components/dataTable/data-table.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableColumnHeader } from "./data-table-column-header";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";

const columnHeaderDisplayNames = {
  callId: "Call Id",
  audioStartTime: "Audio StartTime",
  audioEndTime: "Audio EndTime",
  agentId: "Agent Id",
  ani: "ANI",
  dnis: "DNIS",
  ucid: "UCID",
  personalName: "Agent Name",
  userFullName: "User Name",
  loginId: "User Login Id",
  localStartTime: " Local StartTime",
  userRole: "User Role",
  activeStatus: "Status",
  isAdmin: "Admin",
  organizationName: "Organization",
  contactPerson: "Contact Person",
  contactMobile: "Mobile",
  addressOfContact: "Address",
  isActive: "Status",
  evaluation_date: "Evaluation Time",
  duration: "Interaction Duration",
  form_name: "Form",
  user_full_name: "Evaluator",
  EvaluationCount: "Number Of Evaluation",
  userName: "Username",
  roleName: "Role",
  firstName: "First Name", // ✅
  middleName: "Middle Name", // ✅
  lastName: "Last Name", // ✅
};

export const DataTable = ({
  columns,
  data,
  currentPageNum,
  itemsPerPage,
  showCreateBtn = false,
  loading = false,
  createBasePath,
  onRowClick = () => {},
  rowActions,
  allowedExportTypes,
  exportType,
  exportStatus,
  exportSearch,
  exportRoleFilter,
  exportOrganizationFilter,
  exportPlatformFilter,
  daterange,
  selectableRows = false,
  selectedRowIds = [],
  onSelectedRowIdsChange = () => {},
  rowClickSelection = true,
  filters,
  OrganizationFilter,
  pageType,
  formFilter,
  evaluatorFilter,
  agentNameFilter,
  instanceNameFilter,
  privilegeId,
  hideToolab,
  addTableTitle,
  tableStyle,
  tableMeta, // ✅ add this line
  meta, // ← ADD THIS
  rowIdKey = "userId", // can be a field name or a function
  selectColumnLabel = "SelectOrg", // ⭐ ADD THIS LINE
  // initialColumnVisibility = {},
  columnVisibility: columnVisibilityProp = {},
  onColumnVisibilityChange,
  columnOrder: columnOrderProp = [],
  onColumnOrderChange,
  useModal, // ✅ ADD
  onModalOpen, // ✅ ADD
  fillHeight = false,
}) => {
  const SELECT_COLUMN_ID = "select_org";
  const router = useRouter();
  const shouldFillHeight = fillHeight && (loading || data.length > 3);

  const [rowSelection, setRowSelection] = useState(
    Object.fromEntries(selectedRowIds.map((id) => [id, true])),
  );
  const [columnVisibility, setColumnVisibility] =
    useState(columnVisibilityProp);

  // ✅ REPLACE WITH - only syncs when prop actually has content
  const prevPropRef = useRef(columnVisibilityProp);
  useEffect(() => {
    if (
      JSON.stringify(prevPropRef.current) !==
      JSON.stringify(columnVisibilityProp)
    ) {
      prevPropRef.current = columnVisibilityProp;
      setColumnVisibility(columnVisibilityProp);
    }
  }, [columnVisibilityProp]);

  const [sorting, setSorting] = useState([]);
  const [columnOrder, setColumnOrder] = React.useState(columnOrderProp);
  const prevSelectedRowIdsRef = useRef(selectedRowIds);

  useEffect(() => {
    const prevIds = prevSelectedRowIdsRef.current || [];
    const nextIds = selectedRowIds || [];
    const hasChanged =
      prevIds.length !== nextIds.length ||
      prevIds.some((id, index) => id !== nextIds[index]);

    if (hasChanged) {
      prevSelectedRowIdsRef.current = nextIds;
      setRowSelection(Object.fromEntries(nextIds.map((id) => [id, true])));
    }
  }, [selectedRowIds]);

  const prevColumnOrderPropRef = useRef(columnOrderProp);
  useEffect(() => {
    if (
      JSON.stringify(prevColumnOrderPropRef.current) !==
      JSON.stringify(columnOrderProp)
    ) {
      prevColumnOrderPropRef.current = columnOrderProp;
      setColumnOrder(columnOrderProp);
    }
  }, [columnOrderProp]);

  useEffect(() => {
    if (!selectableRows) {
      setRowSelection({});
    }
  }, [selectableRows]);

  const checkboxColumn = React.useMemo(
    () => ({
      id: "select_org",
      header: ({ table }) => {
        const allRows = table.getRowModel().rows || [];

        const allSelected =
          allRows.length > 0 && allRows.every((r) => r.getIsSelected());

        const someSelected =
          allRows.length > 0 &&
          !allSelected &&
          allRows.some((r) => r.getIsSelected());

        return (
          <div className="flex flex-row items-center gap-1.5 text-[10px] font-semibold">
            <span>{selectColumnLabel}</span>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) => {
                const checked = e.target.checked;
                table.options.meta?.onToggleAllSelectOrg?.(checked);
                table.getToggleAllPageRowsSelectedHandler()(e);
              }}
              className="cursor-pointer"
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
        </div>
      ),
    }),
    [selectColumnLabel],
  );

  const visibleColumns = React.useMemo(() => {
    // ✅ Filter out "delete" column if user doesn't have privilege
    const filteredColumns = columns.filter((col) => {
      if (col.id === "delete") {
        const hasDeletePrivilege = tableMeta?.grantedPrivileges?.some(
          (p) => p.PrivilegeId === 5,
        );
        return hasDeletePrivilege; // show only if delete privilege exists
      }
      return col.show !== false;
    });

    // ✅ If de-association (select_org) is active, keep that checkbox column
    return [...(selectableRows ? [checkboxColumn] : []), ...filteredColumns];
  }, [checkboxColumn, columns, selectableRows, tableMeta]);

  useEffect(() => {
    const availableColumnIds = visibleColumns.map(
      (col) => col.id || col.accessorKey,
    );

    if (!availableColumnIds.length) {
      return;
    }

    const preferredOrder =
      Array.isArray(columnOrderProp) && columnOrderProp.length
        ? columnOrderProp
        : columnOrder;

    const normalizedOrderBase = [
      ...preferredOrder.filter((id) => availableColumnIds.includes(id)),
      ...availableColumnIds.filter((id) => !preferredOrder.includes(id)),
    ];

    const normalizedOrder = normalizedOrderBase.includes(SELECT_COLUMN_ID)
      ? [
          SELECT_COLUMN_ID,
          ...normalizedOrderBase.filter((id) => id !== SELECT_COLUMN_ID),
        ]
      : normalizedOrderBase;

    const hasChanged =
      normalizedOrder.length !== columnOrder.length ||
      normalizedOrder.some((id, index) => columnOrder[index] !== id);

    if (hasChanged) {
      setColumnOrder(normalizedOrder);
      setTimeout(() => {
        onColumnOrderChange?.(normalizedOrder);
      }, 0);
    }
  }, [visibleColumns, columnOrderProp, onColumnOrderChange, columnOrder]);

  const updateColumnOrder = React.useCallback(
    (updater) => {
      setColumnOrder((prev) => {
        const rawNext = typeof updater === "function" ? updater(prev) : updater;
        const next = Array.isArray(rawNext)
          ? rawNext.includes(SELECT_COLUMN_ID)
            ? [
                SELECT_COLUMN_ID,
                ...rawNext.filter((id) => id !== SELECT_COLUMN_ID),
              ]
            : rawNext
          : rawNext;
        setTimeout(() => {
          onColumnOrderChange?.(next);
        }, 0);
        return next;
      });
    },
    [onColumnOrderChange],
  );

  const table = useReactTable({
    data: data,
    columns: visibleColumns,
    getRowId: (row, index) => {
      if (typeof rowIdKey === "function") {
        return String(rowIdKey(row, index));
      }
      return String(row[rowIdKey]);
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnOrder, // ✅ ADD THIS
      pagination: {
        pageIndex: currentPageNum - 1,
        pageSize: itemsPerPage,
      },
    },
    onColumnOrderChange: updateColumnOrder, // ✅ ADD THIS
    manualPagination: true,
    pageCount: Math.ceil(data.length / itemsPerPage),
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      const selectedIds = Object.keys(newSelection).filter(
        (id) => newSelection[id],
      );
      onSelectedRowIdsChange(selectedIds);
    },
    onSortingChange: (sorting) => {
      setSorting(sorting);
    },
    onColumnVisibilityChange: (updater) => {
      const newVal =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      setColumnVisibility(newVal);
      onColumnVisibilityChange?.(newVal); // ✅ notify page.jsx
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      ...meta,
      selectedForDelete: tableMeta?.selectedForDelete || [],
      onToggleDelete: tableMeta?.onToggleDelete,
      onToggleAllDelete: tableMeta?.onToggleAllDelete,
      onBulkDelete: tableMeta?.onBulkDelete,
      hasDeletePrivilege: tableMeta?.grantedPrivileges?.some(
        (p) => Number(p.PrivilegeId) === 5,
      ),
      onToggleAllSelectOrg: tableMeta?.onToggleAllSelectOrg, // ✅ added
      onPlayAudio: meta?.onPlayAudio, // ← ADD THIS
    },
  });

  const handleRowClick = (row) => {
    if (typeof onRowClick === "string") {
      const path = `${onRowClick}${row.id}`;
      router.push(path);
    } else if (typeof onRowClick === "function") {
      onRowClick(row);
    }
  };

  const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <div
      className={
        shouldFillHeight ? "flex h-full min-h-0 flex-col gap-2" : "space-y-2"
      }
    >
      <span style={hideToolab}>
        <DataTableToolbar
          table={table}
          showCreateBtn={showCreateBtn}
          loading={loading}
          createBasePath={createBasePath}
          useModal={useModal} // ✅ ADD
          onModalOpen={onModalOpen} // ✅ ADD
          exportType={exportType}
          allowedExportTypes={allowedExportTypes}
          exportStatus={exportStatus}
          exportSearch={exportSearch}
          exportRoleFilter={exportRoleFilter}
          exportOrganizationFilter={exportOrganizationFilter}
          exportPlatformFilter={exportPlatformFilter}
          daterange={daterange}
          filters={filters}
          OrganizationFilter={OrganizationFilter}
          pageType={pageType}
          formFilter={formFilter}
          evaluatorFilter={evaluatorFilter}
          agentNameFilter={agentNameFilter} // 👈 FIX: pass it here
          instanceNameFilter={instanceNameFilter}
          privilegeId={privilegeId}
        />
      </span>

      <Card
        className={
          shouldFillHeight
            ? "flex min-h-0 flex-1 flex-col shadow-md overflow-hidden"
            : "shadow-md"
        }
      >
        {addTableTitle && <div>{addTableTitle}</div>}

        <CardContent
          className={
            shouldFillHeight ? "flex min-h-0 flex-1 flex-col p-0" : "p-0"
          }
        >
          <div
            className={shouldFillHeight ? "overflow-auto" : "overflow-x-auto"}
            style={
              shouldFillHeight
                ? { ...tableStyle, maxHeight: "calc(100vh - 320px)" }
                : tableStyle
            }
          >
            <Table containerClassName="overflow-visible">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-muted/90 hover:bg-muted/90"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/90 first:pl-3"
                        onDragOver={(e) => {
                          e.preventDefault(); // 🔴 REQUIRED
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();

                          const draggedId = e.dataTransfer.getData("columnId");
                          const targetId = header.column.id;

                          updateColumnOrder((old) => {
                            const from = old.indexOf(draggedId);
                            const to = old.indexOf(targetId);

                            if (from === -1 || to === -1 || from === to)
                              return old;

                            const next = [...old];
                            next.splice(from, 1);
                            next.splice(to, 0, draggedId);
                            return next;
                          });
                        }}
                      >
                        {loading && !data.length ? (
                          <Skeleton>
                            <span className="opacity-0 text-xs">0</span>
                          </Skeleton>
                        ) : header.column.id === "delete" ||
                          header.column.id === "select_org" ? (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        ) : (
                          <DataTableColumnHeader
                            column={header.column}
                            title={
                              header.column.columnDef.headerTitle ||
                              columnHeaderDisplayNames[header.id] ||
                              capitalizeFirstLetter(header.id)
                            }
                            table={table}
                            onDragStart={(e, draggedId) => {
                              e.dataTransfer.setData("columnId", draggedId);
                            }}
                            onDrop={(e, targetId) => {
                              const draggedId =
                                e.dataTransfer.getData("columnId");

                              updateColumnOrder((old) => {
                                const from = old.indexOf(draggedId);
                                const to = old.indexOf(targetId);
                                if (from === -1 || to === -1 || from === to)
                                  return old;

                                const next = [...old];
                                next.splice(from, 1);
                                next.splice(to, 0, draggedId);
                                return next;
                              });
                            }}
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading && !data.length ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.id || col.accessorKey}
                          className="p-2"
                        >
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : ""}
                      className="cursor-pointer"
                      onClick={() => {
                        if (rowClickSelection) {
                          handleRowClick(row.original);
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="p-0 first:pl-3">
                          {loading && !data.length ? (
                            <Skeleton>
                              <span className="opacity-0">0</span>
                            </Skeleton>
                          ) : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )
                          )}
                        </TableCell>
                      ))}
                      {typeof rowActions === "function" && (
                        <TableCell>{rowActions(row)}</TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
