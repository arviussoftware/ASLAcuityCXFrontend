"use client";

import * as React from "react";
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { getIconsByKey } from "./filters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DataTableFacetedFilter({ title, optionList, accessorKey }) {
  // const facets = column?.getFacetedUniqueValues();

  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  const updateFilters = (value) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", 1);

    if (params.has(accessorKey)) {
      const existingValue = params.get(accessorKey);
      params.set(accessorKey, [existingValue, value].join(","));
    } else {
      params.set(accessorKey, value);
    }

    replace(`${pathname}?${params}`);
  };

  const removeFilter = (valueToRemove) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", 1);

    if (params.has(accessorKey)) {
      const existingValues = params.get(accessorKey).split(",");
      const updatedValues = existingValues.filter(
        (value) => value !== valueToRemove.toString()
      );

      if (updatedValues.length === 0) {
        // If there are no remaining values, remove the key
        params.delete(accessorKey);
      } else {
        // Otherwise, update the key with the remaining values
        params.set(accessorKey, updatedValues.join(","));
      }
    }

    replace(`${pathname}?${params}`);
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.set("page", 1);

    params.delete(accessorKey);
    replace(`${pathname}?${params}`);
  };

  const options = optionList.map((option) => ({
    label: option.label,
    value: option.value,
    icon: getIconsByKey(accessorKey, option.value),
    isSelected: option.isSelected,
  }));

  // eslint-disable-next-line no-undef
  const selectedValues = new Set(
    options.filter((option) => option.isSelected) || []
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed shadow-md"
        >
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.isSelected;
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        // selectedValues.delete(option.value);
                        removeFilter(option.value);
                      } else {
                        // selectedValues.add(option.value);
                        updateFilters(option.value);
                      }
                      // const filterValues = Array.from(selectedValues);
                      // column?.setFilterValue(
                      //   filterValues.length ? filterValues : undefined
                      // );
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className={cn("h-4 w-4")} />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                    {/* {facets?.get(option.value) && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )} */}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      // column?.setFilterValue(undefined);
                      clearFilter();
                    }}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// export default DataTableFacetedFilter;
