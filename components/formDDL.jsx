// components\formDDL.jsx
"use client";
import CryptoJS from "crypto-js";
import Select, { components } from "react-select";
import React, { useEffect, useState, useRef } from "react";
import withAuth from "@/components/withAuth";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// Fetch form dropdown list from API
const FormDropdown = async () => {
  const encryptedUserData = sessionStorage.getItem("user");
  let userId = null;

  if (encryptedUserData) {
    const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const user = JSON.parse(decryptedData);
    userId = user?.userId || null;
  }
  const response = await fetch("/api/formDDL", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      loggedInUserId: userId,
      orgIds: getSelectedOrgIdsHeader(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Failed to fetch form data (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.message) message = errData.message;
    } catch {}
    throw new Error(message);
  }

  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.message || "Failed to fetch form data");
  }
};

const customStyles = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: "transparent",
    color: "hsl(var(--foreground))",
    cursor: "pointer",
    padding: "6px 10px",
    ":hover": {
      backgroundColor: "transparent", // #DBEAFE
      color: "hsl(var(--primary))",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
  }),

  control: (provided) => ({
    ...provided,
    top: "4px",
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
      backgroundColor: "hsl(var(--destructive))", // Tailwind red-400
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

// const FormDDLForReport = ({ isMulti = false, value = [], onChange }) => {
const FormDDLForReport = ({
  isMulti = false,
  value = [],
  onChange,
  shouldOpen = false,
  onOpened,
}) => {
  const [rawOptions, setRawOptions] = useState([]);

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
    const loadOptions = async () => {
      try {
        const formList = await FormDropdown();
        const formattedOptions = formList.map((form) => ({
          value: form.Form_id,
          label: form.form_name,
        }));
        setRawOptions(formattedOptions);
      } catch (error) {
        console.error("Error loading form options:", error);
      }
    };

    loadOptions();
  }, []);

  const allOptions = rawOptions;
  const allSelected = isMulti && value?.length === allOptions.length;
  const selectAllOption = {
    label: allSelected ? "Deselect All" : "Select All",
    value: "__all__",
  };

  const sortOptions = (options, selectedValues) => {
    if (!selectedValues || selectedValues.length === 0) return options;

    const selected = Array.isArray(selectedValues)
      ? selectedValues
      : [selectedValues];
    const selectedSet = new Set(selected.map((s) => s.value));

    const selectedOptions = options.filter((opt) => selectedSet.has(opt.value));
    const unselectedOptions = options.filter(
      (opt) => !selectedSet.has(opt.value)
    );

    return [...selectedOptions, ...unselectedOptions];
  };

  const sortedOptions = sortOptions(allOptions, value);
  const finalOptions = isMulti
    ? [selectAllOption, ...sortedOptions]
    : sortedOptions;

  const handleChange = (selected) => {
    if (!isMulti) {
      onChange?.(selected);
      return;
    }

    if (!selected) {
      onChange([]);
      return;
    }

    const isSelectAllSelected = selected.some(
      (item) => item.value === "__all__"
    );

    if (isSelectAllSelected) {
      onChange(allSelected ? [] : allOptions);
    } else {
      onChange(selected);
    }
  };

  return (
    <Select
      ref={selectRef}
      options={finalOptions}
      styles={customStyles}
      value={value}
      onChange={handleChange}
      isClearable
      isMulti={isMulti}
      className="text-xs"
      isSearchable={true}
      placeholder="Select a form"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      // components={{
      //   Option: (props) => {
      components={{
        ...(isMulti && {
          Option: (props) => {
            return (
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
            );
          },
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
        }),
      }}
    />
  );
};

export default withAuth(FormDDLForReport);

