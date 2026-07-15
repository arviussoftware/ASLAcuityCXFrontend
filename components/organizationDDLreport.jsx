// component/organizationDDLreport.jsx
import CryptoJS from "crypto-js";
import React, { useEffect, useState, useRef } from "react";
import Select, { components } from "react-select";
import withAuth from "@/components/withAuth";

// Fetch organization tree from API
async function fetchOrganizationTreeReport() {
  let userId = null;
  const encryptedUserData = sessionStorage.getItem("user");
  if (encryptedUserData) {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const user = JSON.parse(decryptedData);
    userId = user?.userId || null;
  }
  const response = await fetch("/api/organizationDDL", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      loggedInUserId: userId,
    },
    cache: "no-store",
  });
  const data = await response.json();
  if (response.ok) {
    return data.organizationList;
  } else {
    throw new Error(data.message || "Failed to fetch organization data");
  }
}

// Convert tree structure into react-select-compatible format
function transformToSelectOptions(tree) {
  return tree.map((node) => ({
    value: node.id,
    label: node.label,
    // isDisabled: node.isActive !== 1, // Disable if inactive
    // isDisabled: node.isActive === false, // ✅ or simply: !node.isActive
    isDisabled: node.isDisabled || false,
    children: node.children ? transformToSelectOptions(node.children) : [],
  }));
}

function flattenTreeToGroups(tree, depth = 0) {
  const groups = [];
  const traverse = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      groups.push({
        value: node.value,
        label: node.label,
        depth,
        isDisabled: node.isDisabled || false,
      });

      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  };
  traverse(tree, depth);
  return groups;
}

