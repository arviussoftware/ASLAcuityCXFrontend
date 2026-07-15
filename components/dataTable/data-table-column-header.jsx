"use client";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function DataTableColumnHeader({
  column,
  title,
  className,
  onDragStart,
}) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span className="text-xs">{title}</span>
      </div>
    );
  }

  const sortState = column.getIsSorted(); // false | "asc" | "desc"

  const handleSortToggle = () => {
    if (sortState === false) {
      column.toggleSorting(false); // → asc
    } else if (sortState === "asc") {
      column.toggleSorting(true); // → desc
    } else {
      column.clearSorting(); // → normal
    }
  };

  const tooltipText =
    sortState === false
      ? `Sort by ${title} ascending`
      : sortState === "asc"
      ? `Sort by ${title} descending`
      : `Clear sort`;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* 🟦 DRAGGABLE TITLE */}
      <span
        draggable
        className="cursor-grab select-none text-xs font-medium"
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart?.(e, column.id);
        }}
      >
        {title}
      </span>

      {/* 🟩 SORT ICON (TRI-STATE) */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSortToggle}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-6 px-1 
                         focus:outline-none 
                         focus:ring-0 
                         focus-visible:outline-none 
                         focus-visible:ring-0"
            >
              {sortState === "desc" ? (
                <ArrowDownIcon className="h-3 w-3 text-primary" />
              ) : sortState === "asc" ? (
                <ArrowUpIcon className="h-3 w-3 text-primary" />
              ) : (
                <CaretSortIcon className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>

          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
