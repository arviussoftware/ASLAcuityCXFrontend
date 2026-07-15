"use client";
import React from "react";
import { TiEdit } from "react-icons/ti";
import { usePathname, useRouter } from "next/navigation";

export function DataTableRowActions({
  row,
  tableType,
  privileges = {},
  editBasePath,
  onEdit, // ✅ ADD
}) {
  const { replace } = useRouter();
  const pathname = usePathname();

  // Redirect to edit based on `tableType`
  // const redirectToEdit = () => {
  //   if (!privileges.canEdit) return;

  //   const idMapping = {
  //     user: row.original.userUniqueId,
  //     agentOrganization: row.original.agentId,
  //   };

  //   const basePath = editBasePath || pathname;
  //   replace(`${basePath}/${idMapping[tableType]}`);
  // };
  const redirectToEdit = () => {
    if (!privileges.canEdit) return;

    // ✅ If onEdit callback provided, use modal instead of navigating
    if (typeof onEdit === "function") {
      onEdit(row.original);
      return;
    }

    const idMapping = {
      user: row.original.userUniqueId,
      agentOrganization: row.original.agentId,
    };
    const basePath = editBasePath || pathname;
    replace(`${basePath}/${idMapping[tableType]}`);
  };

  return (
    <>
      {(privileges.canEdit || privileges.canDelete || privileges.canAssign) && (
        <div className="flex gap-1 justify-start items-center ml-[0px]">
          {privileges.canEdit && (
            <div className="relative group inline-block">
              <button
                onClick={redirectToEdit}
                className="flex h-8 w-8 p-0 m-0 items-center justify-center hover:bg-muted rounded"
              >
                <TiEdit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                Edit
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 -mt-1 z-[-1]" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
