// app/dashboard/interactions/page.jsx
"use client";
import CryptoJS from "crypto-js";
import { X } from "lucide-react";
import React, { Suspense } from "react";
import {
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { RiDownloadFill } from "react-icons/ri";
import { useDownloadJob } from "@/components/downloadJobProvider";
import { FaSearch } from "react-icons/fa";
import { HiMiniInformationCircle } from "react-icons/hi2";
import { notFound, useRouter } from "next/navigation";
import InteractionPlayer from "@/components/interaction-player-modal";
import AgentDDL from "@/components/agentDDL";
import InstanceNameDDL from "@/components/instanceNameDDL";
//import PlatformDDL from "@/components/platformDDL";
import ChannelTypeDDL from "@/components/channelTypeDDL";
import ChannelTypeIcon from "@/components/channelTypeIcon";
import withAuth from "@/components/withAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Select, { components } from "react-select";
import { DataTable } from "@/components/dataTable/data-table";
import DatePickerWithRange from "@/components/date-range-picker";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/dataTable/data-table-pagination";
import FormDDLForReport from "@/components/formDDL";
import EvaluatorDDL from "@/components/evaluatorDDL";
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions";
import {
  normalizeSavedColumnOrder,
  TABLE_PREFERENCE_PAGE_KEYS,
} from "@/lib/table-preferences";
import {
  loadUserTablePreference,
  saveUserTablePreference,
} from "@/lib/user-table-preferences-client";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const INTERACTION_DATE_FIELDS = new Set([
  "audioStartTime",
  "audioEndTime",
  "localStartTime",
  "localEndTime",
  "audio_start_time",
  "audio_end_time",
  "local_start_time",
  "local_end_time",
]);

const MASKED_INTERACTION_PHONE_FIELDS = new Set(["ani", "dnis", "dnis_code"]);

const INTERACTION_DEFAULT_VISIBLE_COLUMNS = new Set([
  "audioStartTime",
  "audio_start_time",
  "audioEndTime",
  "audio_end_time",
  "agentId",
  "agent_id",
  "personalName",
  "personal_name",
  "extension",
  "callId",
  "call_id",
  "ani",
  "dnis",
  "dnis_code",
  "duration",
  "direction",
  "platformName",
  "PlatformName",
  "platform_name",
  "Platform Name",
  "instanceName",
  "InstanceName",
  "instance_name",
  "Instance Name",
  "channeltype",
  "channelType",
  "Channel Type",
  "evaluation_date",
  "form_name",
  "organizationName",
  "user_full_name",
  "EvaluationCount",
]);

const MAX_INTERACTION_BULK_DOWNLOAD = Number(
  process.env.NEXT_PUBLIC_MAX_EXPORT_LIMIT || 2000,
);

const formatInteractionColumnTitle = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const padDatePart = (value) => String(value).padStart(2, "0");

const formatDateTimeForApi = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())} ${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}:${padDatePart(value.getSeconds())}`;
};

const formatRecentSearchDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatRecentSearchRange = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatInteractionDateRangeLabel = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return "selected date range";
  }

  const formatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return `${startDate.toLocaleString("en-IN", formatOptions)} to ${endDate.toLocaleString(
    "en-IN",
    formatOptions,
  )}`;
};

const formatDateForFileName = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString().slice(0, 10);
};

const buildBulkDownloadArchiveFileName = ({
  startDate,
  endDate,
  downloadType,
}) =>
  `Interactions_${formatDateForFileName(startDate)}_${formatDateForFileName(
    endDate,
  )}_${downloadType}_${Date.now()}.zip`;

const getInteractionNumericId = (row = {}) =>
  row.interactionId ?? row.interaction_id ?? row.id ?? null;

const getInteractionDisplayCallId = (row = {}) =>
  row.callId ?? row.call_id ?? getInteractionNumericId(row);

const resolveInteractionFileSourceType = (
  fileSourceType,
  fileLocation = "",
) => {
  const normalized = String(fileSourceType || "")
    .trim()
    .toLowerCase();
  if (String(fileLocation || "").startsWith("s3://")) return "aws-s3";
  if (normalized === "3" || normalized === "aws-s3") return "aws-s3";
  return normalized;
};

const isAwsS3InteractionFile = (fileLocation, fileSourceType) =>
  resolveInteractionFileSourceType(fileSourceType, fileLocation) === "aws-s3";

const getInteractionRestoreKey = ({ interactionId, fileLocation }) =>
  `${interactionId || ""}::${fileLocation || ""}`;

const buildDefaultInteractionDateRange = (dayRange = 30) => {
  const end = new Date();
  end.setHours(23, 59, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (dayRange - 1));
  start.setHours(0, 0, 0, 0);

  return { startDate: start, endDate: end };
};
const maskInteractionPhoneValue = (value) => {
  const stringValue = String(value);
  return `*****${stringValue.slice(-4)}`;
};

const formatInteractionCellValue = (key, value) => {
  if (value == null || value === "") {
    return "-";
  }
  if (MASKED_INTERACTION_PHONE_FIELDS.has(key)) {
    return maskInteractionPhoneValue(value);
  }
  if (INTERACTION_DATE_FIELDS.has(key)) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return String(value);
};

const isChannelTypeColumn = (key) =>
  key === "channeltype" || key === "channelType" || key === "Channel Type";

const getInteractionCellWidthClass = (key) => {
  if (key === "callId" || key === "call_id" || key === "ucid") {
    return "w-[220px]";
  }

  if (
    key === "organizationName" ||
    key === "personalName" ||
    key === "personal_name" ||
    key === "instanceName" ||
    key === "Instance Name" ||
    key === "agentId" ||
    key === "agent_id"
  ) {
    return "w-[160px]";
  }

  return "w-[130px]";
};

const shouldTruncateInteractionCell = (key) =>
  !INTERACTION_DATE_FIELDS.has(key) &&
  !isChannelTypeColumn(key) &&
  key !== "duration" &&
  key !== "direction";

const renderInteractionCellContent = (key, value) => {
  const formattedValue = formatInteractionCellValue(key, value);

  if (!shouldTruncateInteractionCell(key)) {
    return formattedValue;
  }

  return (
    <div className="group relative">
      <div
        className="truncate whitespace-nowrap overflow-hidden"
        title={formattedValue}
      >
        {formattedValue}
      </div>
      <div className="pointer-events-none absolute bottom-full left-0 z-[9999] mb-1 hidden max-w-[360px] whitespace-normal break-words rounded bg-black px-2 py-1 text-white shadow-lg group-hover:block">
        {formattedValue}
      </div>
    </div>
  );
};

const buildDynamicInteractionColumns = (rows = []) => {
  const firstRow = rows[0];

  if (!firstRow) {
    return [];
  }

  const allKeys = Object.keys(firstRow).filter((key) => key !== "action");

  const channelTypeKeys = allKeys.filter((key) => isChannelTypeColumn(key));
  const otherKeys = allKeys.filter((key) => !isChannelTypeColumn(key));

  const orderedKeys = [...otherKeys, ...channelTypeKeys];

  const dynamicColumns = orderedKeys.map((key) => ({
    accessorKey: key,
    headerTitle: formatInteractionColumnTitle(key),
    cell: ({ row }) => (
      <div
        className={`${getInteractionCellWidthClass(key)} p-1 overflow-hidden`}
        style={{ fontSize: "10px" }}
      >
        {isChannelTypeColumn(key) ? (
          <div className="flex items-center justify-center">
            <ChannelTypeIcon channelType={row.getValue(key)} />
          </div>
        ) : (
          renderInteractionCellContent(key, row.getValue(key))
        )}
      </div>
    ),
    filterFn: "includesString",
  }));

  return [
    ...dynamicColumns,
    {
      id: "action",
      enableHiding: false,
      headerTitle: "Actions",
      header: () => (
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2">
          Actions
        </div>
      ),
      cell: ({ row, table }) => {
        const fileLocation =
          row.original?.fileLocation ?? row.original?.file_location ?? null;
        const fileSourceType =
          row.original?.fileSourceType ?? row.original?.file_source_type;
        const interactionId = getInteractionNumericId(row.original);
        const callId = getInteractionDisplayCallId(row.original);
        const isAvailable = Boolean(fileLocation);
        const isS3 = isAwsS3InteractionFile(fileLocation, fileSourceType);
        const restoreKey = getInteractionRestoreKey({
          interactionId,
          fileLocation,
        });
        const restoreState =
          table.options.meta?.glacierStatuses?.[restoreKey]?.status;
        const isRestoreLoading = Boolean(
          table.options.meta?.glacierLoading?.[restoreKey],
        );
        const effectiveStatus = isS3
          ? restoreState || "loading"
          : "retrieved";
        const statusVal = String(effectiveStatus || "").trim().toLowerCase();
        const canPlay =
          isAvailable &&
          (statusVal === "retrieved" || statusVal === "standard");
        const canRestore =
          isAvailable &&
          isS3 &&
          !isRestoreLoading &&
          (statusVal === "needs_retrieval" || statusVal === "unsupported");
        const isRestoring =
          isRestoreLoading ||
          statusVal === "retrieving" ||
          statusVal === "initiated" ||
          statusVal === "in_progress" ||
          statusVal === "restore_in_progress";
        const isLoadingStatus = isS3 && statusVal === "loading";
        const infoText = !isAvailable
          ? "Audio not available"
          : !isS3
            ? "This recording is available for immediate playback."
            : (statusVal === "retrieved" || statusVal === "standard")
              ? "This Glacier recording is restored and ready to play."
              : isRestoring
                ? "Restore is in progress. Glacier Deep Archive usually takes 12 to 48 hours."
                : "Restore this Glacier recording before playback.";

        return (
          <div className="flex items-center gap-2 px-2 py-1">
            <DataTableRowActions row={row} tableType="interaction" />
            {isLoadingStatus ? (
              <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                Checking...
              </div>
            ) : canPlay ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  table.options.meta?.onPlayAudio?.({
                    interactionId,
                    callId,
                    fileLocation,
                    fileSourceType,
                  });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted hover:bg-primary hover:text-white hover:border-primary transition-all text-[10px] font-medium whitespace-nowrap"
                title={`Play interaction ${callId}`}
              >
                <Play className="h-3 w-3" />
                Play
              </button>
            ) : (
              <button
                type="button"
                disabled={!canRestore}
                // onClick={(e) => {
                //   e.stopPropagation();
                //   if (!canRestore) return;
                //   table.options.meta?.onRestoreAudio?.({
                //     interactionId,
                //     callId,
                //     fileLocation,
                //     fileSourceType,
                //   });
                // }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canRestore) return;
                  table.options.meta?.onRestoreAudio?.({
                    interactionId,
                    callId,
                    fileLocation,
                    fileSourceType,
                  });
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all text-[10px] font-medium whitespace-nowrap ${
                  canRestore
                    ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "border-border bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
                }`}
                title={infoText}
              >
                {isRestoring ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                {isRestoring ? "Restoring" : "Restore"}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title={infoText}
            >
              <HiMiniInformationCircle className="h-4 w-4" />
              <span className="sr-only">{infoText}</span>
            </button>
          </div>
        );
      },
    },
  ];
};

const getInteractionRowId = (row, index = 0) => {
  if (row?.FormUniqueId) {
    return String(row.FormUniqueId);
  }

  if (row?.id != null && (row?.callId || row?.call_id)) {
    return `${row.callId || row.call_id}-${row.id}`;
  }

  if (row?.interactionId) {
    return String(row.interactionId);
  }

  if (row?.callId || row?.call_id) {
    return String(row.callId || row.call_id);
  }

  return `interaction-row-${index}`;
};

const filterLabels = {
  callId: "Call ID",
  ucid: "UCID",
  extensions: "Extension",
  organizationName: "Organization",
  agent: "Agent",
  agentName: "Agent Name",
  instanceName: "Instance Name",
  //platformIds: "Platform Name",
  channelType: "Channel Type",
  callDuration: "Call Duration",
  aniDni: "ANI/DNIS",
};
const filterTitles = {
  aniDni: "ANI/DNIS",
};
const filterPlaceholders = {
  aniDni: "Enter ANI/DNIS",
};

const normalizeSearchStatus = (statusValue) => String(statusValue ?? "0");

const getSearchTypeFromPayload = (payload = {}) =>
  payload.searchType ||
  (normalizeSearchStatus(payload.status) === "1"
    ? "evaluation"
    : "interaction");

