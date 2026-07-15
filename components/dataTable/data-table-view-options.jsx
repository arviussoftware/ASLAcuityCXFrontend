"use client";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

export function DataTableViewOptions({ table }) {
  const allColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide()
    );

  const visibleColumnsCount = allColumns.filter((column) =>
    column.getIsVisible()
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 gap-1 lg:flex shadow-sm text-xs"
        >
          <Filter className="mr-1.5 h-3 w-3" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[150px] max-h-[420px] overflow-y-auto"
      >
        <DropdownMenuLabel className="text-xs">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map((column) => {
          const isChecked = column.getIsVisible();
          const canHideColumn = visibleColumnsCount > 4 || !isChecked;
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize text-xs"
              checked={isChecked}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              disabled={!canHideColumn && isChecked}
            >
              {column.columnDef.headerTitle || column.id}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
