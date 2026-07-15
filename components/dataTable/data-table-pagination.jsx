"use client";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "../ui/skeleton";

export function DataTablePagination({
  totalRecords,
  currentPageNum,
  itemsPerPage,
  loading,
  onPageChange, // Function to handle page change via POST request
  className = "",
}) {
  const totalPages =
    totalRecords > 0 ? Math.ceil(totalRecords / itemsPerPage) : 1;

  return (
    <div className={`flex items-center justify-between px-2 py-1 ${className}`}>
      <div className="flex-1 text-sm text-muted-foreground">
        {loading && (
         <Skeleton className={"h-8 w-[150px] lg:w-[250px]"}>
          <span className="opacity-0">0</span>
         </Skeleton>
      )}
      {/* {!loading && <p>{totalRecords}</p>} */}
    </div>
  
    <div className="flex items-center space-x-2 lg:space-x-4">
      <div className="flex items-center space-x-1">
        {loading && (
          <Skeleton className={"h-8 w-[70px] lg:w-[150px]"}>
            <span className="opacity-0">0</span>
          </Skeleton>
        )}
        {!loading && (
          <>
            <p className="text-sm font-sm" style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
              Rows per page
            </p>
            <Select
              value={`${itemsPerPage}`}
              onValueChange={(value) => onPageChange(1, Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
         </>
        )}
      </div>
    
      <div className="flex w-[80px] items-center justify-center text-sm" style={{ fontSize: "12px" }}>
        {loading && (
          <Skeleton className={"h-8 w-[70px] lg:w-[150px]"} >
            <span className="opacity-0">0</span>
          </Skeleton>
        )}
        {!loading && (
          <p className="text-sm font-sm" style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
          Page {currentPageNum} of {totalPages}
          </p>
      )}
      </div>
    
      <div className="flex items-center space-x-1 lg:space-x-2 sm:justify-between">
        {loading && (
          <Skeleton className={"h-8 w-[150px] lg:w-[250px]"}>
            <span className="opacity-0">0</span>
          </Skeleton>
        )}
        {!loading && (
          <>
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={currentPageNum === 1}
            >
              <span className="sr-only">Go to first page</span>
              <DoubleArrowLeftIcon className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange(currentPageNum - 1)}
              disabled={currentPageNum === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange(currentPageNum + 1)}
              disabled={currentPageNum === totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-7 w-7 p-0 lg:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPageNum === totalPages}
            >
              <span className="sr-only">Go to last page</span>
             <DoubleArrowRightIcon className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  </div>
  );
}