const formatHistoryFilterList = (payload = {}) => {
  const filters = payload.filters || {};
  const filterList = [];

  if (filters.callId) filterList.push(`Call ID: ${filters.callId}`);
  if (filters.aniDni) filterList.push(`ANI/DNIS: ${filters.aniDni}`);
  if (filters.extensions) filterList.push(`Ext: ${filters.extensions}`);
  if (filters.ucid) filterList.push(`UCID: ${filters.ucid}`);
  if (filters.agent) filterList.push(`Agent: ${filters.agent}`);
  if (filters.organizationName)
    filterList.push(`Org: ${filters.organizationName}`);
  if (filters.agentName) filterList.push(`Agent Name: ${filters.agentName}`);
  if (filters.instanceName)
    filterList.push(`Instance Name: ${filters.instanceName}`);
  //if (filters.platformIds) filterList.push(`Platform: ${filters.platformIds}`);
  if (filters.channelType)
    filterList.push(`Channel Type: ${filters.channelType}`);
  if (filters.callDuration) {
    filterList.push(`Duration: ${filters.callDuration}`);
  } else if (payload.durationOperator && payload.durationValue) {
    const dur2 = payload.durationValue2 ? ` - ${payload.durationValue2}` : "";
    filterList.push(
      `Duration: ${payload.durationOperator} ${payload.durationValue}${dur2} sec`,
    );
  }

  return filterList;
};

const INTERACTION_LIST_VIEW_STATE_KEY = "interactionListViewState";

const readInteractionListViewState = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = sessionStorage.getItem(INTERACTION_LIST_VIEW_STATE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to read interaction list view state:", error);
    return null;
  }
};

function flattenTreeToGroups(tree) {
  const groups = [];

  const traverse = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      groups.push({
        value: node.id || node.organizationId,

        label: `${" ".repeat(depth * 2)}${node.organizationName || node.name}`,

        isDisabled: !node.isActive,
      });

      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  };

  traverse(tree);
  return groups;
}

function getAllDescendants(node) {
  let result = [{ value: node.id, label: node.name }];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      result = result.concat(getAllDescendants(child));
    }
  }
  return result;
}

