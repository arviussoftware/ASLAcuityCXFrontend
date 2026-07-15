// ConfigurationTable.jsx
// Reusable table component for displaying Verint configurations

import { Settings2, Plus } from "lucide-react";

export function ConfigurationCard({ config, onEdit }) {
  const displayTitle =
    config.instanceName || config.ruleName || config.processName || "Untitled Configuration";
  const displayHost = config.hostName || config.baseUrl || "Not configured";
  const displayTimeZone = config.timeZone || "No timezone set";
  const filterCount = config.filters?.length || 0;
  const displayStatus = displayHost !== "Not configured" ? "Configured" : "Draft";
  const initials = (config.platformName || "VE").slice(0, 2).toUpperCase();

  const displayMetadataType =
    config.metadataType === "CALL_WISE"
      ? "Call"
      : config.metadataType === "DAY_WISE"
        ? "Day"
        : "--";

  const displaySendFile = config.sendFileChannel || "--";

  const displayStartDate = config.startDate
    ? new Date(config.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "No date";

  return (
    <tr
      className="cursor-pointer border-b border-[#edf2f8] bg-white transition-colors hover:bg-[#f7fbff]"
      onClick={() => onEdit(config)}
    >
      {/* Instance */}
      <td className="px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe8f8] bg-[#f4f9ff] text-[11px] font-bold text-[#185FA5]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#162033]">{displayTitle}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#7a8aa2]">
                {config.platformName || "VERINT"}
              </p>
            </div>
          </div>
        </div>
      </td>

      {/* Base URL */}
      <td className="px-4 py-3.5">
        <div className="max-w-[250px]">
          <p className="truncate text-sm font-medium text-[#223047]">{displayHost}</p>
          <p className="mt-0.5 text-[11px] text-[#7a8aa2]">Endpoint</p>
        </div>
      </td>

      {/* Time Zone */}
      <td className="px-4 py-3.5 text-sm font-medium text-[#314056]">{displayTimeZone}</td>

      {/* Metadata */}
      <td className="px-4 py-3.5">
        <span className="inline-flex rounded-md border border-[#e4eaf3] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#4a5c73]">
          {displayMetadataType}
        </span>
      </td>

      {/* Filters */}
      <td className="px-4 py-3.5">
        <span className="inline-flex min-w-[32px] justify-center rounded-md border border-[#dbe8f8] bg-[#f4f9ff] px-2.5 py-1 text-[11px] font-semibold text-[#185FA5]">
          {filterCount}
        </span>
      </td>

      {/* Send File Channel */}
      <td className="px-4 py-3.5 text-sm font-medium text-[#314056]">{displaySendFile}</td>

      {/* Start Date */}
      <td className="px-4 py-3.5 text-sm text-[#314056]">{displayStartDate}</td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            displayStatus === "Configured"
              ? "border border-[#d8ebc3] bg-[#eef8e2] text-[#47751f]"
              : "border border-[#f0dfb5] bg-[#fff6df] text-[#946200]"
          }`}
        >
          {displayStatus}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-3.5 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(config);
          }}
          className="inline-flex items-center rounded-lg border border-[#d7e6fb] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#185FA5] transition-colors hover:border-[#1a76d1] hover:bg-[#f5faff]"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

/**
 * ConfigurationTable
 *
 * Props:
 *   configurations  {object[]}  — array of saved configuration objects
 *   loading         {boolean}   — show skeleton rows while fetching
 *   onEdit          {fn}        — called with a config when user clicks Edit / row
 *   onAdd           {fn}        — called when user clicks "Add Configuration"
 */
export function ConfigurationTable({ configurations = [], loading = false, onEdit, onAdd }) {
  const HEADINGS = [
    "Instance",
    "Base URL",
    "Time Zone",
    "Metadata",
    "Filters",
    "Channel",
    "Start Date",
    "Status",
    "Action",
  ];

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_12px_28px_rgba(17,39,82,0.08)]">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="grid grid-cols-9 gap-3 border-b border-[#eef3f8] px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: 9 }).map((_, col) => (
              <div key={col} className="h-4 animate-pulse rounded bg-[#eef3f8]" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (configurations.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#cfe0f5] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-8 py-16 text-center shadow-[0_14px_36px_rgba(17,39,82,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#d6e5fb] bg-white shadow-sm">
          <Settings2 className="h-7 w-7 text-[#1a76d1]" />
        </div>
        <p className="mt-5 text-xl font-semibold text-gray-900">No configurations added yet</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
          Create your first Verint configuration and it will appear here as a polished editable
          card on this same page.
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#1a76d1] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2C2D3F]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Configuration
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e1f0] bg-white shadow-[0_14px_34px_rgba(17,39,82,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[linear-gradient(180deg,#fcfdff_0%,#f4f8fd_100%)]">
            <tr className="border-b border-[#e9eef6]">
              {HEADINGS.map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6f8198]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {configurations.map((config) => (
              <ConfigurationCard key={config.id} config={config} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}