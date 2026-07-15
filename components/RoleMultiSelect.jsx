// components/RoleMultiSelect.jsx
import React, { useState, useEffect } from "react";
import Select, { components } from "react-select";
import withAuth from "./withAuth";

const RoleMultiSelect = ({
  roles,
  selectedRoles,
  onChange,
  error,
  enforceAgentExclusivity = true,
  placeholder = "Select roles",
  isDisabled = false,
  usePortalMenu = false,
}) => {
  const [agentRoles, setAgentRoles] = useState([]);
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
  const isAgentSelected = selectedRoles.some((r) =>
    agentRoles.includes(Number(r.value)),
  );

  const filteredRoles = roles
    .filter((role) => {
      if (!enforceAgentExclusivity) return true;
      const isRoleAgent = agentRoles.includes(Number(role.roleId));
      if (isAgentSelected) return isRoleAgent;
      if (selectedRoles.length > 0 && isRoleAgent) return false;
      return true;
    })
    .map((role) => ({
      value: role.roleId,
      label: role.roleName,
    }));

  const customStyles = {
    option: (provided, { isDisabled, isFocused }) => ({
      ...provided,
      padding: "8px 12px",
      fontSize: "0.75rem",
      color: isDisabled
        ? "hsl(var(--muted-foreground))"
        : "hsl(var(--foreground))",
      backgroundColor: isFocused ? "hsl(var(--muted))" : "transparent",
      cursor: isDisabled ? "not-allowed" : "pointer",
    }),
    control: (provided) => ({
      ...provided,
      borderColor: "hsl(var(--border))",
      boxShadow: "none",
      borderRadius: "0.375rem",
      minHeight: "34px",
      height: "34px",
      fontSize: "0.75rem",
      "&:hover": {
        borderColor: "hsl(var(--ring))",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "0.75rem",
      color: "hsl(var(--muted-foreground))",
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "hsl(var(--muted))",
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
    menu: (provided) => ({
      ...provided,
      position: "relative", // ← SIRF YEH EK LINE ADD KARO
      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
      border: "1px solid hsl(var(--border))",
      marginTop: "4px",
      zIndex: 10,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 100,
    }),
  };

  const selectProps = usePortalMenu
    ? {
        menuPortalTarget:
          typeof document !== "undefined" ? document.body : null,
        menuPosition: "fixed",
      }
    : {};

  const Option = (props) => (
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

  const MultiValue = ({ index, getValue, ...props }) => {
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
  };

  return (
    <div className="w-full">
      <Select
        options={filteredRoles}
        isMulti
        value={selectedRoles}
        onChange={onChange}
        {...selectProps}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        isSearchable={false}
        isDisabled={isDisabled}
        className="text-xs"
        placeholder={placeholder}
        styles={customStyles}
        components={{ Option, MultiValue }}
      />
      {/*{isAgentSelected && (
        <p className="text-xs text-primary mt-1">
          Only one role and one organization can be selected for AGENT.
        </p>
      )}*/}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default withAuth(RoleMultiSelect);
