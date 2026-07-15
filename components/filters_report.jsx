// components/filter_report.jsx
"use client";
import React, { useState, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FormDDLForReport from "@/components/formDDL";
import OrgTreeDropDownReport from "@/components/organizationDDLreport";
import AgentDDL from "@/components/agentDDL";
import RoleMultiSelect from "@/components/RoleMultiSelect";
import withAuth from "./withAuth";

// Optional: Your custom date input
const CustomDateInput = forwardRef(({ value, onClick, placeholder }, ref) => (
  <button
    type="button"
    onClick={onClick}
    ref={ref}
    className={`border border-border px-3 py-1.5 rounded-md text-xs w-36 text-left ${
      !value ? "text-muted-foreground" : "text-foreground"
    }`}
  >
    {value || placeholder}
  </button>
));

// ✅ Add this line to fix the warning
CustomDateInput.displayName = "CustomDateInput";

const ReportDatePopperContainer = ({ children }) => {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="relative z-[9999]">{children}</div>,
    document.body,
  );
};

const ReportFilters = ({
  enabledFilters = [], // ✅ new prop
  leadingContent = null,
  filterType,
  setFilterType,
  dateRange,
  setDateRange,
  activeFilter,
  setActiveFilter,
  selectedFormNames,
  setSelectedFormNames,
  selectedOrganizations,
  setSelectedOrganizations,
  selectedAgents,
  setSelectedAgents,
  roles = [],
  selectedRoles = [],
  setSelectedRoles = () => {},
  actionOptions = [],
  selectedAction = "",
  setSelectedAction = () => {},
  handleViewReport,
  handleResetFilters,
  isRawDataReport = false,
}) => {
  const [startDate, endDate] = dateRange;
  const [shouldOpenDropdown, setShouldOpenDropdown] = useState(false);
  const [dropdownActive, setDropdownActive] = useState(false);
  const nonDateFilters = enabledFilters.filter((filter) =>
    ["form", "organization", "agent", "role", "action"].includes(filter),
  );
  const singleInlineFilter =
    nonDateFilters.length === 1 ? nonDateFilters[0] : null;
  const singleFilterLabelMap = {
    form: "Evaluation Form",
    organization: "Organization",
    agent: "Agent",
    role: "Role",
    action: "Action Filter",
  };
  const datePickerProps = {
    dateFormat: "MM/dd/yyyy",
    showYearDropdown: true,
    showMonthDropdown: true,
    scrollableYearDropdown: true,
    yearDropdownItemNumber: 25,
    popperPlacement: "bottom-start",
    popperClassName: "z-[9999]",
    popperProps: { strategy: "fixed" },
    popperContainer: ReportDatePopperContainer,
  };

  const handleStartDateChange = (date) => {
    if (!date) {
      setDateRange([null, endDate]);
      return;
    }

    if (endDate && date > endDate) {
      setDateRange([date, date]);
      return;
    }

    setDateRange([date, endDate]);
  };

  const handleEndDateChange = (date) => {
    if (!date) {
      setDateRange([startDate, null]);
      return;
    }

    if (startDate && date < startDate) {
      setDateRange([startDate, startDate]);
      return;
    }

    setDateRange([startDate, date]);
  };

  // Auto-close active filter after 2 seconds of inactivity
  useEffect(() => {
    if (activeFilter && !dropdownActive) {
      const timer = setTimeout(() => {
        setActiveFilter(""); // close active filter
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeFilter, dropdownActive]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-2 w-full">
        {/* LEFT: Filter Controls */}
        <div className="flex flex-wrap items-end gap-4">
          {leadingContent}

          {/* Date Filter Dropdown */}
          <div className="flex flex-col">
            <label className="text-[11px] text-muted-foreground mb-1">
              Date Filter
            </label>
            <select
              className="border border-border px-3 py-1.5 rounded-md text-xs w-36"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="" disabled>
                Select Date
              </option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="DAY_BEFORE_YESTERDAY">Day Before Yesterday</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="DATE_RANGE">Custom</option>
            </select>
          </div>

          {/* From and To Date Pickers */}
          {filterType === "DATE_RANGE" && (
            <>
              <div className="flex flex-col">
                <label className="text-[11px] text-muted-foreground mb-1">
                  From Date
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  maxDate={new Date()}
                  customInput={<CustomDateInput />}
                  {...datePickerProps}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[11px] text-muted-foreground mb-1">
                  To Date
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate}
                  maxDate={new Date()}
                  customInput={<CustomDateInput />}
                  {...datePickerProps}
                />
              </div>
            </>
          )}

          {/* Filter Selector Dropdown */}
          <div className="flex items-center gap-4">
            {!singleInlineFilter && nonDateFilters.length > 0 && (
              <select
                className="border border-border px-3 py-1.5 mt-2 rounded-md text-xs w-40"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="" disabled>
                  Select Filter
                </option>
                {enabledFilters.includes("form") && (
                  <option value="form">Evaluation Form</option>
                )}

                {enabledFilters.includes("organization") && (
                  <option value="organization">Organization</option>
                )}

                {enabledFilters.includes("agent") && (
                  <option value="agent">Agent</option>
                )}

                {enabledFilters.includes("role") && (
                  <option value="role">Role</option>
                )}

                {enabledFilters.includes("action") && (
                  <option value="action">Action</option>
                )}
              </select>
            )}

            {(activeFilter === "form" || singleInlineFilter === "form") &&
              enabledFilters.includes("form") && (
                <div
                  className="flex min-w-[200px] flex-col"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  {singleInlineFilter === "form" && (
                    <label className="mb-1 text-[11px] text-muted-foreground">
                      {singleFilterLabelMap.form}
                    </label>
                  )}
                  <FormDDLForReport
                    isMulti={!isRawDataReport}
                    value={selectedFormNames}
                    onChange={setSelectedFormNames}
                    shouldOpen={activeFilter === "form" && shouldOpenDropdown}
                    onOpened={() => setShouldOpenDropdown(false)} // reset after open
                  />
                </div>
              )}

            {(activeFilter === "organization" ||
              singleInlineFilter === "organization") &&
              enabledFilters.includes("organization") && (
                <div
                  className="flex min-w-[200px] flex-col"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  {singleInlineFilter === "organization" && (
                    <label className="mb-1 text-[11px] text-muted-foreground">
                      {singleFilterLabelMap.organization}
                    </label>
                  )}
                  <OrgTreeDropDownReport
                    isMulti
                    selected={selectedOrganizations}
                    onChange={setSelectedOrganizations}
                    shouldOpen={
                      activeFilter === "organization" && shouldOpenDropdown
                    }
                    onOpened={() => setShouldOpenDropdown(false)} // reset after open
                  />
                </div>
              )}

            {(activeFilter === "agent" || singleInlineFilter === "agent") &&
              enabledFilters.includes("agent") && (
                <div
                  className="flex min-w-[200px] flex-col"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  {singleInlineFilter === "agent" && (
                    <label className="mb-1 text-[11px] text-muted-foreground">
                      {singleFilterLabelMap.agent}
                    </label>
                  )}
                  <AgentDDL
                    isMulti
                    value={selectedAgents}
                    onChange={setSelectedAgents}
                    shouldOpen={activeFilter === "agent" && shouldOpenDropdown}
                    onOpened={() => setShouldOpenDropdown(false)} // reset after open
                  />
                </div>
              )}

            {(activeFilter === "role" || singleInlineFilter === "role") &&
              enabledFilters.includes("role") && (
                <div
                  className="flex min-w-[240px] flex-col"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  {singleInlineFilter === "role" && (
                    <label className="mb-1 text-[11px] text-muted-foreground">
                      {singleFilterLabelMap.role}
                    </label>
                  )}
                  <RoleMultiSelect
                    roles={roles}
                    selectedRoles={selectedRoles}
                    onChange={(selected) => setSelectedRoles(selected || [])}
                    error={null}
                    enforceAgentExclusivity={false}
                    placeholder="Select roles"
                    usePortalMenu={true}
                  />
                </div>
              )}

            {(activeFilter === "action" || singleInlineFilter === "action") &&
              enabledFilters.includes("action") && (
                <div
                  className="flex min-w-[200px] flex-col"
                  onMouseEnter={() => setDropdownActive(true)}
                  onMouseLeave={() => setDropdownActive(false)}
                >
                  {singleInlineFilter === "action" && (
                    <label className="mb-1 text-[11px] text-muted-foreground">
                      {singleFilterLabelMap.action}
                    </label>
                  )}
                  <select
                    className="border border-border px-3 py-1.5 rounded-md text-xs w-full"
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                  >
                    <option value="">All Actions</option>
                    {actionOptions.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>
        </div>

        {/* RIGHT: Action Buttons */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleViewReport}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-xs hover:bg-green-700"
          >
            View Report
          </button>
          <button
            onClick={handleResetFilters}
            className="bg-gray-300 text-foreground px-4 py-1.5 rounded text-xs hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary of Selected Filters */}
      <div className="flex flex-col text-xs text-foreground gap-1 mt-0">
        {/* {selectedFormNames.length > 0 && (
          <div>
            <strong>Forms:</strong>{" "}
            {selectedFormNames
              .slice(0, 3)
              .map((f) => f.label)
              .join(", ")}
            {selectedFormNames.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("form")}
                onClick={() => {
                  setActiveFilter("form");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedFormNames.length - 3} more
              </span>
            )}
          </div>
        )} */}
        {selectedFormNames &&
          (Array.isArray(selectedFormNames)
            ? selectedFormNames.length > 0
            : true) && (
            <div>
              <strong>Forms:</strong>{" "}
              {Array.isArray(selectedFormNames)
                ? selectedFormNames
                    .slice(0, 3)
                    .map((f) => f.label)
                    .join(", ")
                : selectedFormNames.label}
              {Array.isArray(selectedFormNames) &&
                selectedFormNames.length > 3 && (
                  <span
                    className="ml-1 text-primary underline cursor-pointer"
                    onClick={() => {
                      setActiveFilter("form");
                      setShouldOpenDropdown(true);
                    }}
                  >
                    +{selectedFormNames.length - 3} more
                  </span>
                )}
            </div>
          )}
        {selectedOrganizations.length > 0 && (
          <div>
            <strong>Organizations:</strong>{" "}
            {selectedOrganizations
              .slice(0, 3)
              .map((o) => o.label)
              .join(", ")}
            {selectedOrganizations.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("organization")}
                onClick={() => {
                  setActiveFilter("organization");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedOrganizations.length - 3} more
              </span>
            )}
          </div>
        )}

        {selectedAgents.length > 0 && (
          <div>
            <strong>Agents:</strong>{" "}
            {selectedAgents
              .slice(0, 3)
              .map((a) => a.label)
              .join(", ")}
            {selectedAgents.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                // onClick={() => setActiveFilter("agent")}
                onClick={() => {
                  setActiveFilter("agent");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedAgents.length - 3} more
              </span>
            )}
          </div>
        )}

        {selectedRoles.length > 0 && (
          <div>
            <strong>Roles:</strong>{" "}
            {selectedRoles
              .slice(0, 3)
              .map((r) => r.label)
              .join(", ")}
            {selectedRoles.length > 3 && (
              <span
                className="ml-1 text-primary underline cursor-pointer"
                onClick={() => {
                  setActiveFilter("role");
                  setShouldOpenDropdown(true);
                }}
              >
                +{selectedRoles.length - 3} more
              </span>
            )}
          </div>
        )}

        {selectedAction && (
          <div>
            <strong>Action:</strong> {selectedAction}
          </div>
        )}
      </div>
    </>
  );
};

export default withAuth(ReportFilters);
