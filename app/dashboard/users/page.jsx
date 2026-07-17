// app/dashboard/users/page.jsx
"use client";
import React, {
  useEffect,
  useState,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import CryptoJS from "crypto-js";
import { DataTable } from "@/components/dataTable/data-table";
import { HiMiniInformationCircle } from "react-icons/hi2";
import { DataTablePagination } from "@/components/dataTable/data-table-pagination";
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FaSearch } from "react-icons/fa";
import { notFound } from "next/navigation";
import withAuth from "@/components/withAuth";
// import PlatformDDL from "@/components/platformDDL";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import TreeDropdown from "@/components/organizationTreeDDL";
import OrgTreeDropDownReport from "@/components/organizationDDLreport";
import {
  normalizeSavedColumnOrder,
  TABLE_PREFERENCE_PAGE_KEYS,
} from "@/lib/table-preferences";
import {
  loadUserTablePreference,
  saveUserTablePreference,
} from "@/lib/user-table-preferences-client";
import {
  getSelectedOrgIdsHeader,
  getSelectedOrgSyncKey,
} from "@/lib/client-org";

const USER_DEFAULT_VISIBLE_COLUMNS = new Set([
  // "userName",
  "loginId",
  "email",
  "roleName",
  // "organization",
  "orgNames",
  // "platformName",
  "activeStatus",
]);

const USER_COLUMN_ORDER = [
  // "userName",
  "loginId",
  "email",
  "firstName",
  "middleName",
  "lastName",
  "roleName",
  // "organization",
  "orgNames",
  // "platformName",
  "phone",
  "userAddress",
  "activeStatus",
  "action",
  "delete",
];

const USER_EXCLUDED_COLUMNS = new Set([
  "userId",
  "userUniqueId",
  "userFullName",
  // "loginId",
  "password",
  "isActive",
]);

const buildDefaultUserColumnVisibility = (row = {}) => {
  const visibility = {
    action: true,
    delete: true,
  };

  Object.keys(row).forEach((key) => {
    if (!USER_EXCLUDED_COLUMNS.has(key)) {
      visibility[key] = USER_DEFAULT_VISIBLE_COLUMNS.has(key);
    }
  });

  return visibility;
};

const USER_COLUMN_TITLE_OVERRIDES = {
  loginId: "Username",
};

const formatUserColumnTitle = (key) =>
  USER_COLUMN_TITLE_OVERRIDES[key] ||
  key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeUserColumnOrder = (savedOrder, availableColumnIds = []) => {
  const normalizedOrder = normalizeSavedColumnOrder(
    savedOrder,
    availableColumnIds,
  );

  const orderedKnownColumns = USER_COLUMN_ORDER.filter((columnId) =>
    normalizedOrder.includes(columnId),
  );

  const unknownColumns = normalizedOrder.filter(
    (columnId) => !USER_COLUMN_ORDER.includes(columnId),
  );

  return [...orderedKnownColumns, ...unknownColumns];
};

const toCamelCase = (value) => {
  if (value == null || value === "") {
    return "-";
  }

  return String(value)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const renderUserCellValue = (key, value) => {
  if (value == null || value === "") {
    return "-";
  }

  if (key === "userName") {
    return toCamelCase(value);
  }

  if (["firstName", "middleName", "lastName"].includes(key)) {
    return toCamelCase(value);
  }

  if (["roleName", "orgNames"].includes(key)) {
    const values = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return values.length ? values : [String(value)];
  }

  return String(value);
};

const buildDynamicUserColumns = ({
  rows = [],
  showActions,
  canEdit,
  canDelete,
  onEdit,
}) => {
  const firstRow = rows[0];

  if (!firstRow) {
    return [];
  }

  const dynamicColumns = Object.keys(firstRow)
    .filter(
      (key) =>
        key !== "action" && key !== "delete" && !USER_EXCLUDED_COLUMNS.has(key),
    )
    .sort((a, b) => {
      const indexA = USER_COLUMN_ORDER.indexOf(a);
      const indexB = USER_COLUMN_ORDER.indexOf(b);

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b);
      }

      if (indexA === -1) {
        return 1;
      }

      if (indexB === -1) {
        return -1;
      }

      return indexA - indexB;
    })
    .map((key) => ({
      accessorKey: key,
      headerTitle: formatUserColumnTitle(key),
      cell: ({ row }) => {
        const formattedValue = renderUserCellValue(key, row.getValue(key));

        return (
          <div
            className="p-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
            style={{ fontSize: "10px" }}
            title={
              Array.isArray(formattedValue)
                ? formattedValue.join(", ")
                : formattedValue
            }
          >
            {Array.isArray(formattedValue)
              ? formattedValue.join(", ")
              : formattedValue}
          </div>
        );
      },
      filterFn: "includesString",
    }));

  if (showActions) {
    dynamicColumns.push({
      id: "action",
      enableHiding: false,
      headerTitle: "Action",
      header: () => (
        <div className="flex justify-center text-[10px] font-semibold">
          Action
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="p-1 flex items-center justify-between"
          style={{ fontSize: "10px" }}
        >
          <DataTableRowActions
            row={row}
            tableType="user"
            privileges={{
              canEdit,
              canDelete,
            }}
            onEdit={onEdit}
          />
        </div>
      ),
    });
  }

  if (canDelete) {
    dynamicColumns.push({
      id: "delete",
      enableHiding: false,
      header: ({ table }) => {
        const selectedForDelete = table.options.meta?.selectedForDelete || [];
        const allRows = table.getRowModel().rows || [];
        const allIds = allRows.map((r) => r.original.userId);
        const allSelected =
          allIds.length > 0 &&
          allIds.every((id) => selectedForDelete.includes(id));
        const someSelected =
          !allSelected && allIds.some((id) => selectedForDelete.includes(id));

        return (
          <div className="flex items-center space-x-2">
            <span>Delete</span>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={(e) =>
                table.options.meta?.onToggleAllDelete(e.target.checked)
              }
            />
          </div>
        );
      },
      cell: ({ row, table }) => {
        const id = row.original.userId;
        const selectedForDelete = table.options.meta?.selectedForDelete || [];
        const isSelected = selectedForDelete.includes(id);

        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) =>
                table.options.meta?.onToggleDelete(id, e.target.checked)
              }
            />
          </div>
        );
      },
    });
  }

  return dynamicColumns;
};