const customStyles = {
  option: (provided, { data, isDisabled }) => ({
    ...provided,
    paddingLeft: `${(data.depth || 0) * 16 + 10}px`, // indent based on depth
    padding: "6px 10px",
    // fontSize: "0.75rem",
    color: isDisabled
      ? "hsl(var(--muted-foreground))"
      : "hsl(var(--foreground))",
    backgroundColor: "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    ":hover": {
      backgroundColor: "transparent",
      color: "hsl(var(--primary))",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 9999, // ✅ FIX
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999, // ✅ ADD THIS
  }),
  control: (provided) => ({
    ...provided,
    borderColor: "hsl(var(--border))",
    boxShadow: "none",
    borderRadius: "0.375rem", // Rounded corners
    minHeight: "28px", // Sets a smaller minimum height
    height: "28px", // Explicitly sets a smaller height
    "&:hover": {
      borderColor: "hsl(var(--ring))",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.800rem",
  }),
  singleValue: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "hsl(var(--muted))",
    color: "hsl(var(--foreground))",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    ":hover": {
      backgroundColor: "hsl(var(--destructive))",
      color: "white",
    },
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    display: "none",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "4px",
    color: "hsl(var(--muted-foreground))",
    ":hover": {
      color: "hsl(var(--foreground))",
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: "4px",
    color: "hsl(var(--muted-foreground))",
    ":hover": {
      color: "hsl(var(--foreground))",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "0 8px",
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
    fontSize: "0.875rem",
  }),
};

function findNodeByValue(tree, value) {
  for (const node of tree) {
    if (node.value === value) return node;
    if (node.children) {
      const child = findNodeByValue(node.children, value);
      if (child) return child;
    }
  }
  return null;
}

function getAllDescendants(node) {
  const descendants = [];
  function traverse(n) {
    if (n.children && n.children.length > 0) {
      n.children.forEach((child) => {
        descendants.push(child);
        traverse(child);
      });
    }
  }
  traverse(node);
  return descendants;
}

const OrgTreeDropDownReport = ({
  onChange,
  selected,
  isMulti = false,
  shouldOpen = false,
  onOpened,
}) => {
  const [treeData, setTreeData] = useState([]);
  const [rawOptions, setRawOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(selected || []);

  const selectRef = useRef(null);

  useEffect(() => {
    if (shouldOpen && selectRef.current) {
      selectRef.current.focus(); // sets focus
      // setTimeout helps ensure dropdown opens AFTER render
      setTimeout(() => {
        selectRef.current?.onMenuOpen?.();
        onOpened?.(); // notify parent to reset shouldOpen
      }, 10);
    }
  }, [shouldOpen]);

  useEffect(() => {
    const loadTreeData = async () => {
      try {
        const rawTree = await fetchOrganizationTreeReport();
        const transformed = transformToSelectOptions(rawTree);
        setTreeData(transformed);
        const flatOptions = flattenTreeToGroups(transformed);
        setRawOptions(flatOptions);
      } catch (error) {
        console.error("Error loading organization options:", error);
      }
    };

    loadTreeData();
  }, []);

  // const allSelected = isMulti && selectedOption?.length === rawOptions.length;
  // const selectAllOption = {
  //   label: allSelected ? "Deselect All" : "Select All",
  //   value: "__all__",
  // };

  // const finalOptions = isMulti ? [selectAllOption, ...rawOptions] : rawOptions;
  const enabledOptions = rawOptions.filter((opt) => !opt.isDisabled);
  const allSelected =
    isMulti && selectedOption?.length === enabledOptions.length;

  const selectAllOption = {
    label: allSelected ? "Deselect All" : "Select All",
    value: "__all__",
  };

  const finalOptions = isMulti ? [selectAllOption, ...rawOptions] : rawOptions;

  const handleChange = (selected) => {
    if (!isMulti) {
      if (!selected?.isDisabled) {
        setSelectedOption(selected);
        onChange?.(selected);
      }
      return;
    }

    const isSelectAll = selected?.some((item) => item.value === "__all__");
    const allEnabledOptions = rawOptions.filter((opt) => !opt.isDisabled); // ✅ FIXED

    if (isSelectAll) {
      const allSelected = selectedOption?.length === allEnabledOptions.length;
      const updated = allSelected ? [] : allEnabledOptions;

      setSelectedOption(updated);
      onChange?.(updated);
      return;
    }

    const prevMap = new Map((selectedOption || []).map((i) => [i.value, i]));
    const currMap = new Map((selected || []).map((i) => [i.value, i]));

    const added = (selected || []).filter((item) => !prevMap.has(item.value));
    const removed = (selectedOption || []).filter(
      (item) => !currMap.has(item.value),
    );

    let updated = [...selectedOption];

    for (const item of added) {
      if (item.isDisabled) continue;

      const node = findNodeByValue(treeData, item.value);
      if (!node) continue;

      updated.push(item); // Add self

      const descendants = getAllDescendants(node).filter((n) => !n.isDisabled);
      descendants.forEach((child) => {
        if (!updated.find((s) => s.value === child.value)) {
          updated.push({
            value: child.value,
            label: child.label,
            depth: child.depth,
            isDisabled: child.isDisabled,
          });
        }
      });
    }

    for (const item of removed) {
      const node = findNodeByValue(treeData, item.value);
      if (!node) continue;

      updated = updated.filter((s) => s.value !== item.value);

      const descendants = getAllDescendants(node);
      const idsToRemove = descendants.map((n) => n.value);
      updated = updated.filter((s) => !idsToRemove.includes(s.value));
    }

    setSelectedOption(updated);
    onChange?.(updated);
  };

  useEffect(() => {
    if (selected) setSelectedOption(selected);
  }, [selected]);

  return (
    <Select
      ref={selectRef}
      options={finalOptions}
      styles={customStyles}
      value={selectedOption}
      onChange={handleChange}
      isClearable
      isMulti={isMulti}
      className="text-xs"
      isSearchable={true}
      placeholder="Select an organization"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      // ✅ ADD THESE
      menuPortalTarget={typeof window !== "undefined" ? document.body : null}
      menuPosition="fixed"
      components={{
        Option: (props) => (
          <components.Option {...props}>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2 inline-block border rounded border-border flex justify-center items-center">
                {props.isSelected && (
                  <svg
                    className="w-3 h-3 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm">{props.label}</span>
            </div>
          </components.Option>
        ),
        MultiValue: ({ index, getValue, ...props }) => {
          const maxToShow = 1;
          const values = getValue();
          const overflow = values.length - maxToShow;

          if (index < maxToShow) {
            return <components.MultiValue {...props} />;
          }

          if (index === maxToShow) {
            return (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "hsl(var(--muted-foreground))",
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  backgroundColor: "hsl(var(--muted))",
                  borderRadius: "4px",
                  marginLeft: "2px",
                  marginRight: "-15px",
                }}
              >
                +{overflow} more
              </div>
            );
          }

          return null;
        },
      }}
    />
  );
};

export default withAuth(OrgTreeDropDownReport);