function findNodeById(tree, id) {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

const customStyles = {
  option: (provided, { data, isDisabled, isFocused }) => ({
    ...provided,
    paddingLeft: `${data.label?.split(" ").length * 10 || 10}px`,
    padding: "8px 12px",
    fontSize: "0.75rem",
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
    zIndex: 100,
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: 300,
  }),
  control: (provided) => ({
    ...provided,
    borderColor: "hsl(var(--border))",
    boxShadow: "none",
    borderRadius: "0.275rem",
    minHeight: "34px",
    height: "34px",
    "&:hover": {
      borderColor: "hsl(var(--ring))",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
    color: "hsl(var(--muted-foreground))",
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
};

const interactionDefaultVisibility = {};

const FloatingPlayer = ({ nowPlaying, audioRef, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [nowPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.paused ? audio.play() : audio.pause();
  };

  const handleSeek = (e) => {
    if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
  };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  if (!nowPlaying) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border shadow-2xl px-6 py-3 flex items-center gap-4">
      <button
        onClick={togglePlay}
        className="p-2 rounded-full bg-primary text-white hover:opacity-80 transition shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      <div className="flex flex-col shrink-0 min-w-0">
        <span className="text-xs font-semibold">
          Call ID: {nowPlaying.callId}
        </span>
        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
          {nowPlaying.fileLocation}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <span className="text-[10px] text-muted-foreground shrink-0">
          {fmt(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
        <span className="text-[10px] text-muted-foreground shrink-0">
          {fmt(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          className="w-20 h-1 accent-primary cursor-pointer"
        />
      </div>

      <button
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }
          onClose();
        }}
        className="p-1 rounded-full hover:bg-muted transition shrink-0"
        title="Close player"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const InteractionPage = () => {
  const router = useRouter();
  const initialListViewStateRef = useRef(readInteractionListViewState());
  const initialListViewState = initialListViewStateRef.current;
  const [count, setCount] = useState(initialListViewState?.count || 0);
  const organizationTreeRaw = useRef([]);
  const abortControllerRef = useRef(null);
  const restoreToastTimeoutRef = useRef(null);
  const preDateFilterRange = useRef(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    initialListViewState?.currentPage || 1,
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    initialListViewState?.itemsPerPage || 10,
  );
  const [interactions, setInteractions] = useState(
    initialListViewState?.interactions || [],
  );
  const [currentFilter, setCurrentFilter] = useState(null);
  const [draftColumnFilters, setDraftColumnFilters] = useState(
    initialListViewState?.draftColumnFilters || {},
  );
  const [hasSearched, setHasSearched] = useState(
    Boolean(initialListViewState?.hasSearched),
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [noAudioOpen, setNoAudioOpen] = useState(false);
  const [restoreToast, setRestoreToast] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedInteractionId, setSelectedInteractionId] = useState(null);
  const [selectedInteractionMeta, setSelectedInteractionMeta] = useState(null);
  const [lastDownloadCount, setLastDownloadCount] = useState(0);
  const [agentNameOptions, setAgentNameOptions] = useState(
    initialListViewState?.agentNameOptions || [],
  );
  const [tempAgentNameOptions, setTempAgentNameOptions] = useState(
    initialListViewState?.agentNameOptions || [],
  );
  const [instanceNameOptions, setInstanceNameOptions] = useState(
    initialListViewState?.instanceNameOptions || [],
  );
  const [tempInstanceNameOptions, setTempInstanceNameOptions] = useState(
    initialListViewState?.instanceNameOptions || [],
  );
  const [platformOptions, setPlatformOptions] = useState(
    initialListViewState?.platformOptions || [],
  );
  const [tempPlatformOptions, setTempPlatformOptions] = useState(
    initialListViewState?.platformOptions || [],
  );
  const [channelTypeOptions, setChannelTypeOptions] = useState(
    initialListViewState?.channelTypeOptions || [],
  );
  const [tempChannelTypeOptions, setTempChannelTypeOptions] = useState(
    initialListViewState?.channelTypeOptions || [],
  );
  const [filtersPending, setFiltersPending] = useState(false);
  const [durationOperator, setDurationOperator] = useState(
    initialListViewState?.durationOperator || ">",
  );
  const [durationValue, setDurationValue] = useState(
    initialListViewState?.durationValue
      ? String(initialListViewState.durationValue)
      : "",
  );
  const [durationValue2, setDurationValue2] = useState(
    initialListViewState?.durationValue2
      ? String(initialListViewState.durationValue2)
      : "",
  );
  const [tempDurationOperator, setTempDurationOperator] = useState(
    initialListViewState?.durationOperator || ">",
  );
  const [tempDurationValue, setTempDurationValue] = useState(
    initialListViewState?.durationValue
      ? String(initialListViewState.durationValue)
      : "",
  );
  const [tempDurationValue2, setTempDurationValue2] = useState(
    initialListViewState?.durationValue2
      ? String(initialListViewState.durationValue2)
      : "",
  );
  const [columnVisibility, setColumnVisibility] = useState(
    initialListViewState?.columnVisibility || interactionDefaultVisibility,
  );
  const [columnOrder, setColumnOrder] = useState(
    initialListViewState?.columnOrder || [],
  );
  const [tablePreferenceHydrated, setTablePreferenceHydrated] = useState(
    Boolean(initialListViewState),
  );
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const [selectedInteractionIds, setSelectedInteractionIds] = useState(
    initialListViewState?.selectedInteractionIds || {},
  );
  const [modalSearchValue, setModalSearchValue] = useState("");
  const [grantedPrivileges, setGrantedPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [columnSearchValues, setColumnSearchValues] = useState(
    initialListViewState?.columnSearchValues || {},
  );
  const [allowedExportTypes, setAllowedExportTypes] = useState([]);
  const [tempSelectedOptions, setTempSelectedOptions] = useState(
    initialListViewState?.selectedDropdownOptions || [],
  );
  const [selectedRowsMap, setSelectedRowsMap] = useState(
    initialListViewState?.selectedRowsMap || {},
  );
  const [tableKey, setTableKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [organizationTreeOptions, setOrganizationTreeOptions] = useState([]);
  const [selectedDropdownOptions, setSelectedDropdownOptions] = useState(
    initialListViewState?.selectedDropdownOptions || [],
  );
  const [dateRange, setDateRange] = useState({
    startDate: initialListViewState?.dateRange?.startDate
      ? new Date(initialListViewState.dateRange.startDate)
      : null,
    endDate: initialListViewState?.dateRange?.endDate
      ? new Date(initialListViewState.dateRange.endDate)
      : null,
  });
  const status = "0";
  const [skipNextIgnoreDateAutoExpand, setSkipNextIgnoreDateAutoExpand] =
    useState(false);
  const [formOptions, setFormOptions] = useState(
    initialListViewState?.formOptions || [],
  );
  const [tempFormOptions, setTempFormOptions] = useState(
    initialListViewState?.formOptions || [],
  );
  const [evaluatorOptions, setEvaluatorOptions] = useState(
    initialListViewState?.evaluatorOptions || [],
  );
  const [tempEvaluatorOptions, setTempEvaluatorOptions] = useState(
    initialListViewState?.evaluatorOptions || [],
  );
  const [nowPlaying, setNowPlaying] = useState(null);
  const [glacierStatuses, setGlacierStatuses] = useState({});
  const [glacierLoading, setGlacierLoading] = useState({});

  const [glacierPreflight, setGlacierPreflight] = useState(null);
  const [isRestoringBulk, setIsRestoringBulk] = useState(false);
  const [glacierInfoOpen, setGlacierInfoOpen] = useState(false);
  const audioRef = useRef(null);
  const currentTablePreferencePageKey =
    normalizeSearchStatus(status) === "1"
      ? TABLE_PREFERENCE_PAGE_KEYS.EVALUATIONS
      : TABLE_PREFERENCE_PAGE_KEYS.INTERACTIONS;
  const durationFilterRef = useRef({
    operator: initialListViewState?.durationOperator || ">",
    value: initialListViewState?.durationValue
      ? String(initialListViewState.durationValue)
      : "",
    value2: initialListViewState?.durationValue2
      ? String(initialListViewState.durationValue2)
      : "",
  });
  const persistInteractionListViewState = useCallback(
    (overrides = {}) => {
      if (typeof window === "undefined") return;

      const baseState = {
        interactions,
        count,
        currentPage,
        itemsPerPage,
        dateRange: {
          startDate: dateRange.startDate
            ? dateRange.startDate.toISOString()
            : null,
          endDate: dateRange.endDate ? dateRange.endDate.toISOString() : null,
        },
        draftColumnFilters,
        columnSearchValues,
        selectedDropdownOptions,
        agentNameOptions,
        instanceNameOptions,
        platformOptions,
        channelTypeOptions,
        formOptions,
        evaluatorOptions,
        durationOperator,
        durationValue,
        durationValue2,
        status: normalizeSearchStatus(status),
        hasSearched,
        columnVisibility,
        columnOrder,
        selectedInteractionIds,
        selectedRowsMap,
        scrollY: window.scrollY,
      };

      sessionStorage.setItem(
        INTERACTION_LIST_VIEW_STATE_KEY,
        JSON.stringify({
          ...baseState,
          ...overrides,
        }),
      );
    },
    [
      interactions,
      count,
      currentPage,
      itemsPerPage,
      dateRange,
      draftColumnFilters,
      columnSearchValues,
      selectedDropdownOptions,
      agentNameOptions,
      instanceNameOptions,
      platformOptions,
      channelTypeOptions,
      formOptions,
      evaluatorOptions,
      durationOperator,
      durationValue,
      durationValue2,
      status,
      hasSearched,
      columnVisibility,
      columnOrder,
      selectedInteractionIds,
      selectedRowsMap,
    ],
  );

  const resetSelections = () => {
    setSelectedInteractionIds({});
    setSelectedRowsMap({});
    setTableKey((prev) => prev + 1);
  };

  const hasPrivilege = (privId) =>
    grantedPrivileges.some((p) => p.PrivilegeId === privId);

  const { downloadJob, startDownloadJob, cancelDownloadJob } = useDownloadJob();

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 6,
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) {
          console.warn("Failed to fetch privileges: response not ok");
          setPrivilegesLoaded(true);
          return;
        }
        const data = await response.json();

        setGrantedPrivileges(data.privileges || []);
        console.log(
          "privileges: Array(" + (data.privileges || []).length + ")",
        );
        setAllowedExportTypes(getExportTypes(data.privileges || []));
        setPrivilegesLoaded(true);
      } catch (err) {
        console.warn("Error fetching privileges:", err);
        setPrivilegesLoaded(true);
      }
    };

    fetchPrivileges();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

        const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
        let timezone = null;
        if (encryptedTimezone) {
          const tzBytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          timezone = JSON.parse(tzBytes.toString(CryptoJS.enc.Utf8));
        }

        const res = await fetch("/api/interactions/searchHistory", {
          headers: {
            loggedInUserId: user.userId,
            timezone: timezone,
            activeStatus: normalizeSearchStatus(status),
          },
        });
        const data = await res.json();
        setSearchHistory(data.history || []);
      } catch (_) {}
    };

    fetchHistory();
  }, [status]);

  const getExportTypes = (privileges) => {
    const types = [];
    if (privileges.some((p) => p.PrivilegeId === 4)) types.push("excel");
    if (privileges.some((p) => p.PrivilegeId === 14)) types.push("csv");
    if (privileges.some((p) => p.PrivilegeId === 15)) types.push("pdf");
    return types;
  };

  const GLACIER_STATUS_CHUNK = 100; // matches server-side cap

  const checkGlacierStatuses = useCallback(async (rows) => {
    const items = rows
      .map((row) => {
        const fileLocation = row?.fileLocation ?? row?.file_location ?? null;
        const fileSourceType = row?.fileSourceType ?? row?.file_source_type;
        const interactionId = getInteractionNumericId(row);
        return { row, fileLocation, fileSourceType, interactionId };
      })
      .filter((x) => x.fileLocation);

    const ready = [];
    const retrieving = [];
    const needsRestore = [];
    const unavailable = [];

    const s3Items = items.filter((x) =>
      isAwsS3InteractionFile(x.fileLocation, x.fileSourceType),
    );
    items
      .filter((x) => !isAwsS3InteractionFile(x.fileLocation, x.fileSourceType))
      .forEach((x) => ready.push(x.row));

    const statusByKey = {};
    const nextStatuses = {};
    for (let i = 0; i < s3Items.length; i += GLACIER_STATUS_CHUNK) {
      const chunk = s3Items.slice(i, i + GLACIER_STATUS_CHUNK);
      try {
        const response = await fetch("/api/interactions/glacierStatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({
            action: "status",
            items: chunk.map((x) => ({
              interactionId: x.interactionId,
              filePath: x.fileLocation,
              fileSourceType: x.fileSourceType,
            })),
          }),
        });
        const data = await response.json().catch(() => ({}));
        (data.statuses || []).forEach((s) => {
          const key = getInteractionRestoreKey({
            interactionId: s.interactionId,
            fileLocation: s.filePath,
          });
          statusByKey[key] = s.status;
          nextStatuses[key] = s;
        });
      } catch (err) {
        console.error("Glacier status batch check failed:", err);
      }
    }

    if (Object.keys(nextStatuses).length > 0) {
      setGlacierStatuses((prev) => ({ ...prev, ...nextStatuses }));
    }

    s3Items.forEach((x) => {
      const key = getInteractionRestoreKey({
        interactionId: x.interactionId,
        fileLocation: x.fileLocation,
      });
      const s = statusByKey[key];
      if (s === "retrieved" || s === "standard") ready.push(x.row);
      else if (s === "retrieving" || s === "initiated" || s === "in_progress") retrieving.push(x.row);
      else if (s === "unsupported") unavailable.push(x.row);
      else needsRestore.push(x.row); // needs_retrieval / unknown / error
    });

    return { ready, retrieving, needsRestore, unavailable };
  }, []);

  const refreshGlacierStatuses = useCallback(
    async (rows = interactions) => {
      const items = rows
        .map((row) => {
          const fileLocation = row?.fileLocation ?? row?.file_location ?? null;
          const fileSourceType = row?.fileSourceType ?? row?.file_source_type;
          const interactionId = getInteractionNumericId(row);

          if (
            !fileLocation ||
            !interactionId ||
            !isAwsS3InteractionFile(fileLocation, fileSourceType)
          ) {
            return null;
          }

          return {
            interactionId,
            filePath: fileLocation,
            fileSourceType,
          };
        })
        .filter(Boolean);

      if (!items.length) return;

      try {
        const response = await fetch("/api/interactions/glacierStatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ action: "status", items }),
        });

        if (!response.ok) return;

        const data = await response.json();
        const nextStatuses = {};
        (data.statuses || []).forEach((item) => {
          const key = getInteractionRestoreKey({
            interactionId: item.interactionId,
            fileLocation: item.filePath,
          });
          nextStatuses[key] = item;
        });

        setGlacierStatuses((prev) => ({ ...prev, ...nextStatuses }));
      } catch (error) {
        console.error("Failed to load Glacier restore statuses:", error);
      }
    },
    [interactions],
  );

  useEffect(() => {
    refreshGlacierStatuses();
  }, [refreshGlacierStatuses]);

  const showRestoreToast = useCallback((message) => {
    if (restoreToastTimeoutRef.current) {
      clearTimeout(restoreToastTimeoutRef.current);
    }

    setRestoreToast({ message });
    restoreToastTimeoutRef.current = setTimeout(() => {
      setRestoreToast(null);
      restoreToastTimeoutRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (restoreToastTimeoutRef.current) {
        clearTimeout(restoreToastTimeoutRef.current);
      }
    };
  }, []);

  const handleRestoreAudio = async ({
    interactionId,
    callId,
    fileLocation,
    fileSourceType,
  }) => {
    if (!fileLocation || !interactionId) return;

    const restoreKey = getInteractionRestoreKey({
      interactionId,
      fileLocation,
    });
    setGlacierLoading((prev) => ({ ...prev, [restoreKey]: true }));
    setGlacierStatuses((prev) => ({
      ...prev,
      [restoreKey]: {
        interactionId,
        filePath: fileLocation,
        status: "retrieving",
        message: "Restore request is being submitted.",
      },
    }));

    try {
      const response = await fetch("/api/interactions/glacierStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          action: "restore",
          interactionId,
          filePath: fileLocation,
          fileSourceType,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to start restore.");
      }

      setGlacierStatuses((prev) => ({
        ...prev,
        [restoreKey]: {
          interactionId,
          filePath: fileLocation,
          callId,
          ...data,
        },
      }));
      showRestoreToast(
        (data.status === "retrieved" || data.status === "standard")
          ? `Call ${callId || interactionId} is ready to play.`
          : `Call ${callId || interactionId} is now retrieving. You will be notified when it is ready.`,
      );
    } catch (error) {
      console.error("Failed to restore Glacier audio:", error);
      setGlacierStatuses((prev) => ({
        ...prev,
        [restoreKey]: {
          interactionId,
          filePath: fileLocation,
          status: "needs_retrieval",
          message: error.message || "Failed to start restore.",
        },
      }));
      alert(error.message || "Failed to start restore.");
    } finally {
      setGlacierLoading((prev) => {
        const next = { ...prev };
        delete next[restoreKey];
        return next;
      });
    }
  };

  const handlePlayAudio = useCallback(
    ({ interactionId }) => {
      router.push(`/dashboard/interactions/${interactionId}`);
    },
    [router],
  );

  const handleOrganizationChange = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setTempSelectedOptions([]);
      return;
    }

    const currentIds = tempSelectedOptions.map((opt) => opt.value);
    const selectedIds = selectedOptions.map((opt) => opt.value);

    const added = selectedOptions.filter(
      (opt) => !currentIds.includes(opt.value),
    );
    const removed = tempSelectedOptions.filter(
      (opt) => !selectedIds.includes(opt.value),
    );

    if (added.length > 0) {
      const last = added[added.length - 1];
      const node = findNodeById(organizationTreeRaw.current, last.value);
      if (!node) return;

      const newNodes = getAllDescendants(node);
      const combined = [...tempSelectedOptions, ...newNodes];
      const unique = Array.from(
        new Map(combined.map((o) => [o.value, o])).values(),
      );

      setTempSelectedOptions(unique);
    } else if (removed.length > 0) {
      const toRemove = removed[0];
      const node = findNodeById(organizationTreeRaw.current, toRemove.value);
      if (!node) return;

      const nodesToRemove = getAllDescendants(node).map((n) => n.value);
      const filtered = tempSelectedOptions.filter(
        (opt) => !nodesToRemove.includes(opt.value),
      );
      setTempSelectedOptions(filtered);
    }
  };

  const openFilterModal = (filterKey) => {
    setCurrentFilter(filterKey);
    setModalSearchValue(draftColumnFilters[filterKey] || "");
    setTempSelectedOptions(selectedDropdownOptions);
    setTempAgentNameOptions(agentNameOptions);
    setTempInstanceNameOptions(instanceNameOptions);
    setTempPlatformOptions(platformOptions);
    setTempChannelTypeOptions(channelTypeOptions);
    setTempFormOptions(formOptions);
    setTempEvaluatorOptions(evaluatorOptions);
    setTempDurationOperator(durationOperator);
    setTempDurationValue(durationValue);
    setTempDurationValue2(durationValue2);
    setModalOpen(true);
  };

  const buildInteractionRequestBody = useCallback(
    ({
      pageNum = currentPage,
      perPage = itemsPerPage,
      statusParam = status,
      filters = columnSearchValues,
      overrideStartDate = null,
      overrideEndDate = null,
      durationOverrides = null,
    } = {}) => {
      let timezone = null;

      try {
        const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

        if (encryptedTimezone) {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          timezone = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        }
      } catch (err) {
        console.error("Failed to decrypt timezone:", err);
      }

      let userId = null;

      try {
        const encryptedUserData = sessionStorage.getItem("user");

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          userId = user?.userId || null;
        }
      } catch (error) {
        console.error("[User] Error decrypting user data:", error);
      }

      let privilegeId = null;

      if (hasPrivilege(27)) {
        privilegeId = 27;
      } else if (hasPrivilege(26)) {
        privilegeId = 26;
      }

      const effectiveDurationOperator =
        durationOverrides?.operator ?? durationFilterRef.current.operator;
      const effectiveDurationValue =
        durationOverrides?.value ?? durationFilterRef.current.value;
      const effectiveDurationValue2 =
        durationOverrides?.value2 ?? durationFilterRef.current.value2;

      return {
        pageNo: pageNum,
        rowCountPerPage: perPage,
        search: "",
        queryType: 0,
        fromDate: overrideStartDate
          ? formatDateTimeForApi(overrideStartDate)
          : dateRange.startDate
            ? formatDateTimeForApi(dateRange.startDate)
            : null,
        toDate: overrideEndDate
          ? formatDateTimeForApi(overrideEndDate)
          : dateRange.endDate
            ? formatDateTimeForApi(dateRange.endDate)
            : null,
        callId: filters.callId || "",
        ucid: filters.ucid || "",
        agent: filters.agent || "",
        durationOperator: effectiveDurationOperator || null,
        durationValue: effectiveDurationValue
          ? Number(effectiveDurationValue)
          : null,
        durationValue2: effectiveDurationValue2
          ? Number(effectiveDurationValue2)
          : null,
        aniDni: filters.aniDni || null,
        organizationIds: selectedDropdownOptions.map((opt) => ({
          organizationId: Number(opt.value),
        })),
        agentNameIds: agentNameOptions.map((opt) => ({
          agentsId: opt.value,
        })),
        instanceNameIds: instanceNameOptions.map((opt) => ({
          appid: Number(opt.appid),
          PlatformId: Number(opt.platformId),
        })),
        // platformIds: platformOptions.map((opt) => ({
        //   PlatformId: Number(opt.platformId),
        // })),
        channelTypeIds: channelTypeOptions.map((opt) => ({
          channelType: String(opt.channelTypeId ?? opt.value),
        })),
        extensions: filters.extensions || null,
        currentUserId: userId,
        timezone,
        ActiveStatus: Number(statusParam ?? status),
        privilegeId,
      };
    },
    [
      currentPage,
      itemsPerPage,
      status,
      columnSearchValues,
      dateRange.startDate,
      dateRange.endDate,
      formOptions,
      evaluatorOptions,
      selectedDropdownOptions,
      agentNameOptions,
      instanceNameOptions,
      platformOptions,
      channelTypeOptions,
      hasPrivilege,
    ],
  );

  const tableColumns = React.useMemo(
    () => buildDynamicInteractionColumns(interactions),
    [interactions],
  );

  useEffect(() => {
    if (!tableColumns.length) {
      return;
    }

    const availableColumnIds = tableColumns.map(
      (column) => column.id || column.accessorKey,
    );

    setColumnOrder((prev) => {
      const normalizedOrder = normalizeSavedColumnOrder(
        prev,
        availableColumnIds,
      );

      const hasChanged =
        normalizedOrder.length !== prev.length ||
        normalizedOrder.some((id, index) => prev[index] !== id);

      return hasChanged ? normalizedOrder : prev;
    });
  }, [tableColumns]);

  useEffect(() => {
    if (!interactions.length) {
      return;
    }

    const dynamicKeys = Object.keys(interactions[0]).filter(
      (key) => key !== "action",
    );

    setColumnVisibility((prev) => {
      const nextVisibility = {
        action: true,
      };

      dynamicKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          nextVisibility[key] = prev[key];
        } else {
          nextVisibility[key] = INTERACTION_DEFAULT_VISIBLE_COLUMNS.has(key);
        }
      });

      const hasChanged =
        Object.keys(nextVisibility).length !== Object.keys(prev).length ||
        prev.action !== true ||
        dynamicKeys.some((key) => prev[key] !== nextVisibility[key]);

      return hasChanged ? nextVisibility : prev;
    });
  }, [interactions, status]);

  const fetchOrganizationTree = async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let userId = null;
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        loggedInUserId: userId,
      };

      const response = await fetch("/api/interactions/organizationDDL", {
        method: "GET",
        headers: headers,
      });

      const data = await response.json();

      if (response.ok) {
        const tree = data.organizationList;
        organizationTreeRaw.current = tree;
        setOrganizationTreeOptions(flattenTreeToGroups(tree));
      } else {
        console.error(`Error fetching organization data:, ${data.message}`);
      }
    } catch (error) {
      console.error(`Error fetching organization tree:, ${error}`);
    }
  };

  useEffect(() => {
    if (currentFilter === "organizationName") {
      fetchOrganizationTree();
    }
  }, [currentFilter]);

  const fetchFilteredData = useCallback(
    async (
      pageNum = currentPage,
      perPage = itemsPerPage,
      statusParam = null,
      filters = columnSearchValues,
      overrideStartDate = null,
      overrideEndDate = null,
      durationOverrides = null,
    ) => {
      if (pageNum === 1) setInteractions([]);

      const requestId = Date.now();
      latestRequestVersion.current = requestId;

      const controller = new AbortController();
      const signal = controller.signal;
      abortControllerRef.current = controller;

      const effectiveDurationOperator =
        durationOverrides?.operator ?? durationFilterRef.current.operator;
      const effectiveDurationValue =
        durationOverrides?.value ?? durationFilterRef.current.value;
      const effectiveDurationValue2 =
        durationOverrides?.value2 ?? durationFilterRef.current.value2;

      try {
        const requestBody = buildInteractionRequestBody({
          pageNum,
          perPage,
          statusParam,
          filters,
          overrideStartDate,
          overrideEndDate,
          durationOverrides,
        });
        const token = process.env.NEXT_PUBLIC_API_TOKEN;

        const response = await fetch(`/api/interactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            orgIds: getSelectedOrgIdsHeader(),
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Response failed:", response.status, errText);
          throw new Error("Request failed");
        }

        const data = await response.json();

        if (latestRequestVersion.current !== requestId) {
          console.warn("Stale response ignored. RequestId mismatch.");
          return;
        }

        setCount(data.totalRecord || 0);
        setInteractions(data.interactions || []);
        // SAMPLE ROW log removed

        sessionStorage.setItem(
          "interactionResults",
          JSON.stringify({
            interactions: data.interactions || [],
            count: data.totalRecord || 0,
          }),
        );
        sessionStorage.setItem(
          INTERACTION_LIST_VIEW_STATE_KEY,
          JSON.stringify({
            interactions: data.interactions || [],
            count: data.totalRecord || 0,
            currentPage: pageNum,
            itemsPerPage: perPage,
            dateRange: {
              startDate:
                (overrideStartDate ?? dateRange.startDate)?.toISOString?.() ??
                null,
              endDate:
                (overrideEndDate ?? dateRange.endDate)?.toISOString?.() ?? null,
            },
            draftColumnFilters: filters,
            columnSearchValues: filters,
            selectedDropdownOptions,
            agentNameOptions,
            instanceNameOptions,
            platformOptions,
            channelTypeOptions,
            formOptions,
            evaluatorOptions,
            durationOperator: effectiveDurationOperator,
            durationValue: effectiveDurationValue,
            durationValue2: effectiveDurationValue2,
            status: normalizeSearchStatus(statusParam ?? status),
            hasSearched: true,
            columnVisibility,
            columnOrder,
            selectedInteractionIds,
            selectedRowsMap,
            scrollY: typeof window !== "undefined" ? window.scrollY : 0,
          }),
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            `[Request] Error for page ${pageNum}, perPage ${perPage}:`,
            error,
          );
        } else {
          console.warn("Request aborted");
        }
      } finally {
        setLoading(false);
      }
    },

    [
      currentPage,
      itemsPerPage,
      dateRange,
      columnSearchValues,
      durationOperator,
      durationValue,
      durationValue2,
      agentNameOptions,
      instanceNameOptions,
      platformOptions,
      channelTypeOptions,
      formOptions,
      evaluatorOptions,
      selectedDropdownOptions,
      columnVisibility,
      columnOrder,
      buildInteractionRequestBody,
    ],
  );

  const latestRequestVersion = useRef(null);
  const historyRef = useRef(null);
  const historyPanelRef = useRef(null);
  const restoredDateRef = useRef(null);
  const restoringListViewRef = useRef(Boolean(initialListViewState));

  const allSelectedInteractionIds = [
    ...new Set(Object.values(selectedInteractionIds).flat()),
  ];

  const selectedInteractions = Object.values(selectedRowsMap)
    .flat()
    .filter(
      (obj, index, self) =>
        index === self.findIndex((o) => o.callId === obj.callId),
    );

  useEffect(() => {
    const savedListView = sessionStorage.getItem(
      INTERACTION_LIST_VIEW_STATE_KEY,
    );
    const saved = sessionStorage.getItem("interactionSearchState");

    if (privilegesLoaded && hasPrivilege(1) && savedListView) {
      const parsed = JSON.parse(savedListView);
      const start = parsed.dateRange?.startDate
        ? new Date(parsed.dateRange.startDate)
        : null;
      const end = parsed.dateRange?.endDate
        ? new Date(parsed.dateRange.endDate)
        : null;
      restoringListViewRef.current = true;

      if (start && end) {
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }

      setDateRange({ startDate: start, endDate: end });
      setDraftColumnFilters(parsed.draftColumnFilters || {});
      setColumnSearchValues(parsed.columnSearchValues || {});
      setSelectedDropdownOptions(parsed.selectedDropdownOptions || []);
      setTempSelectedOptions(parsed.selectedDropdownOptions || []);
      setAgentNameOptions(parsed.agentNameOptions || []);
      setTempAgentNameOptions(parsed.agentNameOptions || []);
      setInstanceNameOptions(parsed.instanceNameOptions || []);
      setPlatformOptions(parsed.platformOptions || []);
      setTempPlatformOptions(parsed.platformOptions || []);
      setChannelTypeOptions(parsed.channelTypeOptions || []);
      setTempChannelTypeOptions(parsed.channelTypeOptions || []);
      setTempInstanceNameOptions(parsed.instanceNameOptions || []);
      setFormOptions(parsed.formOptions || []);
      setTempFormOptions(parsed.formOptions || []);
      setEvaluatorOptions(parsed.evaluatorOptions || []);
      setTempEvaluatorOptions(parsed.evaluatorOptions || []);
      setDurationOperator(parsed.durationOperator || ">");
      setDurationValue(
        parsed.durationValue ? String(parsed.durationValue) : "",
      );
      setDurationValue2(
        parsed.durationValue2 ? String(parsed.durationValue2) : "",
      );
      durationFilterRef.current = {
        operator: parsed.durationOperator || ">",
        value: parsed.durationValue ? String(parsed.durationValue) : "",
        value2: parsed.durationValue2 ? String(parsed.durationValue2) : "",
      };
      setTempDurationOperator(parsed.durationOperator || ">");
      setTempDurationValue(
        parsed.durationValue ? String(parsed.durationValue) : "",
      );
      setTempDurationValue2(
        parsed.durationValue2 ? String(parsed.durationValue2) : "",
      );

      setColumnVisibility(
        parsed.columnVisibility || interactionDefaultVisibility,
      );
      setColumnOrder(parsed.columnOrder || []);
      setSelectedInteractionIds(parsed.selectedInteractionIds || {});
      setSelectedRowsMap(parsed.selectedRowsMap || {});
      setCurrentPage(parsed.currentPage || 1);
      setItemsPerPage(parsed.itemsPerPage || 10);
      setInteractions(parsed.interactions || []);
      setCount(parsed.count || 0);
      setHasSearched(Boolean(parsed.hasSearched));
      setLoading(false);

      requestAnimationFrame(() => {
        if (typeof parsed.scrollY === "number") {
          window.scrollTo({ top: parsed.scrollY, behavior: "auto" });
        }
      });

      return;
    }

    if (privilegesLoaded && hasPrivilege(1) && saved) {
      const parsed = JSON.parse(saved);

      const start = parsed.startDate ? new Date(parsed.startDate) : null;
      const end = parsed.endDate ? new Date(parsed.endDate) : null;
      restoringListViewRef.current = true;

      if (start && end) {
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }

      setDateRange({ startDate: start, endDate: end });

      setColumnSearchValues(parsed.filters || {});
      setDraftColumnFilters(parsed.filters || {});
      setSelectedDropdownOptions(parsed.selectedOrganizations || []);
      setTempSelectedOptions(parsed.selectedOrganizations || []);
      setAgentNameOptions(parsed.selectedAgentNames || []);
      setTempAgentNameOptions(parsed.selectedAgentNames || []);
      setInstanceNameOptions(parsed.selectedInstances || []);
      setPlatformOptions(parsed.selectedPlatforms || []);
      setTempPlatformOptions(parsed.selectedPlatforms || []);
      setChannelTypeOptions(parsed.selectedChannelTypes || []);
      setTempChannelTypeOptions(parsed.selectedChannelTypes || []);
      setTempInstanceNameOptions(parsed.selectedInstances || []);
      setFormOptions(parsed.selectedForms || []);
      setTempFormOptions(parsed.selectedForms || []);
      setEvaluatorOptions(parsed.selectedEvaluators || []);
      setTempEvaluatorOptions(parsed.selectedEvaluators || []);

      if (parsed.durationOperator) setDurationOperator(parsed.durationOperator);
      if (parsed.durationValue) setDurationValue(String(parsed.durationValue));
      if (parsed.durationValue2)
        setDurationValue2(String(parsed.durationValue2));
      durationFilterRef.current = {
        operator: parsed.durationOperator || ">",
        value: parsed.durationValue ? String(parsed.durationValue) : "",
        value2: parsed.durationValue2 ? String(parsed.durationValue2) : "",
      };
      setTempDurationOperator(parsed.durationOperator || ">");
      setTempDurationValue(
        parsed.durationValue ? String(parsed.durationValue) : "",
      );
      setTempDurationValue2(
        parsed.durationValue2 ? String(parsed.durationValue2) : "",
      );

      setColumnVisibility(
        parsed.columnVisibility || interactionDefaultVisibility,
      );
      setColumnOrder(parsed.columnOrder || []);
      const savedResults = sessionStorage.getItem("interactionResults");
      if (savedResults) {
        const { interactions: savedRows, count: savedCount } =
          JSON.parse(savedResults);
        setInteractions(savedRows || []);
        setCount(savedCount || 0);
        setHasSearched(true);
      } else {
        setHasSearched(false);
      }
      setLoading(false);
    }
  }, [privilegesLoaded]);

  useEffect(() => {
    if (!hasSearched) return;
    persistInteractionListViewState();
  }, [hasSearched, persistInteractionListViewState]);

  const persistInteractionsTablePreference = useCallback(
    async (nextVisibility, nextOrder, availableColumnIds = []) => {
      if (!tablePreferenceHydrated || !availableColumnIds.length) {
        return;
      }

      try {
        await saveUserTablePreference(currentTablePreferencePageKey, {
          version: 1,
          columnVisibility: nextVisibility,
          columnOrder: normalizeSavedColumnOrder(nextOrder, availableColumnIds),
        });
      } catch (error) {
        console.error("Failed to save interaction table preference:", error);
      }
    },
    [currentTablePreferencePageKey, tablePreferenceHydrated],
  );

  const handleInteractionColumnVisibilityChange = useCallback(
    (nextVisibilityOrUpdater) => {
      setColumnVisibility((prev) => {
        const nextVisibility =
          typeof nextVisibilityOrUpdater === "function"
            ? nextVisibilityOrUpdater(prev)
            : nextVisibilityOrUpdater;

        const availableColumnIds = tableColumns.map(
          (column) => column.id || column.accessorKey,
        );

        persistInteractionsTablePreference(
          nextVisibility,
          columnOrder,
          availableColumnIds,
        );

        return nextVisibility;
      });
    },
    [columnOrder, persistInteractionsTablePreference, tableColumns],
  );

  const handleInteractionColumnOrderChange = useCallback(
    (nextOrderOrUpdater) => {
      setColumnOrder((prev) => {
        const nextOrder =
          typeof nextOrderOrUpdater === "function"
            ? nextOrderOrUpdater(prev)
            : nextOrderOrUpdater;

        const availableColumnIds = tableColumns.map(
          (column) => column.id || column.accessorKey,
        );

        persistInteractionsTablePreference(
          columnVisibility,
          nextOrder,
          availableColumnIds,
        );

        return nextOrder;
      });
    },
    [columnVisibility, persistInteractionsTablePreference, tableColumns],
  );

  useEffect(() => {
    let ignore = false;

    const loadSavedPreference = async () => {
      setTablePreferenceHydrated(false);

      try {
        const shouldUseInitialListViewState =
          initialListViewStateRef.current &&
          normalizeSearchStatus(initialListViewStateRef.current?.status) ===
            normalizeSearchStatus(status) &&
          (initialListViewStateRef.current?.columnOrder?.length ||
            initialListViewStateRef.current?.columnVisibility);

        if (shouldUseInitialListViewState) {
          initialListViewStateRef.current = null;
          return;
        }

        const preference = await loadUserTablePreference(
          currentTablePreferencePageKey,
        );

        if (ignore) {
          return;
        }

        if (preference?.columnVisibility) {
          setColumnVisibility(preference.columnVisibility);
        } else {
          setColumnVisibility(interactionDefaultVisibility);
        }

        if (Array.isArray(preference?.columnOrder)) {
          setColumnOrder(preference.columnOrder);
        } else {
          setColumnOrder([]);
        }
      } catch (error) {
        console.error(
          "Failed to load saved interaction table preference:",
          error,
        );
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
  }, [currentTablePreferencePageKey, status]);

  useEffect(() => {
    if (!tablePreferenceHydrated || !tableColumns.length) {
      return;
    }

    const availableColumnIds = tableColumns.map(
      (column) => column.id || column.accessorKey,
    );

    const timeoutId = window.setTimeout(async () => {
      persistInteractionsTablePreference(
        columnVisibility,
        columnOrder,
        availableColumnIds,
      );
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    columnOrder,
    columnVisibility,
    persistInteractionsTablePreference,
    tableColumns,
    tablePreferenceHydrated,
  ]);

  useEffect(() => {
    const savedListView = initialListViewStateRef.current;

    if (!savedListView || typeof savedListView.scrollY !== "number") {
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: savedListView.scrollY, behavior: "auto" });
    });
  }, []);

  const handleInteractionRowClick = useCallback((row) => {
    if (!row) return;
    const original = row.original ?? row;
    router.push(`/dashboard/interactions/${original.id}`);
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedButton = historyRef.current?.contains(event.target);
      const clickedPanel = historyPanelRef.current?.contains(event.target);
      if (!clickedButton && !clickedPanel) {
        setHistoryOpen(false);
      }
    };

    if (historyOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [historyOpen]);

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound();
  }

  const triggerSearch = async () => {
    sessionStorage.removeItem("interactionResults");
    const appliedFilters = { ...draftColumnFilters };
    const activeDurationFilter = { ...durationFilterRef.current };

    let adjustedStart =
      restoredDateRef.current?.startDate ?? dateRange.startDate;
    let adjustedEnd = restoredDateRef.current?.endDate ?? dateRange.endDate;
    restoredDateRef.current = null;

    const ignoreDateFilters = ["callId", "ucid", "aniDni"];
    const hasIgnoreDateFilter = ignoreDateFilters.some(
      (key) => appliedFilters[key],
    );
    const historyDateStart =
      hasIgnoreDateFilter && preDateFilterRange.current?.startDate
        ? preDateFilterRange.current.startDate
        : null;
    const historyDateEnd =
      hasIgnoreDateFilter && preDateFilterRange.current?.endDate
        ? preDateFilterRange.current.endDate
        : null;

    if (hasIgnoreDateFilter) {
    } else if (adjustedEnd) {
      if (!adjustedStart) {
        const hasFilters = Object.keys(appliedFilters).length > 0;
        const newStart = new Date(adjustedEnd);
        if (hasFilters) newStart.setDate(newStart.getDate() - 90);
        else newStart.setDate(newStart.getDate() - 30);
        adjustedStart = newStart;
      }
    }

    const payload = {
      fromDate: historyDateStart ?? adjustedStart,
      toDate: historyDateEnd ?? adjustedEnd,
      filters: appliedFilters,
      selectedOrganizations: selectedDropdownOptions,
      selectedAgentNames: agentNameOptions,
      selectedInstances: instanceNameOptions,
      selectedPlatforms: platformOptions,
      selectedChannelTypes: channelTypeOptions,
      selectedForms: formOptions,
      selectedEvaluators: evaluatorOptions,
      status: normalizeSearchStatus(status),
      searchType:
        normalizeSearchStatus(status) === "1" ? "evaluation" : "interaction",
      durationOperator: durationOperator || null,
      durationValue: durationValue ? Number(durationValue) : null,
      durationValue2: durationValue2 ? Number(durationValue2) : null,
      columnVisibility,
      viewLabel:
        normalizeSearchStatus(status) === "1" ? "Evaluations" : "Interactions",
    };

    sessionStorage.setItem(
      "interactionSearchState",
      JSON.stringify({
        startDate: adjustedStart,
        endDate: adjustedEnd,
        filters: appliedFilters,
        selectedOrganizations: selectedDropdownOptions,
        selectedAgentNames: agentNameOptions,
        selectedInstances: instanceNameOptions,
        selectedPlatforms: platformOptions,
        selectedChannelTypes: channelTypeOptions,
        selectedForms: formOptions,
        selectedEvaluators: evaluatorOptions,

        durationOperator: durationOperator || null,
        durationValue: durationValue ? Number(durationValue) : null,
        durationValue2: durationValue2 ? Number(durationValue2) : null,
        status: normalizeSearchStatus(status),
      }),
    );

    sessionStorage.setItem(
      "interactionDateRange",
      JSON.stringify({
        startDate: adjustedStart ? adjustedStart.toISOString() : null,
        endDate: adjustedEnd ? adjustedEnd.toISOString() : null,
      }),
    );

    const encryptedUserData = sessionStorage.getItem("user");
    const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
    const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    fetch("/api/interactions/saveSearch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.userId, payload }),
    }).catch(() => {});

    const encryptedTimezone = sessionStorage.getItem("selectedTimezone");
    let timezone = null;

    if (encryptedTimezone) {
      const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
      timezone = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }

    fetch("/api/interactions/searchHistory", {
      headers: {
        loggedInUserId: user.userId,
        timezone: timezone,
        activeStatus: normalizeSearchStatus(status),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.history) setSearchHistory(d.history);
      })
      .catch(() => {});

    setColumnSearchValues(appliedFilters);
    setCurrentPage(1);
    setHasSearched(true);
    setLoading(true);
    setFiltersPending(false);
    setSelectedInteractionIds({});
    setSelectedRowsMap({});
    setTableKey((prev) => prev + 1);

    fetchFilteredData(
      1,
      itemsPerPage,
      status,
      appliedFilters,
      adjustedStart,
      adjustedEnd,
      activeDurationFilter,
    );
  };

  const handleDateChange = (start, end) => {
    if (restoringListViewRef.current) {
      restoringListViewRef.current = false;
      setDateRange({ startDate: start, endDate: end });
      return;
    }

    setInteractions([]);
    setCurrentPage(1);
    setDateRange({ startDate: start, endDate: end });
  };

  const handleModalSearch = () => {
    const nonTextFilters = [
      "organizationName",
      "agentName",
      "instanceName",
      //"platformIds",
      "channelType",
      "callDuration",
    ];

    if (
      modalSearchValue?.trim() === "" &&
      !nonTextFilters.includes(currentFilter)
    ) {
      setModalOpen(false);
      return;
    }
    if (currentFilter === "organizationName") {
      if (tempSelectedOptions.length === 0) {
        setSelectedDropdownOptions([]);
        setDraftColumnFilters((prev) => {
          const updated = { ...prev };
          delete updated[currentFilter];
          return updated;
        });
        setModalOpen(false);
        return;
      }
      setSelectedDropdownOptions(tempSelectedOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: tempSelectedOptions.map((opt) => opt.label).join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "agentName") {
      if (tempAgentNameOptions.length === 0) {
        setAgentNameOptions([]);
        setDraftColumnFilters((prev) => {
          const updated = { ...prev };
          delete updated[currentFilter];
          return updated;
        });
        setModalOpen(false);
        return;
      }
      setAgentNameOptions(tempAgentNameOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: tempAgentNameOptions
          .map((opt) => opt.label)
          .join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "instanceName") {
      if (tempInstanceNameOptions.length === 0) {
        setInstanceNameOptions([]);
        setDraftColumnFilters((prev) => {
          const updated = { ...prev };
          delete updated[currentFilter];
          return updated;
        });
        setModalOpen(false);
        return;
      }
      setInstanceNameOptions(tempInstanceNameOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: tempInstanceNameOptions
          .map((opt) => opt.label)
          .join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
      // } else if (currentFilter === "platformIds") {
      //   if (tempPlatformOptions.length === 0) {
      //     setPlatformOptions([]);
      //     setDraftColumnFilters((prev) => {
      //       const updated = { ...prev };
      //       delete updated[currentFilter];
      //       return updated;
      //     });
      //     setModalOpen(false);
      //     return;
      //   }
      //   setPlatformOptions(tempPlatformOptions);
      //   setDraftColumnFilters((prev) => ({
      //     ...prev,
      //     [currentFilter]: tempPlatformOptions.map((opt) => opt.label).join(", "),
      //   }));
      //   setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "channelType") {
      if (tempChannelTypeOptions.length === 0) {
        setChannelTypeOptions([]);
        setDraftColumnFilters((prev) => {
          const updated = { ...prev };
          delete updated[currentFilter];
          return updated;
        });
        setModalOpen(false);
        return;
      }
      setChannelTypeOptions(tempChannelTypeOptions);
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: tempChannelTypeOptions
          .map((opt) => opt.label)
          .join(", "),
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else if (currentFilter === "callDuration") {
      if (!tempDurationValue) {
        setModalOpen(false);
        return;
      }
      if (tempDurationOperator === "between" && !tempDurationValue2) {
        setModalOpen(false);
        return;
      }
      setDurationOperator(tempDurationOperator);
      setDurationValue(tempDurationValue);
      setDurationValue2(tempDurationValue2);
      durationFilterRef.current = {
        operator: tempDurationOperator,
        value: tempDurationValue,
        value2: tempDurationValue2,
      };
      const label =
        tempDurationOperator === "between"
          ? `between ${tempDurationValue} - ${tempDurationValue2} sec`
          : `${tempDurationOperator} ${tempDurationValue} sec`;
      setDraftColumnFilters((prev) => ({
        ...prev,
        callDuration: label,
      }));
      setSelectedColumns((prev) => [...prev, currentFilter]);
    } else {
      setDraftColumnFilters((prev) => ({
        ...prev,
        [currentFilter]: modalSearchValue,
      }));
    }
    setCurrentPage(1);
    setModalOpen(false);
    setModalSearchValue("");
    setFiltersPending(true);
  };

  const handleRemoveBadge = async (filterId) => {
    setLoading(true);
    setSelectedColumns((prev) => prev.filter((col) => col !== filterId));
    if (filterId === "organizationName") {
      setSelectedDropdownOptions([]);
      setTempSelectedOptions([]);
    }
    if (filterId === "agentName") {
      setAgentNameOptions([]);
      setTempAgentNameOptions([]);
    }
    if (filterId === "instanceName") {
      setInstanceNameOptions([]);
      setTempInstanceNameOptions([]);
    }
    // if (filterId === "platformIds") {
    //   setPlatformOptions([]);
    //   setTempPlatformOptions([]);
    // }
    if (filterId === "channelType") {
      setChannelTypeOptions([]);
      setTempChannelTypeOptions([]);
    }
    if (filterId === "callDuration") {
      setDurationOperator(">");
      setDurationValue("");
      setDurationValue2("");
      setTempDurationOperator(">");
      setTempDurationValue("");
      setTempDurationValue2("");
      durationFilterRef.current = {
        operator: ">",
        value: "",
        value2: "",
      };
    }
    if (filterId === "evaluatorIds") {
      setEvaluatorOptions([]);
      setTempEvaluatorOptions([]);
    }

    const updatedDraft = { ...draftColumnFilters };
    delete updatedDraft[filterId];
    setDraftColumnFilters(updatedDraft);

    const updatedSearchValues = { ...columnSearchValues };
    delete updatedSearchValues[filterId];
    setColumnSearchValues(updatedSearchValues);

    setCurrentPage(1);

    const remainingFilters = Object.keys(updatedDraft);
    const stillHasIgnoreDateFilter = ["callId", "ucid", "aniDni"].some((key) =>
      remainingFilters.includes(key),
    );

    const removedWasIgnoreDateFilter = ["callId", "ucid", "aniDni"].includes(
      filterId,
    );

    if (!stillHasIgnoreDateFilter && removedWasIgnoreDateFilter) {
      const dayRange = remainingFilters.length > 0 ? 90 : 30;

      if (remainingFilters.length === 0) {
        const { startDate, endDate } =
          buildDefaultInteractionDateRange(dayRange);
        setDateRange({ startDate, endDate });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        );
        preDateFilterRange.current = null;
      } else if (
        preDateFilterRange.current?.startDate &&
        preDateFilterRange.current?.endDate
      ) {
        const { startDate: savedStart, endDate: savedEnd } =
          preDateFilterRange.current;
        setDateRange({ startDate: savedStart, endDate: savedEnd });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: savedStart.toISOString(),
            endDate: savedEnd.toISOString(),
          }),
        );
        preDateFilterRange.current = null;
      } else {
        const currentRangeDays =
          dateRange.startDate && dateRange.endDate
            ? Math.ceil(
                (dateRange.endDate - dateRange.startDate) /
                  (1000 * 60 * 60 * 24),
              )
            : 999;

        if (currentRangeDays > dayRange) {
          const { startDate: start, endDate: end } =
            buildDefaultInteractionDateRange(dayRange);
          setDateRange({ startDate: start, endDate: end });
          sessionStorage.setItem(
            "interactionDateRange",
            JSON.stringify({
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            }),
          );
        }
      }
    } else if (!removedWasIgnoreDateFilter && !stillHasIgnoreDateFilter) {
      const dayRange = remainingFilters.length > 0 ? 90 : 30;
      const currentRangeDays =
        dateRange.startDate && dateRange.endDate
          ? Math.ceil(
              (dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24),
            )
          : 999;

      if (currentRangeDays > dayRange) {
        const { startDate: start, endDate: end } =
          buildDefaultInteractionDateRange(dayRange);
        setDateRange({ startDate: start, endDate: end });
        sessionStorage.setItem(
          "interactionDateRange",
          JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          }),
        );
      }
    }
  };

  const handlePageChange = (pageNum, perPage = itemsPerPage) => {
    setCurrentPage(pageNum);
    setItemsPerPage(perPage);
    persistInteractionListViewState({
      currentPage: pageNum,
      itemsPerPage: perPage,
    });

    if (hasSearched) {
      setLoading(true);
      fetchFilteredData(
        pageNum,
        perPage,
        status,
        columnSearchValues,
        dateRange.startDate,
        dateRange.endDate,
      );
    }
  };

  const applyHistorySearch = (payload) => {
    const start = new Date(payload.fromDate);
    const end = new Date(payload.toDate);
    const filters = payload.filters || {};
    const hasIgnoreDateFilter = ["callId", "ucid", "aniDni"].some(
      (key) => filters[key],
    );

    restoredDateRef.current = { startDate: start, endDate: end };
    preDateFilterRange.current = { startDate: start, endDate: end };
    setSkipNextIgnoreDateAutoExpand(hasIgnoreDateFilter);

    setDateRange({ startDate: start, endDate: end });
    setInteractions([]);
    setCurrentPage(1);

    sessionStorage.setItem(
      "interactionDateRange",
      JSON.stringify({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    );

    setDraftColumnFilters(filters);
    setColumnSearchValues(filters);
    setSelectedDropdownOptions(payload.selectedOrganizations || []);
    setTempSelectedOptions(payload.selectedOrganizations || []);
    setAgentNameOptions(payload.selectedAgentNames || []);
    setTempAgentNameOptions(payload.selectedAgentNames || []);
    setInstanceNameOptions(payload.selectedInstances || []);
    setPlatformOptions(payload.selectedPlatforms || []);
    setTempPlatformOptions(payload.selectedPlatforms || []);
    setChannelTypeOptions(payload.selectedChannelTypes || []);
    setTempChannelTypeOptions(payload.selectedChannelTypes || []);
    setTempInstanceNameOptions(payload.selectedInstances || []);
    setFormOptions(payload.selectedForms || []);
    setTempFormOptions(payload.selectedForms || []);
    setEvaluatorOptions(payload.selectedEvaluators || []);
    setTempEvaluatorOptions(payload.selectedEvaluators || []);

    if (payload.durationOperator) setDurationOperator(payload.durationOperator);
    if (payload.durationValue) setDurationValue(String(payload.durationValue));
    if (payload.durationValue2)
      setDurationValue2(String(payload.durationValue2));
    durationFilterRef.current = {
      operator: payload.durationOperator || ">",
      value: payload.durationValue ? String(payload.durationValue) : "",
      value2: payload.durationValue2 ? String(payload.durationValue2) : "",
    };
    setTempDurationOperator(payload.durationOperator || ">");
    setTempDurationValue(
      payload.durationValue ? String(payload.durationValue) : "",
    );
    setTempDurationValue2(
      payload.durationValue2 ? String(payload.durationValue2) : "",
    );
    if (payload.columnVisibility) setColumnVisibility(payload.columnVisibility);
    if (payload.columnOrder) setColumnOrder(payload.columnOrder);

    setCurrentPage(1);
    setHasSearched(false);
    setFiltersPending(false);
    setLoading(false);
    window.setTimeout(() => setSkipNextIgnoreDateAutoExpand(false), 0);
    sessionStorage.removeItem(INTERACTION_LIST_VIEW_STATE_KEY);
  };

  const dropDownStyle = {
    option: (provided, state) => ({
      ...provided,
      fontSize: "11px",
      backgroundColor: state.isFocused
        ? "hsl(var(--muted))"
        : "hsl(var(--popover))",
      color: "hsl(var(--foreground))",
      padding: "4px 8px",
    }),
    menu: (provided) => ({
      ...provided,
      fontSize: "10px",
      zIndex: 60,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 60,
    }),
    control: (provided) => ({
      ...provided,
      borderRadius: "0.375rem",
      fontSize: "0.740rem",
      boxShadow: "none",
      padding: "0px",
      minHeight: "32px",
      width: "110px",
      height: "32px",
      "&:hover": {
        borderColor: "hsl(var(--ring))",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "hsl(var(--muted-foreground))",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "4px",
      color: "hsl(var(--muted-foreground))",
      ":hover": {
        color: "hsl(var(--foreground))",
      },
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };
  const privilegeId = hasPrivilege(27) ? 27 : hasPrivilege(26) ? 26 : 27;

  const FilterBadge = ({ filterKey, label, value, onRemove }) => {
    const valuesArray = value.split(",").map((v) => v.trim());
    const maxToShow = 4;
    const hiddenCount = valuesArray.length - maxToShow;

    return (
      <div className="flex items-center px-2 py-1 bg-muted rounded-full shadow-md">
        <span className="flex items-center gap-1 text-xs">
          <strong>{label}:</strong>

          {valuesArray.slice(0, maxToShow).join(", ")}

          {hiddenCount > 0 && (
            <button
              className="text-primary ml-1 hover:underline"
              onClick={() => openFilterModal(filterKey)}
            >
              +{hiddenCount} more
            </button>
          )}
        </span>

        <button
          className="ml-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:opacity-90"
          onClick={() => onRemove(filterKey)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };
  const resetModalState = () => {
    setModalSearchValue("");
    setCurrentFilter(null);

    setTempSelectedOptions([]);
    setTempAgentNameOptions([]);
    setTempInstanceNameOptions([]);
    setTempPlatformOptions([]);
    setTempChannelTypeOptions([]);
    setTempFormOptions([]);
    setTempEvaluatorOptions([]);

    setTempDurationOperator(">");
    setTempDurationValue("");
    setTempDurationValue2("");
  };

  const activeSearchStatus = normalizeSearchStatus(status);
  const filteredSearchHistory = searchHistory.filter(
    (entry) =>
      normalizeSearchStatus(entry?.payload?.status) === activeSearchStatus,
  );

  const handleDownloadAllInteractions = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select a date range first.");
      return;
    }
    if (
      downloadJob &&
      (downloadJob.status === "running" || downloadJob.status === "cancelling")
    ) {
      alert("A download is already in progress. Please wait for it to finish.");
      return;
    }

    try {
      setDownloadLoading(true);
      const token = process.env.NEXT_PUBLIC_API_TOKEN;
      const dateRangeLabel = formatInteractionDateRangeLabel(
        dateRange.startDate,
        dateRange.endDate,
      );

      // Step 1: cheap count-only check (perPage: 1, don't need the rows yet)
      const countRequestBody = buildInteractionRequestBody({
        pageNum: 1,
        perPage: 1,
        statusParam: status,
        filters: columnSearchValues,
        overrideStartDate: dateRange.startDate,
        overrideEndDate: dateRange.endDate,
      });

      const countResponse = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify(countRequestBody),
      });

      if (!countResponse.ok) {
        const errText = await countResponse.text();
        console.error("Count check failed:", countResponse.status, errText);
        throw new Error(errText || "Failed to check matching call count");
      }

      const countData = await countResponse.json();
      const totalMatching = Number(countData?.totalRecord || 0);

      if (totalMatching > MAX_INTERACTION_BULK_DOWNLOAD) {
        alert(
          `${totalMatching} calls matched your filters — that's more than the ${MAX_INTERACTION_BULK_DOWNLOAD} limit for a single download. ` +
            `Please narrow your date range (or filters) so ${MAX_INTERACTION_BULK_DOWNLOAD} or fewer calls match, then try again.`,
        );
        return;
      }

      if (totalMatching === 0) {
        alert("No recordings found for the selected date range.");
        return;
      }

      // Step 2: only now fetch the actual rows, since we know it's within limit
      const requestBody = buildInteractionRequestBody({
        pageNum: 1,
        perPage: MAX_INTERACTION_BULK_DOWNLOAD,
        statusParam: status,
        filters: columnSearchValues,
        overrideStartDate: dateRange.startDate,
        overrideEndDate: dateRange.endDate,
      });

      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Full fetch failed:", response.status, errText);
        throw new Error(errText || "Failed to fetch download data");
      }

      const data = await response.json();
      const downloadRows = Array.isArray(data?.interactions)
        ? data.interactions
        : [];
      if (!downloadRows.length) {
        alert("No recordings found for the selected date range.");
        return;
      }

      const { ready, retrieving, needsRestore, unavailable } =
        await checkGlacierStatuses(downloadRows);

      if (ready.length > 0) {
        await startBulkDownload({
          rows: ready,
          downloadType: "all",
          dateRangeLabel,
          totalMatching,
        });
      }

      if (retrieving.length > 0 || needsRestore.length > 0) {
        setGlacierPreflight({
          downloadType: "all",
          dateRangeLabel,
          totalMatching,
          readyCount: ready.length,
          retrieving,
          needsRestore,
          unavailable,
        });
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to prepare download.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadSelectedInteractions = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select a date range first.");
      return;
    }
    if (!selectedInteractions.length) {
      alert("Please select at least one call to download.");
      return;
    }
    if (
      downloadJob &&
      (downloadJob.status === "running" || downloadJob.status === "cancelling")
    ) {
      alert("A download is already in progress. Please wait for it to finish.");
      return;
    }
    if (selectedInteractions.length > MAX_INTERACTION_BULK_DOWNLOAD) {
      alert(
        `You selected ${selectedInteractions.length} calls — that's more than the ${MAX_INTERACTION_BULK_DOWNLOAD} limit. ` +
          `Please select ${MAX_INTERACTION_BULK_DOWNLOAD} or fewer calls.`,
      );
      return;
    }

    try {
      setDownloadLoading(true);
      const dateRangeLabel = formatInteractionDateRangeLabel(
        dateRange.startDate,
        dateRange.endDate,
      );

      const { ready, retrieving, needsRestore, unavailable } =
        await checkGlacierStatuses(selectedInteractions);

      // Download whatever is ready immediately
      if (ready.length > 0) {
        await startBulkDownload({
          rows: ready,
          downloadType: "selected",
          dateRangeLabel,
          totalMatching: selectedInteractions.length,
        });
      }

      // Only show the dialog if something is still pending
      if (retrieving.length > 0 || needsRestore.length > 0) {
        setGlacierPreflight({
          downloadType: "selected",
          dateRangeLabel,
          totalMatching: selectedInteractions.length,
          readyCount: ready.length,
          retrieving,
          needsRestore,
          unavailable,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to prepare download.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const startBulkDownload = async ({
    rows,
    downloadType,
    dateRangeLabel,
    totalMatching,
    restoreCount = 0,
  }) => {
    if (!rows.length) {
      setGlacierPreflight(null);
      return;
    }

    try {
      setDownloadLoading(true);
      const token = process.env.NEXT_PUBLIC_API_TOKEN;
      const archiveFileName = buildBulkDownloadArchiveFileName({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        downloadType,
      });

      const encryptedUserData = sessionStorage.getItem("user");
      const bytes = CryptoJS.AES.decrypt(encryptedUserData || "", "");
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");

      const startResponse = await fetch("/api/interactions/downloadSelected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          loggedInUserId: user?.userId,
          userName: user?.userFullName,
        },
        body: JSON.stringify({
          interactionIds: rows,
          userEmail: user?.email || "",
          archiveFileName,
          dateRangeLabel,
          totalMatching,
          downloadType,
        }),
      });

      if (!startResponse.ok) {
        throw new Error(
          (await startResponse.text()) || "Failed to start download",
        );
      }

      const { jobId } = await startResponse.json();

      startDownloadJob({
        jobId,
        total: rows.length,
        processed: 0,
        failed: 0,
        archiveFileName,
        dateRangeLabel,
        downloadType,
        skippedNotRetrieved: Math.max(0, totalMatching - rows.length),
        restoreInitiatedCount: restoreCount,
      });

      resetSelections();
    } catch (err) {
      console.error(err);
      alert("Failed to start download.");
    } finally {
      setDownloadLoading(false);
      setGlacierPreflight(null);
    }
  };

  const initiateRestoreForRows = async (rows) => {
    if (!rows.length) return 0;

    const items = rows.map((row) => ({
      interactionId: getInteractionNumericId(row),
      filePath: row?.fileLocation ?? row?.file_location,
      fileSourceType: row?.fileSourceType ?? row?.file_source_type,
    }));

    // Optimistic update — same pattern as the single-row restore button —
    // so the UI flips to "Restoring" immediately instead of waiting on the network.
    setGlacierStatuses((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const key = getInteractionRestoreKey({
          interactionId: item.interactionId,
          fileLocation: item.filePath,
        });
        next[key] = {
          interactionId: item.interactionId,
          filePath: item.filePath,
          status: "retrieving",
          message: "Restore request is being submitted.",
        };
      });
      return next;
    });

    try {
      const response = await fetch("/api/interactions/glacierStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({ action: "restoreBatch", items }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to start batch restore.");
      }
      const results = Array.isArray(data.results) ? data.results : [];

      // Apply the AUTHORITATIVE result from initiateObjectRestore directly —
      // don't rely on a follow-up HEAD check that can read stale S3 metadata
      // and flip rows back to "needs_retrieval" right after we just restored them.
      setGlacierStatuses((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          const key = getInteractionRestoreKey({
            interactionId: r.interactionId,
            fileLocation: r.filePath,
          });
          next[key] = r;
        });
        return next;
      });

      return results.filter((r) => r.status && r.status !== "error").length;
    } catch (err) {
      console.error("Failed to initiate batch restore:", err);
      return 0;
    } finally {
      // REMOVED: refreshGlacierStatuses() — no longer needed here since the
      // batch response above already carries the correct post-restore status.
    }
  };

  const handleGlacierPreflightDownloadReady = () => {
    if (!glacierPreflight) return;
    const { ready, downloadType, dateRangeLabel, totalMatching } =
      glacierPreflight;
    startBulkDownload({
      rows: ready,
      downloadType,
      dateRangeLabel,
      totalMatching,
    });
  };

  const handleGlacierPreflightRestoreRemaining = () => {
    if (!glacierPreflight) return;
    const needsRestore = glacierPreflight.needsRestore;
    
    // Close modal and show toast immediately
    setGlacierPreflight(null);
    showRestoreToast(
      `Restoration request submitted for ${needsRestore.length} recording(s). You will receive an email once restoration begins.`
    );
    
    // Fire-and-forget Glacier restore in background
    initiateRestoreForRows(needsRestore).catch((err) => {
      console.error("Failed to restore Glacier audio in background:", err);
    });
  };

  const handleGlacierPreflightDownloadAndRestore = () => {
    if (!glacierPreflight) return;
    const { ready, needsRestore, downloadType, dateRangeLabel, totalMatching } =
      glacierPreflight;

    // Close modal and show toast immediately
    setGlacierPreflight(null);
    showRestoreToast(
      `Restoration request submitted for ${needsRestore.length} recording(s). Ready files will start downloading.`
    );

    // Fire-and-forget Glacier restore in background
    initiateRestoreForRows(needsRestore).catch((err) => {
      console.error("Failed to restore Glacier audio in background:", err);
    });

    // Start bulk download of ready files
    startBulkDownload({
      rows: ready,
      downloadType,
      dateRangeLabel,
      totalMatching,
    }).catch((err) => {
      console.error("Failed to start bulk download:", err);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {restoreToast && (
        <div className="fixed right-5 top-5 z-[1000] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md border border-emerald-200 bg-background shadow-xl">
          <div className="flex items-center gap-3 px-4 py-3 pr-10">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">
              {restoreToast.message}
            </p>
            <button
              type="button"
              onClick={() => setRestoreToast(null)}
              className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 w-full bg-emerald-500" />
        </div>
      )}
      <div className="sticky top-0 z-20 shrink-0 bg-background pb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2">
          <div className="w-full sm:w-auto">
            <DatePickerWithRange
              onDateChange={handleDateChange}
              isFilterApplied={
                Object.keys(draftColumnFilters).length > 0 ||
                Object.keys(columnSearchValues).length > 0
              }
              initialStartDate={dateRange.startDate}
              initialEndDate={dateRange.endDate}
              isIgnoreDateFilter={
                !!(
                  draftColumnFilters.callId ||
                  draftColumnFilters.ucid ||
                  draftColumnFilters.aniDni
                )
              }
              suppressNextIgnoreDateAutoExpand={skipNextIgnoreDateAutoExpand}
            />
          </div>

          <Select
            styles={dropDownStyle}
            menuPortalTarget={
              typeof document !== "undefined" ? document.body : null
            }
            value={null}
            isSearchable={false}
            onChange={(selected) => {
              if (["callId", "ucid", "aniDni"].includes(selected.value)) {
                preDateFilterRange.current = {
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate,
                };
              }
              openFilterModal(selected.value);
            }}
            options={[
              { value: "ucid", label: "UCID" },
              { value: "extensions", label: "Extension" },
              { value: "agent", label: "Agent Id" },
              { value: "callId", label: "Call ID" },
              { value: "aniDni", label: "ANI/DNIS" },
              { value: "callDuration", label: "Call Duration" },
              { value: "agentName", label: "Agent Name" },
              { value: "instanceName", label: "Instance Name" },
              //{ value: "platformIds", label: "Platform Name" },
              { value: "channelType", label: "Channel Type" },
              { value: "organizationName", label: "Organization" },
            ]}
            placeholder="Add Filters"
          />

          <div ref={historyRef}>
            <button
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm transition-colors hover:bg-muted whitespace-nowrap"
            >
              Recent Searches {historyOpen ? "▲" : "▼"}
            </button>
          </div>

          <Button
            size="sm"
            onClick={triggerSearch}
            className="flex items-center gap-1 px-3 py-1 text-xs"
          >
            <FaSearch className="h-3 w-3" />
            Search
          </Button>

          <HiMiniInformationCircle
            onClick={() => setHelpOpen(true)}
            className="h-7 w-7 ml-auto cursor-pointer text-blue-500 hover:text-blue-600"
          />
        </div>
        {historyOpen && (
          <div ref={historyPanelRef} className="px-4">
            <div className="w-full mt-1 max-h-[260px] overflow-y-auto bg-popover border rounded-md shadow-md z-50">
              {searchHistory.length === 0 && (
                <p className="text-xs p-3 text-muted-foreground">
                  No search history
                </p>
              )}
              {searchHistory.length > 0 &&
                filteredSearchHistory.length === 0 && (
                  <p className="text-xs p-3 text-muted-foreground">
                    No{" "}
                    {activeSearchStatus === "1" ? "evaluation" : "interaction"}{" "}
                    search history
                  </p>
                )}
              {filteredSearchHistory.map((h, index) => {
                const payload = h.payload;
                const from = formatRecentSearchRange(payload.fromDate);
                const to = formatRecentSearchRange(payload.toDate);
                const time = formatRecentSearchDateTime(h.createdAt);
                const filterList = formatHistoryFilterList(payload);
                const searchTypeLabel =
                  getSearchTypeFromPayload(payload) === "evaluation"
                    ? "Evaluation"
                    : "Interaction";
                const viewLabel =
                  payload.viewLabel ||
                  (searchTypeLabel === "Evaluation"
                    ? "Evaluations"
                    : "Interactions");

                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      applyHistorySearch(payload);
                      setHistoryOpen(false);
                    }}
                    className={`cursor-pointer px-4 py-2 hover:bg-muted flex items-center gap-2 text-xs w-full overflow-hidden ${
                      index !== 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span className="text-muted-foreground shrink-0 w-5">
                      {index + 1}.
                    </span>

                    <span className="text-primary font-semibold whitespace-nowrap shrink-0">
                      {time}
                    </span>

                    <span className="text-muted-foreground shrink-0">|</span>

                    <span className="text-[10px] font-medium uppercase tracking-wide shrink-0 text-blue-600">
                      {searchTypeLabel}
                    </span>

                    <span className="text-muted-foreground shrink-0">|</span>

                    <span className="text-muted-foreground whitespace-nowrap shrink-0">
                      View: {viewLabel}
                    </span>

                    <span className="text-muted-foreground shrink-0">|</span>

                    {from && to && (
                      <>
                        <span className="text-muted-foreground whitespace-nowrap shrink-0">
                          {from} → {to}
                        </span>
                        {filterList.length > 0 && (
                          <span className="text-muted-foreground shrink-0">
                            |
                          </span>
                        )}
                      </>
                    )}

                    {filterList.length > 0 && (
                      <span className="text-muted-foreground truncate">
                        {filterList.join(" | ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap space-x-2 mt-4 ml-3">
          {Object.entries(draftColumnFilters).map(([key, value]) => (
            <FilterBadge
              key={key}
              filterKey={key}
              label={filterLabels[key] || key}
              value={value}
              onRemove={handleRemoveBadge}
            />
          ))}
        </div>
      </div>

      {modalOpen && (
        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            if (!open) resetModalState();
            setModalOpen(open);
          }}
        >
          <DialogContent>
            <DialogTitle>
              Select{" "}
              {filterTitles[currentFilter] ||
                currentFilter.charAt(0).toUpperCase() +
                  currentFilter
                    .slice(1)
                    .replace(/([A-Z])/g, " $1")
                    .trim()}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Filter options for selected filter column.
            </DialogDescription>
            {currentFilter === "organizationName" ? (
              <Select
                options={organizationTreeOptions}
                styles={customStyles}
                value={tempSelectedOptions}
                onChange={handleOrganizationChange}
                isClearable
                isMulti={true}
                className="text-xs"
                isSearchable={true}
                placeholder="Select an organization"
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                components={{
                  Option: (props) => (
                    <components.Option {...props}>
                      <div className="flex items-center">
                        <span
                          className={`w-4 h-4 mr-2 inline-flex border rounded justify-center items-center
  ${props.isSelected ? "border-green-600" : "border-gray-500"}`}
                        >
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
                    const maxToShow = 2;
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
            ) : currentFilter === "agentName" ? (
              <AgentDDL
                isMulti={true}
                value={tempAgentNameOptions}
                onChange={(selectedOptions) =>
                  setTempAgentNameOptions(selectedOptions || [])
                }
              />
            ) : currentFilter === "instanceName" ? (
              <InstanceNameDDL
                isMulti={true}
                value={tempInstanceNameOptions}
                onChange={(selectedOptions) =>
                  setTempInstanceNameOptions(selectedOptions || [])
                }
              />
            ) : // ) : currentFilter === "platformIds" ? (
            //   <PlatformDDL
            //     isMulti={true}
            //     value={tempPlatformOptions}
            //     onChange={(selectedOptions) =>
            //       setTempPlatformOptions(selectedOptions || [])
            //     }
            //   />
            currentFilter === "channelType" ? (
              <ChannelTypeDDL
                isMulti={true}
                value={tempChannelTypeOptions}
                onChange={(selectedOptions) =>
                  setTempChannelTypeOptions(selectedOptions || [])
                }
              />
            ) : currentFilter === "callDuration" ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={tempDurationOperator}
                    onChange={(e) => {
                      setTempDurationOperator(e.target.value);
                      setTempDurationValue2("");
                    }}
                    className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="=">=&nbsp;&nbsp;(equal to)</option>
                    <option value="<">&lt;&nbsp;&nbsp;(less than)</option>
                    <option value=">">&gt;&nbsp;&nbsp;(greater than)</option>
                    <option value="<=">&lt;= (less than or equal)</option>
                    <option value=">=">&gt;= (greater than or equal)</option>
                    <option value="between">Between</option>
                  </select>

                  <Input
                    type="number"
                    min={0}
                    value={tempDurationValue}
                    onChange={(e) => setTempDurationValue(e.target.value)}
                    placeholder={
                      tempDurationOperator === "between"
                        ? "From (sec)"
                        : "Enter seconds"
                    }
                    className="flex-1"
                  />

                  {tempDurationOperator === "between" && (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        to
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={tempDurationValue2}
                        onChange={(e) => setTempDurationValue2(e.target.value)}
                        placeholder="To (sec)"
                        className="flex-1"
                      />
                    </>
                  )}

                  {tempDurationOperator !== "between" && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      sec
                    </span>
                  )}
                </div>

                {tempDurationValue && (
                  <p className="text-xs text-muted-foreground">
                    {tempDurationOperator === "between" && tempDurationValue2
                      ? `Filter: duration between ${tempDurationValue} sec and ${tempDurationValue2} sec`
                      : `Filter: duration ${tempDurationOperator} ${tempDurationValue} sec`}
                  </p>
                )}
              </div>
            ) : (
              <Input
                type="text"
                value={modalSearchValue}
                maxLength={50}
                onChange={(e) => {
                  let value = e.target.value;

                  setModalSearchValue(value);
                }}
                placeholder={
                  filterPlaceholders[currentFilter] || `Enter ${currentFilter}`
                }
              />
            )}
            <div className="flex justify-end mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  resetModalState();
                  setModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleModalSearch}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-4 py-2 overflow-hidden">
        <Suspense fallback={<div className="text-xs">Loading...</div>}>
          {hasPrivilege(1) ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex justify-end mb-2 gap-2">
                {hasSearched &&
                  dateRange.startDate &&
                  dateRange.endDate &&
                  hasPrivilege(29) && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleDownloadAllInteractions}
                          disabled={
                            downloadLoading ||
                            downloadJob?.status === "running" ||
                            downloadJob?.status === "cancelling"
                          }
                          className="bg-[#1a76d1] hover:bg-[#2C2D3F] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-md shadow-sm"
                          title="Download all matching recordings"
                        >
                          <span className="inline-flex items-center gap-1">
                            <RiDownloadFill
                              className={
                                downloadLoading
                                  ? "h-3.5 w-3.5 animate-spin"
                                  : "h-3.5 w-3.5"
                              }
                            />
                            <span>Download All</span>
                          </span>
                        </button>
                      </div>

                      {allSelectedInteractionIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDownloadSelectedInteractions}
                            disabled={
                              downloadLoading ||
                              downloadJob?.status === "running" ||
                              downloadJob?.status === "cancelling"
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-md shadow-sm"
                            title="Download selected recordings"
                          >
                            Download ({allSelectedInteractionIds.length})
                          </button>
                          <button
                            onClick={resetSelections}
                            disabled={downloadLoading}
                            className="bg-gray-400 hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-md shadow-sm"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  )}
              </div>
              {hasSearched && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <DataTable
                    key={tableKey}
                    data={interactions}
                    columns={tableColumns}
                    meta={{
                      onPlayAudio: handlePlayAudio,
                      onRestoreAudio: handleRestoreAudio,
                      glacierStatuses,
                      glacierLoading,
                    }}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={
                      handleInteractionColumnVisibilityChange
                    }
                    columnOrder={columnOrder}
                    onColumnOrderChange={handleInteractionColumnOrderChange}
                    rowIdKey={getInteractionRowId}
                    selectableRows={true}
                    rowClickSelection={true}
                    selectColumnLabel="Select"
                    selectedRowIds={selectedInteractionIds[currentPage] || []}
                    onSelectedRowIdsChange={(ids) => {
                      setSelectedInteractionIds((prev) => ({
                        ...prev,
                        [currentPage]: ids,
                      }));

                      const selectedRows = interactions.filter((row, index) =>
                        ids.includes(String(getInteractionRowId(row, index))),
                      );

                      setSelectedRowsMap((prev) => ({
                        ...prev,
                        [currentPage]: selectedRows,
                      }));
                    }}
                    loading={loading}
                    onRowClick={handleInteractionRowClick}
                    exportType="Interaction"
                    allowedExportTypes={allowedExportTypes}
                    daterange={dateRange}
                    filters={columnSearchValues}
                    agentNameFilter={agentNameOptions}
                    formFilter={formOptions}
                    evaluatorFilter={evaluatorOptions}
                    platformFilter={platformOptions}
                    OrganizationFilter={selectedDropdownOptions}
                    exportStatus={status}
                    currentPageNum={currentPage}
                    itemsPerPage={itemsPerPage}
                    privilegeId={privilegeId}
                    fillHeight={true}
                  />

                  {count >= 0 && (
                    <DataTablePagination
                      className="shrink-0 border-t bg-background pt-3"
                      totalRecords={count}
                      currentPageNum={currentPage}
                      itemsPerPage={itemsPerPage}
                      loading={loading}
                      onPageChange={handlePageChange}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </Suspense>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Help & FAQ</DialogTitle>

          <div className="text-sm space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2">
            <div className="p-3 bg-muted rounded-md border border-border">
              <p className="text-xs text-muted-foreground">
                When you first open this page, no data is shown. Use the date
                range picker and filters above, then click{" "}
                <strong>Search</strong> to load interactions.
              </p>
            </div>
            <div>
              <p className="font-semibold">1. Default Date Range</p>
              <p className="text-muted-foreground">
                By default, the last <strong>30 days</strong> are pre-selected.
                No data loads until you click <strong>Search</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">
                2. Filters and 90-Day Search Window
              </p>
              <p className="text-muted-foreground">
                When any filter (Agent Name, Organization, Extension, Call
                Duration, Form, Evaluator) is applied, the search window
                automatically expands to <strong>90 days</strong>. Removing all
                such filters resets the window back to <strong>30 days</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">
                3. UCID, Call ID, and ANI/DNIS Filters
              </p>
              <p className="text-muted-foreground">
                These three filters bypass the date range entirely and search
                across <strong>365 days</strong>. While any of these is active,
                the date picker is overridden. Removing them restores your
                previous date range.
              </p>
            </div>

            <div>
              <p className="font-semibold">4. Call Duration Filter</p>
              <p className="text-muted-foreground">
                Filter interactions by duration in seconds. Supported operators:{" "}
                <strong>=</strong> (equal), <strong>&lt;</strong> (less than),{" "}
                <strong>&gt;</strong> (greater than), <strong>&lt;=</strong>{" "}
                (less than or equal), <strong>&gt;=</strong> (greater than or
                equal), and <strong>Between</strong> (specify a from and to
                value in seconds, e.g. between 30 and 70 sec).
              </p>
            </div>

            <div>
              <p className="font-semibold">5. Recent Searches</p>
              <p className="text-muted-foreground">
                Click <strong>Recent Searches</strong> to view and re-apply your
                last searches including all filters and date ranges.
              </p>
            </div>

            <div>
              <p className="font-semibold">6. Interactions vs Evaluations</p>
              <p className="text-muted-foreground">
                Use the dropdown to switch between <strong>Interactions</strong>{" "}
                view (call records) and <strong>Evaluations</strong> view
                (evaluated calls with form and evaluator filters).
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => setHelpOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={noAudioOpen} onOpenChange={setNoAudioOpen}>
        <DialogContent>
          <DialogTitle>No Audio Available</DialogTitle>
          <p className="text-sm text-muted-foreground">
            This call does not have an audio recording.
          </p>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setNoAudioOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={glacierInfoOpen} onOpenChange={setGlacierInfoOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>How Recording Downloads Work</DialogTitle>
          <div className="text-sm space-y-3 mt-2 text-muted-foreground">
            <p>
              {
                "Recordings are stored in AWS Glacier Deep Archive, so they aren’t always instantly available."
              }
            </p>

            <div className="p-3 bg-muted rounded-md border border-border space-y-2">
              <p className="text-xs">
                Example: out of <strong>1000</strong> matching calls —{" "}
                <strong>300</strong> are ready, <strong>200</strong> are already
                restoring, and <strong>500</strong> haven’t been requested yet.
              </p>
            </div>

            <ol className="list-decimal pl-5 space-y-2">
              <li>
                The <strong>300 ready</strong> recordings download immediately
                to your folder.
              </li>
              <li>
                A summary then tells you: 300 downloaded, 200 are restoring
                (typically ready in <strong>12–48 hours</strong>), and 500
                haven’t been started yet.
              </li>
              <li>
                You’ll be asked if you want to{" "}
                <strong>restore the remaining 500</strong>.
              </li>
              <li>
                If you choose yes, those 500 are queued for restoration and
                you’ll get an <strong>email right away</strong> confirming
                they’re restoring.
              </li>
              <li>
                Once Glacier finishes restoring them, you’ll get a{" "}
                <strong>second email</strong> letting you know they’re ready to
                play or download.
              </li>
            </ol>

            <p className="text-xs italic">
              You never need to keep this page open while waiting — restoration
              happens in the background and you’ll be notified by email.
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setGlacierInfoOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(glacierPreflight)}
        onOpenChange={(open) => {
          if (!open) setGlacierPreflight(null);
        }}
      >
        <DialogContent>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Recording Availability</DialogTitle>
            <button
              type="button"
              onClick={() => setGlacierInfoOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              title="How downloads & restores work"
            >
              <HiMiniInformationCircle className="h-4 w-4" />
              <span className="sr-only">How downloads & restores work</span>
            </button>
          </div>
          {glacierPreflight && (
            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">
                Out of {glacierPreflight.totalMatching} matching call(s) for{" "}
                {glacierPreflight.dateRangeLabel}:
              </p>
              <ul className="text-xs space-y-1 list-disc pl-5">
                <li>
                  <strong>{glacierPreflight.readyCount}</strong>{" "}
                  {glacierPreflight.readyCount === 1 ? "was" : "were"} ready and{" "}
                  {glacierPreflight.readyCount === 1 ? "has" : "have"} been
                  downloaded to your folder.
                </li>
                <li>
                  <strong>{glacierPreflight.retrieving.length}</strong>{" "}
                  {glacierPreflight.retrieving.length === 1 ? "is" : "are"}{" "}
                  already restoring from Glacier — usually ready in 12 to 48
                  hours.
                </li>
                <li>
                  {`${glacierPreflight.needsRestore.length} ${
                    glacierPreflight.needsRestore.length === 1
                      ? "hasn’t"
                      : "haven’t"
                  } been restored yet.`}
                </li>
                {glacierPreflight.unavailable.length > 0 && (
                  <li>
                    <strong>{glacierPreflight.unavailable.length}</strong>{" "}
                    couldn’t be checked and will be skipped.
                  </li>
                )}
              </ul>

              {glacierPreflight.needsRestore.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground font-medium">
                    Do you want to start restoring the remaining{" "}
                    {glacierPreflight.needsRestore.length} recording
                    {glacierPreflight.needsRestore.length === 1 ? "" : "s"}?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You’ll get an email once restoration starts, and another
                    when they’re ready to play or download.
                  </p>
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      disabled={isRestoringBulk}
                      onClick={handleGlacierPreflightRestoreRemaining}
                    >
                      {isRestoringBulk ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Restoring...
                        </>
                      ) : (
                        `Yes, restore the ${glacierPreflight.needsRestore.length} remaining`
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={isRestoringBulk}
                      onClick={() => setGlacierPreflight(null)}
                    >
                      No, not now
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setGlacierPreflight(null)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InteractionPlayer
        interactionId={selectedInteractionId}
        fileLocation={selectedInteractionMeta?.fileLocation ?? null}
        fileSourceType={selectedInteractionMeta?.fileSourceType ?? null}
        onClose={() => {
          setSelectedInteractionId(null);
          setSelectedInteractionMeta(null);
        }}
      />

      {/* FloatingPlayer removed in favor of modal player */}
    </div>
  );
};
export default withAuth(InteractionPage);