const UsersPage = ({ searchParams, basePath = "/dashboard/users" }) => {
  const resolvedSearchParams = React.use(searchParams);
  const { search, isActive, page, perPage } = resolvedSearchParams || {};
  const [data, setData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentRoles, setAgentRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState(search || "");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(search || "");
  const [status, setStatus] = useState(isActive || null);
  const [currentPage, setCurrentPage] = useState(Number(page) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(Number(perPage) || 10);
  const [roleFilter, setRoleFilter] = useState(null);
  const [organizationFilter, setOrganizationFilter] = useState(null);
  // const [platformFilter, setPlatformFilter] = useState([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [selectedUserIdsForDeassociate, setSelectedUserIdsForDeassociate] =
    useState({});
  const [selectedUserIdsForDelete, setSelectedUserIdsForDelete] = useState({});
  const [allowedExportTypes, setAllowedExportTypes] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [selectedRoleOptions, setSelectedRoleOptions] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState(null);
  const [deassociateMode, setDeassociateMode] = useState(null);
  const [selectedOrgForAgent, setSelectedOrgForAgent] = useState(null);
  const [dropdownActive, setDropdownActive] = useState(false); // true when user is interacting
  const [deassociateCancelled, setDeassociateCancelled] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(
    buildDefaultUserColumnVisibility(),
  );
  const [columnOrder, setColumnOrder] = useState([]);
  const [tablePreferenceHydrated, setTablePreferenceHydrated] = useState(false);
  const [orgSyncKey, setOrgSyncKey] = useState("");

  useEffect(() => {
    const storedRoles = sessionStorage.getItem("agentRoles");
    if (storedRoles) {
      try {
        setAgentRoles(JSON.parse(storedRoles));
      } catch (err) {
        console.error("Failed to parse agentRoles", err);
      }
    }
  }, []);

  const hasPrivilege = useCallback(
    (privId) => grantedPrivileges.some((p) => p.PrivilegeId === privId),
    [grantedPrivileges],
  );

  const fetchPrivileges = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      sessionStorage.removeItem("interactionDateRange");
      sessionStorage.removeItem("selectedCallStatus");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      const orgIds = getSelectedOrgIdsHeader();

      if (!orgIds) {
        throw new Error("Organization not selected");
      }

      const response = await fetch(`/api/privileges`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          moduleId: 2,
          orgIds,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        console.warn("Failed to fetch privileges: response not ok");
        setGrantedPrivileges([]);
        setAllowedExportTypes([]);
        setPrivilegesLoaded(true);
        return;
      }
      const data = await response.json();
      setGrantedPrivileges(data.privileges || []);
      setAllowedExportTypes(getExportTypes(data.privileges || []));
      setPrivilegesLoaded(true);
    } catch (err) {
      console.warn("Error fetching privileges:", err);
      setGrantedPrivileges([]);
      setAllowedExportTypes([]);
      setPrivilegesLoaded(true);
    }
  }, []);

  useEffect(() => {
    setOrgSyncKey(getSelectedOrgSyncKey());

    const interval = window.setInterval(() => {
      const nextOrgKey = getSelectedOrgSyncKey();
      setOrgSyncKey((prev) => (prev === nextOrgKey ? prev : nextOrgKey));
    }, 800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setPrivilegesLoaded(false);
    setSelectedUserIdsForDelete({});
    fetchPrivileges();
  }, [fetchPrivileges, orgSyncKey]);

  useEffect(() => {
    if (!hasPrivilege(5)) {
      setSelectedUserIdsForDelete({});
    }
  }, [hasPrivilege]);

  useEffect(() => {
    const nextVisibility = buildDefaultUserColumnVisibility(data[0] || {});
    nextVisibility.action = hasPrivilege(3) || hasPrivilege(5);
    nextVisibility.delete = hasPrivilege(5);
    setColumnVisibility((prev) => ({
      ...prev,
      action: nextVisibility.action,
      delete: nextVisibility.delete,
    }));
  }, [data, hasPrivilege]);

  // const loadRoles = async () => {
  //   try {
  //     const response = await fetch("/api/userRoles", {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  //       },
  //       cache: "no-store",
  //     });
  //     if (!response.ok) throw new Error("Failed to fetch roles");
  //     const data = await response.json();
  //     setRoles(data.roles || []);
  //   } catch (err) {
  //     console.error("Error fetching roles:", err);
  //   }
  // };
  const loadRoles = async () => {
    try {
      // Get logged-in userId from session
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;
      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }

      const response = await fetch("/api/userRoles/byOrg", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId, // ← pass the userId
        },
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };
  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      loadRoles();
    }
  }, [privilegesLoaded, hasPrivilege]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const response = await fetch("/api/organizationDDL", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch organizations");
        const data = await response.json();
      } catch (err) {
        console.error("Error fetching organizations:", err);
      }
    };
    loadOrganizations();
  }, []);

  // Auto-close filter dropdown after 3 seconds
  useEffect(() => {
    if (activeFilterType && !dropdownActive) {
      const timer = setTimeout(() => {
        setActiveFilterType(null); // auto-close dropdown after 3s idle
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [activeFilterType, dropdownActive]);

  // useEffect(() => {
  //   const hasAgentRole = selectedRoleOptions.some((role) =>
  //     agentRoles.includes(Number(role.value)),
  //   );

  //   // ✅ If Agent is selected again, reset cancellation flag
  //   if (hasAgentRole) {
  //     setDeassociateCancelled(false);
  //   }
  // }, [selectedRoleOptions, agentRoles]);

  const getExportTypes = (privileges) => {
    const types = [];
    if (privileges.some((p) => p.PrivilegeId === 4)) types.push("excel");
    if (privileges.some((p) => p.PrivilegeId === 14)) types.push("csv");
    if (privileges.some((p) => p.PrivilegeId === 15)) types.push("pdf");
    return types;
  };

  const fetchUsers = useCallback(
    async (
      triggeredBySearch = false,
      pageNum = currentPage,
      perPageCount = itemsPerPage,
      searchText = appliedSearchQuery,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        let formattedOrganizationFilter = null;
        if (organizationFilter) {
          if (Array.isArray(organizationFilter)) {
            formattedOrganizationFilter = organizationFilter
              .map((item) => {
                if (item && item.value) {
                  const numValue = parseInt(item.value, 10);
                  return !isNaN(numValue) ? numValue : null;
                }
                return null;
              })
              .filter((value) => value !== null)
              .join(",");
          } else if (
            typeof organizationFilter === "object" &&
            organizationFilter.value
          ) {
            const numValue = parseInt(organizationFilter.value, 10);
            formattedOrganizationFilter = !isNaN(numValue)
              ? numValue.toString()
              : null;
          } else if (typeof organizationFilter === "string") {
            const numValue = parseInt(organizationFilter, 10);
            formattedOrganizationFilter = !isNaN(numValue)
              ? numValue.toString()
              : null;
          } else if (typeof organizationFilter === "number") {
            formattedOrganizationFilter = organizationFilter.toString();
          }
        }
        let formattedRoleFilter = null;
        if (roleFilter) {
          if (Array.isArray(roleFilter)) {
            // roleFilter is an array of IDs; join them by comma
            formattedRoleFilter = roleFilter
              .map((id) => {
                const numId = parseInt(id, 10);
                return !isNaN(numId) ? numId : null;
              })
              .filter((id) => id !== null)
              .join(",");
          } else {
            // single role id
            const numId = parseInt(roleFilter, 10);
            formattedRoleFilter = !isNaN(numId) ? numId.toString() : null;
          }
        }

        // const formattedPlatformFilter =
        //   Array.isArray(platformFilter) && platformFilter.length > 0
        //     ? platformFilter
        //         .map((item) => {
        //           const numValue = parseInt(
        //             item?.platformId ?? item?.value,
        //             10,
        //           );
        //           return !isNaN(numValue) ? numValue : null;
        //         })
        //         .filter((value) => value !== null)
        //         .join(",")
        //     : null;

        const requestBody = {
          page: pageNum,
          perPage: perPageCount,
          search: searchText?.trim() || null, // Use searchText here
          queryType: 0,
          currentUserId: userId,
          isActive: status,
          roleFilter: formattedRoleFilter || null,
          organizationFilter: formattedOrganizationFilter || null,
          // platformFilter: formattedPlatformFilter || null,
        };

        const response = await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            orgIds: getSelectedOrgIdsHeader(),
          },
          body: JSON.stringify(requestBody),
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Failed to fetch users");
        const result = await response.json();
        const nextUsers = result.users || [];
        const nextTotalRecords = Number(result.totalRecord || 0);
        const safePerPageCount = Number(perPageCount) || 10;
        const totalPages = Math.max(
          1,
          Math.ceil(nextTotalRecords / safePerPageCount),
        );

        if (nextTotalRecords === 0 && pageNum !== 1) {
          setCurrentPage(1);
          setData([]);
          setTotalRecords(0);
          return;
        }

        if (nextTotalRecords > 0 && pageNum > totalPages) {
          setCurrentPage(totalPages);
          return;
        }

        setData(nextUsers);
        setTotalRecords(nextTotalRecords);
      } catch (err) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [
      currentPage,
      itemsPerPage,
      appliedSearchQuery,
      status,
      roleFilter,
      organizationFilter,
      // platformFilter,
    ],
  );

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchUsers(false, currentPage, itemsPerPage);
    }
  }, [
    status,
    currentPage,
    itemsPerPage,
    privilegesLoaded,
    roleFilter,
    organizationFilter,
    // platformFilter,
    hasPrivilege,
    fetchUsers,
  ]);

  const handleSearchButtonClick = () => {
    const nextSearch = searchQuery.trim();

    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    if (appliedSearchQuery !== nextSearch) {
      setAppliedSearchQuery(nextSearch);
      return;
    }

    fetchUsers(true, 1, itemsPerPage, nextSearch);
  };

  const handleResetButtonClick = () => {
    setSearchQuery("");
    setAppliedSearchQuery("");
    setStatus(null);
    setRoleFilter(null);
    setOrganizationFilter(null);
    //setPlatformFilter([]);
    setSelectedRoleOptions([]);
    setActiveFilterType(null);
    setCurrentPage(1);
    setSelectedUserIdsForDelete({});
    setSelectedUserIdsForDeassociate({});
    setDeassociateMode(null); // ✅ Reset organization removal mode
    setSelectedOrgForAgent(null); // ✅ Reset selected organization
    setDeassociateCancelled(false);
    setBulkDeleteMode(false);
    fetchUsers(false, 1, itemsPerPage, "");
  };
  const handleStatusChange = (event) => {
    setStatus(event.target.value || null);
    setCurrentPage(1);
  };
  const handlePageChange = (pageNum, perPage = itemsPerPage) => {
    const nextPerPage = Number(perPage) || itemsPerPage;
    setCurrentPage(pageNum);
    setItemsPerPage(nextPerPage);
    fetchUsers(false, pageNum, nextPerPage);
  };

  // const handleDeassociateSubmit = async () => {
  //   const selectedUserIds = Object.values(selectedUserIdsForDeassociate).flat();
  //   const selectedOrgId = selectedOrgForAgent?.value;

  //   if (!selectedUserIds.length || !selectedOrgId) {
  //     alert("Please select the new organization, you want to associate.");
  //     return;
  //   }

  //   // 🟡 Confirmation before proceeding
  //   const confirmDeassoc = confirm(
  //     `Are you sure you want to de-associate the selected ${
  //       selectedUserIds.length
  //     } user${
  //       selectedUserIds.length > 1 ? "s" : ""
  //     } from the selected organization?`,
  //   );
  //   if (!confirmDeassoc) return;

  //   const encryptedUserData = sessionStorage.getItem("user");
  //   let currentUserId = null;
  //   let user = null;

  //   if (encryptedUserData) {
  //     try {
  //       const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
  //       const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  //       user = JSON.parse(decryptedData);
  //       currentUserId = user?.userId || null;
  //     } catch (error) {
  //       console.error("Failed to decrypt session user:", error);
  //       alert("User authentication error.");
  //       return;
  //     }
  //   }

  //   if (!currentUserId) {
  //     alert("User session expired or invalid.");
  //     return;
  //   }

  //   const payload = {
  //     OrgId: selectedOrgId,
  //     UserIds: selectedUserIds.join(","),
  //     CreatedBy: currentUserId,
  //   };

  //   try {
  //     const response = await fetch("/api/organization/deAssociateOrg", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
  //         userName: user?.userFullName, // ✅ ADD THIS
  //         orgIds: getSelectedOrgIdsHeader(),
  //       },
  //       body: JSON.stringify(payload),
  //       cache: "no-store",
  //     });

  //     const result = await response.json();

  //     if (response.ok) {
  //       alert(result.message || "Organization de-association successful.");
  //       window.location.reload(); // ✅ reload the page on success
  //     } else {
  //       alert(result.message || "De-association failed.");
  //     }
  //   } catch (error) {
  //     console.error("De-association error:", error);
  //     alert("An unexpected error occurred.");
  //   }
  // };
  // const handleToggleAllSelectOrg = (checked) => {
  //   setSelectedUserIdsForDeassociate((prev) => {
  //     if (checked) {
  //       const allIds = data.map((row) => row.userId);
  //       return { ...prev, [currentPage]: allIds };
  //     } else {
  //       return { ...prev, [currentPage]: [] };
  //     }
  //   });
  // };

  const userColumns = useMemo(
    () =>
      buildDynamicUserColumns({
        rows: data,
        showActions: hasPrivilege(3) || hasPrivilege(5),
        canEdit: hasPrivilege(3),
        canDelete: hasPrivilege(5),
      }),
    [data, hasPrivilege],
  );

  useEffect(() => {
    if (!userColumns.length) {
      return;
    }

    const availableColumnIds = userColumns.map(
      (column) => column.id || column.accessorKey,
    );

    setColumnOrder((prev) => {
      const normalizedOrder = normalizeUserColumnOrder(
        prev,
        availableColumnIds,
      );

      const hasChanged =
        normalizedOrder.length !== prev.length ||
        normalizedOrder.some((id, index) => prev[index] !== id);

      return hasChanged ? normalizedOrder : prev;
    });
  }, [userColumns]);

  useEffect(() => {
    if (!data.length) {
      return;
    }

    const dynamicKeys = Object.keys(data[0]).filter(
      (key) =>
        key !== "action" && key !== "delete" && !USER_EXCLUDED_COLUMNS.has(key),
    );

    setColumnVisibility((prev) => {
      const nextVisibility = {
        action: hasPrivilege(3) || hasPrivilege(5),
        delete: hasPrivilege(5),
      };

      dynamicKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          nextVisibility[key] = prev[key];
        } else {
          nextVisibility[key] = USER_DEFAULT_VISIBLE_COLUMNS.has(key);
        }
      });

      const hasChanged =
        Object.keys(nextVisibility).length !== Object.keys(prev).length ||
        Object.keys(nextVisibility).some(
          (key) => prev[key] !== nextVisibility[key],
        );

      return hasChanged ? nextVisibility : prev;
    });
  }, [data, hasPrivilege]);

  const persistUsersTablePreference = useCallback(
    async (nextVisibility, nextOrder, availableColumnIds = []) => {
      if (!tablePreferenceHydrated || !availableColumnIds.length) {
        return;
      }

      try {
        await saveUserTablePreference(TABLE_PREFERENCE_PAGE_KEYS.USERS, {
          version: 1,
          columnVisibility: nextVisibility,
          columnOrder: normalizeUserColumnOrder(nextOrder, availableColumnIds),
        });
      } catch (error) {
        console.error("Failed to save users table preference:", error);
      }
    },
    [tablePreferenceHydrated],
  );

  const handleUsersColumnVisibilityChange = useCallback(
    (nextVisibilityOrUpdater) => {
      setColumnVisibility((prev) => {
        const nextVisibility =
          typeof nextVisibilityOrUpdater === "function"
            ? nextVisibilityOrUpdater(prev)
            : nextVisibilityOrUpdater;

        const availableColumnIds = userColumns.map(
          (column) => column.id || column.accessorKey,
        );

        persistUsersTablePreference(
          nextVisibility,
          columnOrder,
          availableColumnIds,
        );

        return nextVisibility;
      });
    },
    [columnOrder, persistUsersTablePreference, userColumns],
  );

  const handleUsersColumnOrderChange = useCallback(
    (nextOrderOrUpdater) => {
      setColumnOrder((prev) => {
        const nextOrder =
          typeof nextOrderOrUpdater === "function"
            ? nextOrderOrUpdater(prev)
            : nextOrderOrUpdater;

        const availableColumnIds = userColumns.map(
          (column) => column.id || column.accessorKey,
        );

        persistUsersTablePreference(
          columnVisibility,
          nextOrder,
          availableColumnIds,
        );

        return nextOrder;
      });
    },
    [columnVisibility, persistUsersTablePreference, userColumns],
  );

  useEffect(() => {
    let ignore = false;

    const loadSavedPreference = async () => {
      try {
        const preference = await loadUserTablePreference(
          TABLE_PREFERENCE_PAGE_KEYS.USERS,
        );

        if (ignore || !preference) {
          return;
        }

        if (preference.columnVisibility) {
          setColumnVisibility(preference.columnVisibility);
        }

        if (Array.isArray(preference.columnOrder)) {
          setColumnOrder(preference.columnOrder);
        }
      } catch (error) {
        console.error("Failed to load saved users table preference:", error);
      } finally {
        if (!ignore) {
          setTablePreferenceHydrated(true);
        }
      }
    };

    loadSavedPreference();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!tablePreferenceHydrated || !userColumns.length) {
      return;
    }

    const availableColumnIds = userColumns.map(
      (column) => column.id || column.accessorKey,
    );

    const timeoutId = window.setTimeout(async () => {
      persistUsersTablePreference(
        columnVisibility,
        columnOrder,
        availableColumnIds,
      );
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    columnOrder,
    columnVisibility,
    persistUsersTablePreference,
    tablePreferenceHydrated,
    userColumns,
  ]);

  // 🧩 Handles toggle for one checkbox
  const handleToggleDelete = (id, checked) => {
    setSelectedUserIdsForDelete((prev) => {
      const currentPageIds = prev[currentPage] || [];
      let updatedIds;
      if (checked) {
        updatedIds = [...currentPageIds, id];
      } else {
        updatedIds = currentPageIds.filter((x) => x !== id);
      }
      return { ...prev, [currentPage]: updatedIds };
    });
  };

  // 🧩 Handles toggle for "select all" checkbox
  const handleToggleAllDelete = (checked) => {
    setSelectedUserIdsForDelete((prev) => {
      if (checked) {
        // ✅ Select all visible rows on current page
        const allIds = data.map((row) => row.userId);
        return { ...prev, [currentPage]: allIds };
      } else {
        // ❌ Deselect all
        return { ...prev, [currentPage]: [] };
      }
    });
  };

  // Bulk Delete Submit Handler
  const handleBulkDeleteSubmit = async () => {
    const allSelectedIds = Object.values(selectedUserIdsForDelete).flat();
    if (!allSelectedIds.length) {
      alert("Please select users to delete.");
      return;
    }

    // Single confirmation — warn about related data
    const confirmDelete = confirm(
      "On deleting these users, all associated interactions and evaluations will also be permanently deleted.\n\nAre you absolutely sure you want to proceed?",
    );
    if (!confirmDelete) return;

    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let currentUserId = null;
      let user = null; // ✅ ADD THIS

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        user = JSON.parse(decryptedData); // ✅ assign to outer variable
        currentUserId = user?.userId || null;
      }

      const response = await fetch("/api/users/delete/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          userName: user?.userFullName, // ✅ add this
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({ userIds: allSelectedIds, currentUserId }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Users deleted successfully.");
        setSelectedUserIdsForDelete({});
        window.location.reload(); // Force reload on success
      } else {
        alert(result.message || "Delete failed.");
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Error deleting users.");
    }
  };

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-visible p-4">
      <div className="sticky top-0 z-20 shrink-0 bg-background pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            {/* Search Field + Icon */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search User"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSearchButtonClick()
                }
                className="pr-8 pl-2 py-1 border border-border text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-80"
              />
              <FaSearch
                className="absolute right-2 top-1.5 text-muted-foreground w-3.5 h-3.5 cursor-pointer"
                onClick={handleSearchButtonClick}
                title="Search"
              />
            </div>

            <select
              className="w-[160px] px-3 py-1 border border-border bg-background text-foreground text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              value={activeFilterType || ""}
              onChange={(e) => setActiveFilterType(e.target.value || null)}
            >
              <option value="">Select Filter</option>
              <option value="status">User Status</option>
              <option value="organization">Organization</option>
              <option value="roles">Roles</option>
            </select>

            {/* De-associate Organization (from Users page) — DISABLED.
               This is now handled exclusively from the Organization page.
               Re-enable by uncommenting this block if needed. */}
            {/*
            {selectedRoleOptions.some((role) =>
              agentRoles.includes(Number(role.value)),
            ) &&
              hasPrivilege(25) &&
              deassociateMode !== "organization" &&
              !deassociateCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    setDeassociateMode("organization");
                    setSelectedUserIdsForDeassociate({});
                    setDeassociateCancelled(false);
                  }}
                  className="bg-red-500 text-white text-xs px-4 py-1 rounded-md hover:bg-red-600"
                >
                  De-associate Organization
                </button>
              )}

            {deassociateMode === "organization" && (
              <button
                className="bg-gray-400 text-white text-xs px-4 py-1 rounded-md hover:bg-gray-600"
                onClick={() => {
                  setDeassociateMode(null);
                  setSelectedUserIdsForDeassociate({});
                  setDeassociateCancelled(true);
                }}
              >
                Cancel De-association
              </button>
            )}

            {deassociateMode === "organization" &&
              Object.values(selectedUserIdsForDeassociate).flat().length >
                0 && (
                <>
                  <div className="w-[320px] shrink-0">
                    <TreeDropdown
                      selected={selectedOrgForAgent}
                      onChange={setSelectedOrgForAgent}
                      isMulti={false}
                      usePortalMenu={true}
                      menuPlacement="bottom"
                    />
                  </div>
                  <button
                    className="bg-[#B33F40] hover:bg-[var(--brand-secondary)] text-white px-4 py-1 text-xs rounded-md"
                    onClick={handleDeassociateSubmit}
                  >
                    Confirm Association
                  </button>
                </>
              )}
            */}

            <button
              type="button"
              onClick={handleResetButtonClick}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-xs px-4 py-1 rounded-md"
            >
              Reset
            </button>
            {/* RIGHT SIDE */}
            <button
              onClick={() => setHelpOpen(true)}
              className="ml-auto text-muted-foreground hover:text-primary"
              title="Information"
            >
              <HiMiniInformationCircle className="h-7 w-7 ml-auto cursor-pointer text-blue-500 hover:text-blue-600" />
            </button>
          </div>
        </div>

        <div className="mb-4 relative z-50">
          {activeFilterType === "status" && (
            <select
              value={status || ""}
              onChange={handleStatusChange}
              onFocus={() => setDropdownActive(true)}
              onBlur={() => setDropdownActive(false)}
              className="w-full max-w-xs px-3 py-1 border border-border bg-background text-foreground text-xs rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="">Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          )}

          {activeFilterType === "roles" && (
            <div
              className="w-full max-w-xs"
              onMouseEnter={() => setDropdownActive(true)}
              onMouseLeave={() => setDropdownActive(false)}
            >
              <RoleMultiSelect
                roles={roles}
                selectedRoles={selectedRoleOptions}
                onChange={(selected) => {
                  setSelectedRoleOptions(selected);
                  setRoleFilter(selected.map((r) => r.value));
                  setCurrentPage(1);
                }}
                error={null}
                enforceAgentExclusivity={false}
                usePortalMenu={true}
              />
            </div>
          )}

          {activeFilterType === "organization" && (
            <div
              className="w-full max-w-xs"
              onMouseEnter={() => setDropdownActive(true)}
              onMouseLeave={() => setDropdownActive(false)}
            >
              <OrgTreeDropDownReport
                selected={organizationFilter}
                onChange={(selected) => {
                  setOrganizationFilter(selected);
                  setCurrentPage(1);
                }}
                isMulti={true}
              />
            </div>
          )}

          {/*{activeFilterType === "platform" && (
            <div
              className="w-full max-w-xs"
              onMouseEnter={() => setDropdownActive(true)}
              onMouseLeave={() => setDropdownActive(false)}
            >
              <PlatformDDL
                isMulti={true}
                value={platformFilter}
                onChange={(selected) => {
                  setPlatformFilter(selected || []);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}*/}

          {/* Selected Filters Summary */}
          {(status ||
            selectedRoleOptions.length > 0 ||
            (organizationFilter && organizationFilter.length > 0)) && (
            <div className="flex flex-col gap-1 mt-2 text-xs">
              {/* Status */}
              {status && (
                <span>Status: {status === "1" ? "Active" : "Inactive"}</span>
              )}

              {/* Roles */}
              {selectedRoleOptions.length > 0 && (
                <span className="flex items-center gap-1">
                  Roles:{" "}
                  {selectedRoleOptions
                    .slice(0, 3)
                    .map((r) => r.label)
                    .join(", ")}
                  {selectedRoleOptions.length > 3 && (
                    <button
                      type="button"
                      className="underline text-primary hover:text-blue-800 ml-1"
                      onClick={() => setActiveFilterType("roles")}
                    >
                      +{selectedRoleOptions.length - 3} more
                    </button>
                  )}
                </span>
              )}

              {/* Organizations */}
              {organizationFilter && organizationFilter.length > 0 && (
                <span className="flex items-center gap-1 cursor-pointer">
                  Organizations:{" "}
                  {Array.isArray(organizationFilter)
                    ? organizationFilter
                        .slice(0, 3)
                        .map((org) => org.label)
                        .join(", ")
                    : organizationFilter.label || organizationFilter}
                  {Array.isArray(organizationFilter) &&
                    organizationFilter.length > 3 && (
                      <button
                        type="button"
                        className="underline text-primary hover:text-blue-800 ml-1"
                        onClick={() => setActiveFilterType("organization")}
                      >
                        +{organizationFilter.length - 3} more
                      </button>
                    )}
                </span>
              )}

              {/*{platformFilter.length > 0 && (
                <span className="flex items-center gap-1 cursor-pointer">
                  Platform:{" "}
                  {platformFilter
                    .slice(0, 3)
                    .map((platform) => platform.label)
                    .join(", ")}
                  {platformFilter.length > 3 && (
                    <button
                      type="button"
                      className="underline text-primary hover:text-blue-800 ml-1"
                      onClick={() => setActiveFilterType("platform")}
                    >
                      +{platformFilter.length - 3} more
                    </button>
                  )}
                </span>
              )}*/}
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col min-w-[600px]">
          {loading ? (
            <p className="text-xs">Loading...</p>
          ) : error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <Suspense fallback={<div className="text-xs">Loading...</div>}>
              {hasPrivilege(1) ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <DataTable
                    data={data}
                    columns={userColumns}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={handleUsersColumnVisibilityChange}
                    columnOrder={columnOrder}
                    onColumnOrderChange={handleUsersColumnOrderChange}
                    loading={loading}
                    // selectableRows={!!deassociateMode}
                    // selectedRowIds={
                    //   selectedUserIdsForDeassociate[currentPage] || []
                    // }
                    // onSelectedRowIdsChange={(ids) => {
                    //   setSelectedUserIdsForDeassociate((prev) => ({
                    //     ...prev,
                    //     [currentPage]: ids,
                    //   }));
                    // }}
                    // De-associate row-selection wiring disabled along with the
                    // "De-associate Organization" button above.
                    selectableRows={false}
                    selectedRowIds={[]}
                    onSelectedRowIdsChange={() => {}}
                    tableMeta={{
                      selectedForDelete: Object.values(
                        selectedUserIdsForDelete,
                      ).flat(),
                      onToggleDelete: handleToggleDelete,
                      onToggleAllDelete: handleToggleAllDelete,
                      onBulkDelete: handleBulkDeleteSubmit,
                      //onToggleAllSelectOrg: handleToggleAllSelectOrg,
                      grantedPrivileges, // ✅ pass privileges here
                    }}
                    rowClickSelection={false}
                    showCreateBtn={hasPrivilege(2)}
                    exportType={"Users"}
                    allowedExportTypes={allowedExportTypes}
                    createBasePath={basePath}
                    // ✅ ADD THESE TWO:
                    // useModal={true}
                    // onModalOpen={() => setAddUserModalOpen(true)}
                    useModal={false}
                    exportStatus={status}
                    exportSearch={searchQuery}
                    exportRoleFilter={roleFilter}
                    exportOrganizationFilter={organizationFilter}
                    // exportPlatformFilter={platformFilter}
                    fillHeight={true}
                  />

                  {totalRecords > 0 && (
                    <DataTablePagination
                      className="shrink-0 border-t bg-background pt-3"
                      totalRecords={totalRecords}
                      currentPageNum={currentPage}
                      itemsPerPage={itemsPerPage}
                      loading={loading}
                      onPageChange={handlePageChange}
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs">Loading...</p>
              )}
            </Suspense>
          )}
        </div>
      </div>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogTitle className="text-sm font-semibold">
            Users Page Information
          </DialogTitle>

          <div className="text-xs text-muted-foreground space-y-3 mt-2 leading-relaxed">
            <p>
              • You can search users, apply filters, and customize visible
              columns as per your requirement.
            </p>

            <p>
              • Available filters include{" "}
              <strong>Status (Active/Inactive)</strong>,{" "}
              <strong>Organization</strong>, and <strong>Role</strong>.
            </p>

            {/*<p>
              • <strong>De-association of Organization:</strong> This feature is
              available only when the selected role includes{" "}
              <strong>Agent</strong>.
            </p>

            <p>
              • Once Agent role is selected, the{" "}
              <strong>“De-associate Organization”</strong> button appears.
              Clicking it enables multi-user selection.
            </p>

            <p>
              • Select one or more users, choose a new organization from the
              dropdown, and click <strong>“Confirm Association”</strong> to
              update.
            </p>

            <p>
              • You can cancel the process anytime using{" "}
              <strong>“Cancel De-association”</strong> and resume it later if
              needed.
            </p>*/}

            <p>
              • The <strong>Reset</strong> button clears all search inputs,
              filters, and selections.
            </p>

            <p>
              • You can download reports, create new users, edit existing users,
              and perform both individual and bulk delete actions.
            </p>

            <p>
              • Only users who are <strong>not deleted</strong> are visible in
              the list.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default withAuth(UsersPage);
