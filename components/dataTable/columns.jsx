"use client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { labels, priorities, statuses } from "./filters";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import React from "react";

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex flex-col items-center text-[10px] font-semibold">
        <span>SelectOrg</span>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] mt-1"
        />
      </div>
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Task" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const label = labels.find((label) => label.value === row.original.label);

      return (
        <div className="flex space-x-2">
          {label && <Badge variant="outline">{label.label}</Badge>}
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("title")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status"),
      );
      if (!status) {
        return null;
      }
      return (
        <div className="flex w-[100px] items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue("priority"),
      );

      if (!priority) {
        return null;
      }

      return (
        <div className="flex items-center">
          {priority.icon && (
            <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{priority.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "action",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];

export const dashboardColumns = [
  {
    accessorKey: "userName",
    headerTitle: "User Name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="USER NAME" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("userName")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "status",
    headerTitle: "Status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="STATUS" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("status")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "role",
    headerTitle: "Role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ROLE" />
    ),
    cell: ({ row }) => (
      <div className="truncate w-[100px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("role")}
      </div>
    ),
    filterFn: "includesString",
  },
  {
    accessorKey: "organization",
    headerTitle: "Organization",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ORGANIZATION" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("organization")}
      </div>
    ),
    filterFn: "includesString",
  },
];

export const formColumns = [
  {
    accessorKey: "form",
    headerTitle: "Form",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="FORM" />
    ),
    cell: ({ row }) => (
      <div className="truncatew-[120px]  p-1" style={{ fontSize: "10px" }}>
        {row.getValue("form")}
      </div>
    ),
    filterFn: "includesString",
  },
];

export const agentOrganizationColumns = [
  {
    accessorKey: "agentId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Agent ID" />
    ),
    cell: ({ row }) => (
      <div style={{ fontSize: "10px" }}>{row.getValue("agentId")}</div>
    ),
  },
  {
    accessorKey: "organizationName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization Name" />
    ),
    cell: ({ row }) => {
      const organizationNames = row.getValue("organizationName");
      const namesArray = organizationNames
        ? Array.isArray(organizationNames)
          ? organizationNames
          : organizationNames.split(",").map((name) => name.trim())
        : [];

      return (
        <div className="p-1 whitespace-nowrap" style={{ fontSize: "10px" }}>
          {namesArray.length > 0 ? (
            namesArray.map((name, index) => (
              <span key={index}>
                {name}
                {index < namesArray.length - 1 && ","}{" "}
                {(index + 1) % 2 === 0 && <br />}
              </span>
            ))
          ) : (
            <span>N/A</span>
          )}
        </div>
      );
    },
  },
];
