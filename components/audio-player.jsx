"use client";

import CryptoJS from "crypto-js";
import ReactDOM from "react-dom";
import {
  Pause, Play, Maximize2, Minimize2, User, Headset,
  Volume2, VolumeX, MessageSquare, Check, X, Pencil,
  Trash2, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";
import { PRIVILEGES } from "@/lib/constants/privileges";
import { Button } from "@/components/ui/button";

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const isAudioFile = (ext) =>
  ["mp3", "wav", "ogg", "aac", "m4a"].includes((ext || "").toLowerCase());
const isVideoFile = (ext) =>
  ["mp4", "mkv", "m4v", "avi", "mov", "3gp", "flv", "wmv", "webm"].includes((ext || "").toLowerCase());
const getMediaErrorMessage = (error, isVideo) => {
  if (!error) return isVideo ? "No video available." : "No audio available.";
  switch (error.code) {
    case 1:
      return "Playback aborted.";
    case 2:
      return "Network error: Failed to download media.";
    case 3:
      return "Decode error: Media file is corrupted.";
    case 4:
      return isVideo
        ? "Format not supported: Your browser cannot play this video format (e.g. AVI)."
        : "Format not supported: Your browser cannot play this audio format.";
    default:
      return isVideo ? "Unknown video error." : "Unknown audio error.";
  }
};
const getUser = () => {
  try {
    const b = CryptoJS.AES.decrypt(sessionStorage.getItem("user") || "", "");
    return JSON.parse(b.toString(CryptoJS.enc.Utf8) || "{}");
  } catch { return {}; }
};

/**
 * Module-level layout cache: Map<interactionId, "type3" | "type2">
 *
 * Lives for the entire page session. Immune to component remounts, React Strict Mode
 * double-mounting, and all async prop-arrival timing issues.
 *
 * Rules:
 *  - Once an interactionId is cached as "type3" it NEVER reverts to "type2".
 *  - The cache is set as soon as we see a non-null transcriptionFilePath for that id.
 */
const _layoutCache = new Map();
/* ─── Parse transcription JSON → segments ─────────────────── */
function parseTranscriptionData(data) {
  if (!data || data.notFound || data.error) return [];
  const parseTime = (t) => parseFloat((t || "0s").replace("s", ""));

  function normalizeRole(raw) {
    const r = (raw || "UNKNOWN").toUpperCase().trim();
    if (r === "CALLER" || r === "AGENT" || r === "SPEAKER_1" || r === "SPK_0") return "AGENT";
    if (r === "RECEIVER" || r === "CUSTOMER" || r === "CALLEE" || r === "SPEAKER_2" || r === "SPK_1") return "CUSTOMER";
    return r;
  }

  // Format A: GCP responseContents
  if (data.responseContents || data?.data?.responseContents) {
    const contents = data.responseContents || data.data.responseContents;
    return contents.map((item, idx) => {
      const rec = item?.recognitionResult || item;
      const role = normalizeRole(rec?.role || rec?.speaker);
      const alt = (rec?.alternatives || [])[0] || {};
      const words = (alt.words || []).map((w) => ({
        text: w.word || w.text || "",
        start: (w.start_time?.seconds || 0) + (w.start_time?.nanos || 0) / 1e9,
        end: (w.end_time?.seconds || 0) + (w.end_time?.nanos || 0) / 1e9,
      }));
      return { id: idx, role, words, transcript: alt.transcript || "" };
    });
  }

  // Format B: Google STT results with speakerTag
  if (data.results) {
    const defaultSpeakerMap = { 1: "AGENT", 2: "CUSTOMER" };
    const grouped = [];
    (data.results || []).forEach((result) => {
      const alt = (result.alternatives || [])[0];
      if (!alt) return;
      const tag = (alt.words || [])[0]?.speakerTag ?? 0;
      const role = normalizeRole(alt.role || result.role || defaultSpeakerMap[tag] || `SPEAKER_${tag}`);
      const words = (alt.words || []).map((w) => ({
        text: w.word || "",
        start: parseTime(w.startTime),
        end: parseTime(w.endTime),
      }));
      const last = grouped[grouped.length - 1];
      if (last && last.role === role) {
        last.words.push(...words);
        last.transcript += " " + (alt.transcript || "");
      } else {
        grouped.push({ id: grouped.length, role, words, transcript: alt.transcript || "" });
      }
    });
    return grouped;
  }

  // Format C: sentence/utterance-level segments
  if (Array.isArray(data.segments) || Array.isArray(data.utterances)) {
    const items = data.segments || data.utterances;
    return items.map((item, idx) => ({
      id: idx,
      role: normalizeRole(item.speaker || item.role || item.channel || "SPEAKER"),
      transcript: item.text || item.transcript || "",
      start: item.start ?? item.startTime ?? undefined,
      end: item.end ?? item.endTime ?? undefined,
      words: (item.words || []).map((w) => ({
        text: w.word || w.text || "",
        start: w.start ?? w.startTime ?? undefined,
        end: w.end ?? w.endTime ?? undefined,
      })).filter((w) => w.start !== undefined),
    }));
  }

  return [];
}

/* ─── Role colors ─────────────────────────────────────────── */
function buildRoleStyles() {
  return {
    AGENT: {
      activeBg: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.5)",
      iconBg: "rgba(59,130,246,0.18)",
      labelColor: "#2563eb",
      labelColorDark: "#60a5fa",
    },
    CUSTOMER: {
      activeBg: "rgba(249,115,22,0.12)",
      border: "1px solid rgba(249,115,22,0.5)",
      iconBg: "rgba(249,115,22,0.18)",
      labelColor: "#ea580c",
      labelColorDark: "#fb923c",
    },
  };
}

const FALLBACK_ROLE_STYLES = [
  { activeBg: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.4)", iconBg: "rgba(168,85,247,0.18)", labelColor: "#9333ea", labelColorDark: "#c084fc" },
  { activeBg: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", iconBg: "rgba(245,158,11,0.18)", labelColor: "#d97706", labelColorDark: "#fbbf24" },
];
function getRoleStyle(role, roleStyles) {
  const key = String(role).toUpperCase();
  if (roleStyles[key]) return roleStyles[key];
  const idx = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % FALLBACK_ROLE_STYLES.length;
  return FALLBACK_ROLE_STYLES[idx];
}

/* ─── Dark mode hook ──────────────────────────────────────── */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ─── TranscriptionCard ───────────────────────────────────── */
const TranscriptionCard = ({ segments, currentTime, loading, fillHeight = false, onSeek }) => {
  const scrollRef = useRef(null);
  const segmentRefs = useRef({});
  const activeSegIdRef = useRef(null);
  const isDark = useIsDark();
  const [roleStyles, setRoleStyles] = useState(() =>
    typeof window !== "undefined" ? buildRoleStyles() : {}
  );

  useEffect(() => {
    const update = () => setRoleStyles(buildRoleStyles());
    window.addEventListener("branding:update", update);
    return () => window.removeEventListener("branding:update", update);
  }, []);

  const highlightMode = useMemo(() => {
    if (!segments.length) return "speaker";
    const seg = segments[0];
    if (seg.words?.length && seg.words[0]?.start !== undefined && seg.words[0]?.end !== undefined)
      return "word";
    if (seg.start !== undefined && seg.end !== undefined)
      return "sentence";
    return "speaker";
  }, [segments]);

  const activeSegId = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (highlightMode === "sentence") {
        if (seg.start !== undefined && currentTime >= seg.start && currentTime <= (seg.end ?? seg.start) + 0.5)
          return seg.id;
      } else {
        const first = seg.words?.[0];
        const last = seg.words?.[seg.words.length - 1];
        if (first && last && currentTime >= first.start && currentTime <= last.end + 0.5)
          return seg.id;
      }
    }
    return null;
  }, [segments, currentTime, highlightMode]);

  const activeWordIdx = useMemo(() => {
    if (highlightMode !== "word" || activeSegId === null) return -1;
    const seg = segments.find((s) => s.id === activeSegId);
    if (!seg) return -1;
    for (let i = seg.words.length - 1; i >= 0; i--) {
      const w = seg.words[i];
      if (currentTime >= w.start && currentTime <= w.end + 0.1) return i;
    }
    return -1;
  }, [segments, currentTime, activeSegId, highlightMode]);

  useEffect(() => {
    if (activeSegId === null || activeSegId === activeSegIdRef.current) return;
    activeSegIdRef.current = activeSegId;
    const el = segmentRefs.current[activeSegId];
    const container = scrollRef.current;
    if (!el || !container) return;
    const top = Math.max(0, el.offsetTop - container.offsetTop - 8);
    container.scrollTo({ top, behavior: "smooth" });
  }, [activeSegId]);

  const containerHeight = fillHeight ? 9999 : 300;

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto px-2 space-y-1 scrollbar-theme${fillHeight ? " flex-1 min-h-0" : ""}`}
      style={{
        maxHeight: fillHeight ? undefined : `${containerHeight}px`,
        overflowY: "auto",
        paddingTop: "6px",
        paddingBottom: fillHeight ? "40px" : `${containerHeight / 2}px`,
      }}
    >
      {loading ? (
        <p className="text-muted-foreground italic text-xs text-center py-3">Loading transcription...</p>
      ) : segments.length ? segments.map((seg) => {
        const isActive = seg.id === activeSegId;
        const rs = getRoleStyle(seg.role, roleStyles);
        const isAgent = String(seg.role).toLowerCase().includes("agent");

        return (
          <div key={seg.id}
            ref={(el) => { segmentRefs.current[seg.id] = el; }}
            className={`flex gap-2 items-start px-2 py-1.5 rounded-lg transition-all duration-200 hover:bg-muted/40${onSeek ? " cursor-pointer" : ""}`}
            style={isActive ? { background: rs.activeBg, border: rs.border, borderLeft: `3px solid ${isDark ? rs.labelColorDark : rs.labelColor}` } : { borderLeft: "3px solid transparent" }}
            onClick={() => {
              if (!onSeek) return;
              const t = highlightMode === "sentence"
                ? (seg.start ?? seg.words?.[0]?.start ?? 0)
                : (seg.words?.[0]?.start ?? seg.start ?? 0);
              onSeek(t);
            }}>
            <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: rs.iconBg }}>
              {isAgent
                ? <Headset className="w-2.5 h-2.5 text-foreground" />
                : <User className="w-2.5 h-2.5 text-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold tracking-wide"
                style={{ color: isDark ? rs.labelColorDark : rs.labelColor }}>
                {seg.role.toUpperCase()}
              </span>
              {highlightMode === "word" && seg.words?.length ? (
                <p className="mt-0.5 text-xs leading-snug break-words">
                  {seg.words.map((w, wi) => {
                    const isActiveWord = isActive && wi === activeWordIdx;
                    return (
                      <span key={wi}
                        onClick={(e) => {
                          if (!onSeek || w.start === undefined) return;
                          e.stopPropagation();
                          onSeek(w.start);
                        }}
                        className={`transition-all duration-100 ${onSeek && w.start !== undefined ? "cursor-pointer hover:underline hover:text-foreground" : ""} ${isActiveWord
                          ? "font-bold text-foreground bg-primary/20 rounded px-0.5"
                          : isActive
                            ? "text-foreground"
                            : "text-muted-foreground"
                          }`}>
                        {w.text}{" "}
                      </span>
                    );
                  })}
                </p>
              ) : (
                <p className={`mt-0.5 text-xs leading-snug break-words transition-all duration-150
                  ${isActive ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                  {seg.words?.length ? seg.words.map((w) => w.text).join(" ") : seg.transcript}
                </p>
              )}
            </div>
          </div>
        );
      }) : (
        <p className="text-muted-foreground italic text-xs text-center py-3">No transcription available for this interaction.</p>
      )}
    </div>
  );
};

/* ─── AnnotationTimeline ──────────────────────────────────── */
const CLUSTER_GAP = 1.0;

const AnnotationTimeline = ({ annotations, duration, time = 0, onDotClick, onTimelineClick, rangeSelection, hasViewAnnotation, hasEditAnnotation, hasCreateAnnotation }) => {
  const [hoveredGroup, setHoveredGroup] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const [pickerCluster, setPickerCluster] = React.useState(null);

  // Reset picker/hover when annotations change (navigation, reload)
  React.useEffect(() => { setPickerCluster(null); setHoveredGroup(null); }, [annotations]);

  // ── Build clusters ────────────────────────────────────────────────────────
  const valid = React.useMemo(() => annotations.filter((ann) => {
    if (!ann.text?.trim()) return false;
    if (!isFinite(ann.timeAt) || ann.timeAt < 0) return false;
    if (duration > 0 && ann.timeAt > duration) return false;
    return true;
  }), [annotations, duration]);

  const rangeAnns = React.useMemo(() =>
    valid.filter((a) => a.endTime && isFinite(a.endTime) && a.endTime > a.timeAt),
    [valid]);

  const pointAnns = React.useMemo(() =>
    valid.filter((a) => !(a.endTime && isFinite(a.endTime) && a.endTime > a.timeAt))
      .slice().sort((a, b) => a.timeAt - b.timeAt),
    [valid]);

  const pointClusters = React.useMemo(() => {
    const clusters = [];
    for (const ann of pointAnns) {
      const last = clusters[clusters.length - 1];
      if (last && ann.timeAt - last.timeAt <= CLUSTER_GAP) {
        last.members.push(ann);
      } else {
        clusters.push({ key: ann.id, timeAt: ann.timeAt, members: [ann] });
      }
    }
    return clusters;
  }, [pointAnns]);

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  const tooltipEl = React.useMemo(() => {
    if (!hoveredGroup || pickerCluster) return null;
    const cluster = pointClusters.find((c) => c.key === hoveredGroup)
      ?? rangeAnns.map((a) => ({ key: a.id, timeAt: a.timeAt, members: [a] })).find((c) => c.key === hoveredGroup);
    if (!cluster) return null;
    const TOOLTIP_W = 260;
    const left = Math.min(Math.max(tooltipPos.x - TOOLTIP_W / 2, 8), window.innerWidth - TOOLTIP_W - 8);
    const top = tooltipPos.y - 8;
    return (
      <div className="fixed z-[99999] pointer-events-none"
        style={{ left, top, transform: "translateY(-100%)", width: TOOLTIP_W }}>
        <div className="rounded-xl border border-border bg-popover shadow-xl px-3 py-2 flex flex-col gap-2">
          {cluster.members.map((ann, idx) => {
            const canEdit = hasEditAnnotation || (ann.isOwn !== false && hasCreateAnnotation);
            const canSeeOthers = hasViewAnnotation || hasEditAnnotation;
            return (
              <div key={ann.id} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-primary tabular-nums">
                    {ann.endTime ? `${fmt(ann.timeAt)} – ${fmt(ann.endTime)}` : fmt(ann.timeAt)}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ann.saved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                    {ann.saved ? "saved" : "unsaved"}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-snug break-words">{ann.text}</p>
                {ann.saved && (canSeeOthers || ann.isOwn !== false) && ann.creatorName && (
                  <p className="text-[10px] text-muted-foreground">
                    Created by: <span className="font-medium text-foreground">{ann.creatorName}</span>
                  </p>
                )}
                {ann.saved && (canSeeOthers || ann.isOwn !== false) && ann.modifiedBy && (
                  <p className="text-[10px] text-muted-foreground">
                    Edited by: <span className="font-medium text-foreground">{ann.modifiedBy}</span>
                  </p>
                )}
                {canEdit && (
                  <p className="text-[9px] text-primary/70 mt-0.5">
                    {cluster.members.length > 1 ? "Select to edit" : ""}
                  </p>
                )}
                {idx < cluster.members.length - 1 && <div className="border-t border-border mt-1" />}
              </div>
            );
          })}
        </div>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredGroup, pickerCluster, tooltipPos, pointClusters, rangeAnns, hasEditAnnotation, hasCreateAnnotation, hasViewAnnotation]);

  // ── Picker modal ──────────────────────────────────────────────────────────
  const pickerEl = React.useMemo(() => {
    if (!pickerCluster) return null;
    const PICKER_W = 280;
    const left = Math.min(Math.max(pickerCluster.x - PICKER_W / 2, 8), window.innerWidth - PICKER_W - 8);
    const top = pickerCluster.y - 8;
    return (
      <>
        <div className="fixed inset-0 z-[99998]"
          onClick={(e) => { e.stopPropagation(); setPickerCluster(null); }} />
        <div className="fixed z-[99999] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
          style={{ left, top, transform: "translateY(-100%)", width: PICKER_W }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <span className="text-[11px] font-semibold text-foreground">
              {pickerCluster.members.length} annotations at {fmt(pickerCluster.members[0].timeAt)}
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); setPickerCluster(null); }}
              className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              ✕
            </button>
          </div>
          <div className="flex flex-col divide-y divide-border max-h-64 overflow-y-auto">
            {pickerCluster.members
              .filter((ann) => ann.isOwn !== false || hasViewAnnotation || hasEditAnnotation)
              .map((ann) => {
                const canEdit = hasEditAnnotation || (ann.isOwn !== false && hasCreateAnnotation);
                const canSeeOthers = hasViewAnnotation || hasEditAnnotation;
                return (
                  <button key={ann.id} type="button" disabled={!canEdit}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickerCluster(null);
                      setTimeout(() => onDotClick(ann), 0);
                    }}
                    className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition
                      ${canEdit ? "hover:bg-muted/60 cursor-pointer" : "opacity-50 cursor-default"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-primary tabular-nums">
                        {ann.endTime ? `${fmt(ann.timeAt)} – ${fmt(ann.endTime)}` : fmt(ann.timeAt)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ann.saved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                        {ann.saved ? "saved" : "unsaved"}
                      </span>
                    </div>
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{ann.text}</p>
                    {ann.saved && (canSeeOthers || ann.isOwn !== false) && ann.creatorName && (
                      <p className="text-[10px] text-muted-foreground">
                        Created by: <span className="font-medium">{ann.creatorName}</span>
                      </p>
                    )}
                    {ann.saved && (canSeeOthers || ann.isOwn !== false) && ann.modifiedBy && (
                      <p className="text-[10px] text-muted-foreground">
                        Edited by: <span className="font-medium">{ann.modifiedBy}</span>
                      </p>
                    )}
                    {canEdit && <span className="text-[9px] text-primary mt-0.5">Tap to edit / delete →</span>}
                  </button>
                );
              })}
          </div>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerCluster, hasViewAnnotation, hasEditAnnotation, hasCreateAnnotation, onDotClick]);

  const handleMouseEnter = React.useCallback((key, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredGroup(key);
  }, []);

  const handleDotClickInternal = React.useCallback((cluster, e) => {
    e.stopPropagation();
    if (cluster.members.length === 1) {
      onDotClick(cluster.members[0]);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setPickerCluster({ members: cluster.members, x: rect.left + rect.width / 2, y: rect.top });
    }
  }, [onDotClick]);

  return (
    <div
      className="relative w-full mt-1.5 mb-1 select-none cursor-default"
      style={{ height: "26px" }}
      onClick={(e) => {
        if (!onTimelineClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onTimelineClick(pct * duration);
      }}
    >
      {/* Portals — rendered into document.body to escape any overflow:hidden parent */}
      {tooltipEl && ReactDOM.createPortal(tooltipEl, document.body)}
      {pickerEl && ReactDOM.createPortal(pickerEl, document.body)}

      {/* Horizontal hairline track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border rounded-full" />
      {/* Current progress fill */}
      {duration > 0 && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-primary/50 rounded-l-full"
          style={{ width: `${(time / duration) * 100}%` }}
        />
      )}
      {/* Playback cursor */}
      {duration > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-primary z-50 pointer-events-none"
          style={{ left: `${(time / duration) * 100}%`, transform: "translate(-50%, -50%)" }}
        />
      )}

      {rangeSelection && duration > 0 && (
        <>
          <div className="absolute top-0 h-full bg-primary/20 pointer-events-none"
            style={{
              left: `${(Math.min(rangeSelection.start, rangeSelection.end) / duration) * 100}%`,
              width: `${(Math.abs(rangeSelection.end - rangeSelection.start) / duration) * 100}%`,
            }} />
          <div className="absolute top-0 h-full w-px bg-primary/70 pointer-events-none"
            style={{ left: `${(Math.min(rangeSelection.start, rangeSelection.end) / duration) * 100}%` }} />
          <div className="absolute top-0 h-full w-px bg-primary/70 pointer-events-none"
            style={{ left: `${(Math.max(rangeSelection.start, rangeSelection.end) / duration) * 100}%` }} />
        </>
      )}

      {/* ── Range annotations ── */}
      {rangeAnns.map((ann) => {
        const pct = duration > 0 ? Math.min((ann.timeAt / duration) * 100, 100) : (ann.pct ?? 0);
        const endPct = duration > 0 ? Math.min((ann.endTime / duration) * 100, 100) : 0;
        const isHov = hoveredGroup === ann.id && !pickerCluster;
        return (
          <div key={ann.id} className="absolute top-0 h-full"
            style={{ left: `${pct}%`, width: `${endPct - pct}%`, zIndex: 10, pointerEvents: "none" }}>
            <div className="absolute inset-0 transition-colors duration-150"
              style={{ background: isHov ? "rgba(99,102,241,0.15)" : "transparent", pointerEvents: "none" }} />
            <div className={`absolute top-0 h-full w-px transition-opacity duration-150 ${ann.saved ? "bg-green-500" : "bg-orange-400"}`}
              style={{ left: 0, opacity: isHov ? 1 : 0, pointerEvents: "none" }} />
            <div className={`absolute top-0 h-full w-px transition-opacity duration-150 ${ann.saved ? "bg-green-500" : "bg-orange-400"}`}
              style={{ right: 0, opacity: isHov ? 1 : 0, pointerEvents: "none" }} />
            <div className="absolute top-0 h-full cursor-pointer"
              style={{ left: 0, width: "16px", transform: "translateX(-50%)", zIndex: 20, pointerEvents: "auto" }}
              onClick={(e) => { e.stopPropagation(); onDotClick(ann); }}
              onMouseEnter={(e) => handleMouseEnter(ann.id, e)}
              onMouseLeave={() => setHoveredGroup(null)}>
              <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-background shadow-md transition-transform ${isHov ? "scale-125" : ""} ${ann.saved ? "bg-green-500" : "bg-orange-400"}`}
                style={{ left: "50%" }} />
            </div>
          </div>
        );
      })}

      {/* ── Clustered point annotations ── */}
      {pointClusters.map((cluster) => {
        const pct = duration > 0 ? Math.min((cluster.timeAt / duration) * 100, 100) : 0;
        const isHov = hoveredGroup === cluster.key && !pickerCluster;
        const count = cluster.members.length;
        const allSaved = cluster.members.every((a) => a.saved);
        const dotColor = allSaved ? "bg-green-500" : "bg-orange-400";
        const dotSize = count > 1 ? "16px" : "12px";

        return (
          <div key={cluster.key}
            className="absolute top-0 h-full cursor-pointer"
            style={{ left: `${pct}%`, width: "20px", transform: "translateX(-50%)", zIndex: 40 }}
            onClick={(e) => handleDotClickInternal(cluster, e)}
            onMouseEnter={(e) => handleMouseEnter(cluster.key, e)}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            {/* Vertical tick */}
            <div className={`absolute top-0 h-full w-px pointer-events-none transition-opacity duration-150 ${isHov ? "opacity-70" : "opacity-0"} ${dotColor}`}
              style={{ left: "50%" }} />
            {/* Dot — fixed size, no scale to prevent layout shift */}
            <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background shadow-md ${dotColor}`}
              style={{ left: "50%", width: dotSize, height: dotSize }} />
            {/* Count badge */}
            {count > 1 && (
              <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[9px] font-bold text-white pointer-events-none select-none"
                style={{ left: "50%", zIndex: 50 }}>
                {count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─── AudioPlayer ─────────────────────────────────────────── */
const AudioPlayer = ({
  AURL,
  filePath,
  fileExtension,
  audioError,
  audioFetching = false,
  grantedPrivileges,
  transcriptionFilePath,
  transcriptionSourceType,
  transcriptionMode = null,
  fileSourceType,
  interactionId,
  callData,
  children,
  onExpand,
  isAudioExpanded,
  formOpen = false,
  sttGenerating = false,
  sttError = null,       // { message, errorCode, retryable } or null
  sttStatus = null,      // "generating" | "done" | "failed" | "no_rule" | "processing"
  onRetryTranscription,  // () => void
  archiveStatus = null,
  onRetrieve,
  showTranscription = false,
  onBack,
  downloadNode,
}) => {
  const audioRef = useRef(null);   // native <audio> element
  const agentCanvasRef = useRef(null); // agent waveform canvas
  const customerCanvasRef = useRef(null); // customer waveform canvas
  const seekBarRef = useRef(null);   // seek bar container for drag
  const videoRef = useRef(null);
  const wasPlaying = useRef(false);
  const resumeAfterNote = useRef(false); // separate from wasPlaying — not touched by audio events
  const noteInputRef = useRef(null);

  const isVideo = isVideoFile(fileExtension);

  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);

  const [segments, setSegments] = useState([]);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [transcriptionRetrieving, setTranscriptionRetrieving] = useState(null);
  const [transcriptionPollTrigger, setTranscriptionPollTrigger] = useState(0);

  const [annotations, setAnnotations] = useState([]);
  const annotationsRef = useRef([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const deletedIdsRef = useRef([]); // snapshot with dbRowId+noteKey for save
  const [existingDbRowId, setExistingDbRowId] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteTimeAt, setNoteTimeAt] = useState(0);
  const [notePct, setNotePct] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editingAnn, setEditingAnn] = useState(null); // full annotation object when editing
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [rangeSelection, setRangeSelection] = useState(null);
  const [clipMode, setClipMode] = useState(false);
  const rangeDragRef = useRef(null);

  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  const hasPlay = useMemo(() => grantedPrivileges?.some((p) => p.PrivilegeId === PRIVILEGES.PLAY_AUDIO), [grantedPrivileges]);
  const hasCreateAnnotation = false;
  const hasViewAnnotation = false;
  const hasEditAnnotation = false;
  const hasDeleteAnnotation = false;
  // hasAnnotation = any annotation interaction is allowed
  const hasAnnotation = false;
  const hasUnsaved = false;

  /* ── Layout Decision (Final Simplified) ───────────────────────────────
   * Always use the "Type 3" layout (Agent/Customer rows).
   * 1. If Transcription exists: Draw real speaker-based waveforms.
   * 2. If No Transcription: Draw random placeholder waveforms (Player 3).
   *
   * Browser-side decoding (Type 2) is completely removed.
   ─────────────────────────────────────────────────────────────────────── */
  const useTranscriptionLayout = true;

  const [localAudioError, setLocalAudioError] = useState(null);

  useEffect(() => {
    setLocalAudioError(null);
  }, [AURL, interactionId]);

  const handleRetrieveTranscription = useCallback(async () => {
    if (
      !transcriptionFilePath ||
      !transcriptionFilePath.trim() ||
      transcriptionFilePath.trim().toUpperCase() === "NULL" ||
      transcriptionFilePath.startsWith("ERROR:") ||
      transcriptionFilePath === "PROCESSING"
    ) return;
    setTranscriptionLoading(true);
    const srcType = transcriptionSourceType || fileSourceType || "local";
    try {
      const res = await fetch(`/api/read-transcription?path=${encodeURIComponent(transcriptionFilePath)}&fileSourceType=${encodeURIComponent(srcType)}&actionType=retrieve`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "retrieving") {
          setTranscriptionRetrieving("retrieving");
          setTranscriptionPollTrigger((prev) => prev + 1);
        }
      } else {
        console.error("Retrieve request failed");
      }
    } catch (err) {
      console.error("[retrieveTranscription] error:", err.message);
    } finally {
      setTranscriptionLoading(false);
    }

    // Synced retrieve call if needed
    if (archiveStatus === "needs_retrieval" && onRetrieve) {
      onRetrieve();
    }
  }, [transcriptionFilePath, transcriptionSourceType, fileSourceType, archiveStatus, onRetrieve]);

  const handleRetrieveCallSynced = useCallback(async () => {
    if (onRetrieve) {
      await onRetrieve();
    }
    if (transcriptionRetrieving === "needs_retrieval") {
      handleRetrieveTranscription();
    }
  }, [onRetrieve, transcriptionRetrieving, handleRetrieveTranscription]);

  const audioUnavailable = (!AURL && !audioFetching) || !!localAudioError || !!audioError;
  const unsupported = AURL && fileExtension && !isAudioFile(fileExtension) && !isVideoFile(fileExtension);
  const showNotice = audioUnavailable || unsupported;
  const noticeText = localAudioError
    ? (isVideo && localAudioError === "No audio at the path." ? "No file at the path." : localAudioError)
    : audioUnavailable
      ? (audioError
        ? (isVideo && audioError === "No audio at the path." ? "No file at the path." : audioError)
        : (isVideo ? "No video available." : "No audio available.")
      )
      : "Unsupported format.";

  // Loading banner clears once audio metadata is ready
  const isLoading = audioFetching || audioLoading || transcriptionLoading;
  const isActuallyLoading = isLoading || (!AURL && audioFetching);
  const mediaLoading = audioFetching || audioLoading || (!AURL && audioFetching);

  /* Load saved annotations */
  const fetchAnnotations = useCallback(() => {
    return; // Annotation feature disabled in this project
    if (!interactionId) return;
    const u = getUser();
    const userId = u?.userId;
    if (!userId) return;
    const viewAll = grantedPrivileges?.some((p) => p.PrivilegeId === PRIVILEGES.VIEW_ANNOTATION) ? "1" : "0";
    fetch(`/api/annotations?interactionId=${interactionId}&userId=${userId}&viewAll=${viewAll}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const dots = [];
        const ownRows = (d.annotations || []).filter((r) => String(r.created_by) === String(userId));
        if (ownRows[0]) setExistingDbRowId(ownRows[0].id);

        (d.annotations || []).forEach((row) => {
          let ann = row.annotation;
          const rowCreator = row.creator_name || String(row.created_by);
          const rowModifier = row.modifier_name || (row.modified_by ? String(row.modified_by) : null);
          const rowIsOwn = String(row.created_by) === String(userId);
          try { ann = typeof ann === "string" ? JSON.parse(ann) : ann; } catch (_) { }

          if (ann?.saved || ann?.dragged) {
            (ann.saved || []).forEach((n, i) => {
              const text = (n.annotation ?? "").trim();
              const timeAt = n.recordingTimestampRaw ?? 0;
              if (!text) return;
              const rawCreator = n.createdBy ? String(n.createdBy) : null;
              const creatorName = (rawCreator && /^\d+$/.test(rawCreator)) ? rowCreator : (rawCreator || rowCreator);
              const rawModifier = n.modifiedBy ? String(n.modifiedBy) : null;
              const modifiedBy = (rawModifier && /^\d+$/.test(rawModifier)) ? (rowModifier || rawModifier) : rawModifier;
              const noteKey = `s:${timeAt}`;
              dots.push({ id: `${row.id}_s${i}`, dbRowId: row.id, noteKey, text, timeAt, endTime: undefined, pct: 0, saved: true, creatorName, modifiedBy, isOwn: rowIsOwn });
            });
            (ann.dragged || []).forEach((n, i) => {
              const text = (n.annotation ?? "").trim();
              const timeAt = n.recordingTimestampStartedRaw ?? 0;
              const rawEnd = n.recordingTimestampEndedRaw ?? 0;
              const endTime = (rawEnd && isFinite(rawEnd) && rawEnd > timeAt) ? rawEnd : undefined;
              if (!text) return;
              const rawCreator = n.createdBy ? String(n.createdBy) : null;
              const creatorName = (rawCreator && /^\d+$/.test(rawCreator)) ? rowCreator : (rawCreator || rowCreator);
              const rawModifier = n.modifiedBy ? String(n.modifiedBy) : null;
              const modifiedBy = (rawModifier && /^\d+$/.test(rawModifier)) ? (rowModifier || rawModifier) : rawModifier;
              const noteKey = `d:${timeAt}:${rawEnd}`;
              dots.push({ id: `${row.id}_d${i}`, dbRowId: row.id, noteKey, text, timeAt, endTime, pct: 0, saved: true, creatorName, modifiedBy, isOwn: rowIsOwn });
            });
          } else if (ann?.notes && Array.isArray(ann.notes)) {
            ann.notes.forEach((n, i) => {
              const text = (n.note ?? n.text ?? "").trim();
              const timeAt = n.recordingTimestamp ?? n.timeAt ?? 0;
              const rawEnd = n.endTimestamp ?? n.endTime ?? 0;
              const endTime = (rawEnd && isFinite(rawEnd) && rawEnd > timeAt) ? rawEnd : undefined;
              if (!text) return;
              dots.push({ id: `${row.id}_${i}`, dbRowId: row.id, noteKey: `s:${timeAt}`, text, timeAt, endTime, pct: 0, saved: true, creatorName: rowCreator, modifiedBy: null, isOwn: rowIsOwn });
            });
          } else {
            const timeAt = typeof ann === "object" ? (ann?.recordingTimestamp ?? ann?.timeAt ?? 0) : 0;
            const text = typeof ann === "object" ? ((ann.text ?? String(ann)).trim()) : String(ann).trim();
            if (!text) return;
            dots.push({ id: String(row.id), dbRowId: row.id, noteKey: `s:${timeAt}`, text, timeAt, pct: 0, saved: true, creatorName: rowCreator, modifiedBy: null, isOwn: rowIsOwn });
          }
        });

        const canSeeOthers = grantedPrivileges?.some(
          (p) => p.PrivilegeId === PRIVILEGES.VIEW_ANNOTATION || p.PrivilegeId === PRIVILEGES.EDIT_ANNOTATION
        );
        const filtered = canSeeOthers ? dots : dots.filter((d) => d.isOwn !== false);
        setAnnotations(filtered);
      }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionId, grantedPrivileges]);

  useEffect(() => {
    if (!interactionId) return;
    const u = getUser();
    if (!u?.userId) return;
    setAnnotations([]);
    setDeletedIds([]);
    setExistingDbRowId(null);
    fetchAnnotations();
  }, [interactionId, grantedPrivileges, fetchAnnotations]);

  // Reset player state when switching interactions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTime(0);
    setShowTranscript(true);
    setDeletedIds([]);
    deletedIdsRef.current = [];
    setSegments([]);
    setExistingDbRowId(null);
    setAudioLoading(true); // Force loading state immediately
  }, [interactionId]);
  useEffect(() => { if (sttGenerating) setShowTranscript(true); }, [sttGenerating]);

  useEffect(() => {
    if (
      !transcriptionFilePath ||
      !transcriptionFilePath.trim() ||
      transcriptionFilePath.trim().toUpperCase() === "NULL" ||
      transcriptionFilePath.startsWith("ERROR:") ||
      transcriptionFilePath === "PROCESSING"
    ) {
      setSegments([]);
      setTranscriptionLoading(false);
      setTranscriptionRetrieving(null);
      return;
    }

    let active = true;
    let timerId = null;

    const load = (isPoll = false) => {
      if (!active) return;
      if (!isPoll) {
        setTranscriptionLoading(true);
        setTranscriptionRetrieving((prev) => (prev === "retrieving" ? "retrieving" : null));
      }
      const srcType = transcriptionSourceType || fileSourceType || "local";
      fetch(`/api/read-transcription?path=${encodeURIComponent(transcriptionFilePath)}&fileSourceType=${encodeURIComponent(srcType)}`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (!active) return;
          if (data.status === "retrieving" || data.status === "needs_retrieval") {
            setTranscriptionRetrieving(data.status);
            setSegments([]);
            if (data.status === "retrieving") {
              // Poll again in 15 seconds
              timerId = setTimeout(() => load(true), 15000);
            }
          } else {
            setTranscriptionRetrieving(null);
            const parsed = parseTranscriptionData(data);
            setSegments(parsed);
            if (parsed.length > 0) setShowTranscript(true);
          }
        })
        .catch(() => {
          if (!active) return;
          setSegments([]);
          setTranscriptionRetrieving(null);
        })
        .finally(() => {
          if (active && !isPoll) setTranscriptionLoading(false);
        });
    };

    load();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [transcriptionFilePath, transcriptionSourceType, fileSourceType, transcriptionPollTrigger]);

  const activeSpeaker = useMemo(() => {
    // Priority 1: real transcription segments — exact word-level timing
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      const first = seg.words[0];
      const last = seg.words[seg.words.length - 1];
      if (first && last && time >= first.start && time <= last.end + 0.5)
        return seg.role;
    }

    return null;
  }, [segments, time]);

  /* ── Native <audio> wiring ─────────────────────────────────────────────── */
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !AURL || isVideo) return;
    el.src = AURL;
    el.load();
    setAudioLoading(true);
    setDuration(0);
    setTime(0);

    const onMeta = () => { setDuration(el.duration || 0); setAudioLoading(false); };
    const onTime = () => setTime(el.currentTime);
    const onPlay = () => { wasPlaying.current = true; setIsPlaying(true); };
    const onPause = () => { wasPlaying.current = false; setIsPlaying(false); };
    const onEnded = () => { wasPlaying.current = false; setIsPlaying(false); setTime(0); el.currentTime = 0; };
    const onErr = (e) => {
      console.error("Audio element error: code =", el.error?.code, "message =", el.error?.message, el.error);
      setAudioLoading(false);
      setLocalAudioError(getMediaErrorMessage(el.error, false));
    };

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onErr);
    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AURL, isVideo]);

  /* ── Web Audio API — background decoding removed ── */
  useEffect(() => {
    // Completely removed browser-side decoding as requested.
    // We only use the "Player 1" look (masked by transcription)
    // or the "Player 3" look (random placeholder).
  }, []);

  /* ── Volume / mute / speed sync ─────────────────────────────────────────── */
  useEffect(() => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
    el.muted = muted;
  }, [volume, muted, isVideo]);

  useEffect(() => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    el.playbackRate = speed;
  }, [speed, isVideo]);

  /* ── Canvas waveform ─────────────────────────────────────────────────────
   * Priority:
   *   1. Stereo audio → ch0 = agent, ch1 = customer (real per-speaker waveform)
   *   2. Mono audio   → same waveform both rows, dimmed where not speaking
   *   3. No peaks yet → transcription-based fake bars (while decoding)
   * ─────────────────────────────────────────────────────────────────────── */
  const drawCanvas = useCallback((canvas, role, color, progressColor, flatLine = false) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const dur = duration;
    ctx.clearRect(0, 0, W, H);

    const BAR_W = 1.5;
    const GAP = 1.5;
    const STEP = BAR_W + GAP;
    const nBars = Math.floor(W / STEP);
    const cx = H / 2;
    const progress = dur > 0 ? time / dur : 0;

    // ── If flatLine (Loading or No Audio), draw a clean dotted line ──
    if (flatLine) {
      ctx.beginPath();
      ctx.setLineDash([2, 2]); // 2px dash, 2px gap
      ctx.moveTo(0, cx);
      ctx.lineTo(W, cx);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.setLineDash([]); // reset
      ctx.globalAlpha = 1;
      return;
    }

    // ── Draw faint baseline ──
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.fillRect(0, cx - 0.5, W, 1);
    ctx.globalAlpha = 1;

    // ── Transcription Masks ──
    const speakingRanges = [];
    if (dur > 0 && segments.length > 0) {
      for (const seg of segments) {
        if (String(seg.role).toUpperCase() !== role.toUpperCase()) continue;
        const start = seg.words?.[0]?.start ?? seg.start ?? 0;
        const end = seg.words?.[seg.words.length - 1]?.end ?? seg.end ?? 0;
        if (end > start) speakingRanges.push({ start, end });
      }
    }
    const isSpeaking = (barTime) => {
      for (const r of speakingRanges) {
        if (barTime >= r.start && barTime <= r.end + 0.05) return true;
      }
      return false;
    };

    // Always use role-specific seed for unique but consistent waveforms (predicted pattern)
    const seed = role.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = (i) => { const x = Math.sin(seed + i * 127.1) * 43758.5453; return x - Math.floor(x); };

    for (let i = 0; i < nBars; i++) {
      const x = i * STEP;
      const pct = i / nBars;
      const played = pct < progress;

      let baseH = (0.15 + rand(i) * 0.55) * H * 0.70;
      baseH = Math.min(baseH, H - 4);

      if (played) {
        ctx.fillStyle = progressColor;
        ctx.globalAlpha = 0.95;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.50;
      }

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, cx - baseH / 2, BAR_W, baseH, 0.8);
      } else {
        ctx.rect(x, cx - baseH / 2, BAR_W, baseH);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Playhead
    if (dur > 0 && progress > 0) {
      const px = progress * W;
      ctx.fillStyle = progressColor;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(px - 1, 0, 2, H);
      ctx.globalAlpha = 1;
    }
  }, [duration, time, segments]);

  /* ── Resize canvas to match container width ─────────────────────────────── */
  useEffect(() => {
    let debounceTimer = null;

    const redraw = () => {
      [agentCanvasRef, customerCanvasRef].forEach((ref) => {
        if (!ref.current) return;
        const w = ref.current.parentElement?.clientWidth || ref.current.offsetWidth || 600;
        const h = ref.current.offsetHeight || 110;
        if (ref.current.width !== w) ref.current.width = w;
        if (ref.current.height !== h) ref.current.height = h;
      });

      const isFlat = showNotice;
      drawCanvas(agentCanvasRef.current, "AGENT", "#3b82f6", "#1d4ed8", isFlat);
      drawCanvas(customerCanvasRef.current, "CUSTOMER", "#fb923c", "#c2410c", isFlat);
    };

    // Debounced version — waits for CSS transitions to finish before measuring
    const resize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(redraw, 60);
    };

    // Initial draw
    redraw();

    // window resize (viewport changes)
    window.addEventListener("resize", resize);

    // ResizeObserver — fires when the canvas container changes size for ANY reason
    // (panel open/close, expand/collapse, sidebar toggle, etc.)
    const observers = [agentCanvasRef, customerCanvasRef].map((ref) => {
      if (!ref.current?.parentElement) return null;
      const ro = new ResizeObserver(resize);
      ro.observe(ref.current.parentElement);
      return ro;
    }).filter(Boolean);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("resize", resize);
      observers.forEach((ro) => ro.disconnect());
    };
  }, [drawCanvas, isActuallyLoading, showNotice]);

  /* ── Stop on unmount ─────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    };
  }, []);
  /* ── Video element wiring ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!isVideo || !videoRef.current || !AURL) return;
    const v = videoRef.current;
    v.src = AURL;
    const onPlay = () => { wasPlaying.current = true; setIsPlaying(true); };
    const onPause = () => { wasPlaying.current = false; setIsPlaying(false); };
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => { setDuration(v.duration || 0); setAudioLoading(false); };
    const onEnded = () => { wasPlaying.current = false; setIsPlaying(false); };
    const onErr = (e) => {
      console.error("Video element error: code =", v.error?.code, "message =", v.error?.message, v.error);
      setAudioLoading(false);
      setLocalAudioError(getMediaErrorMessage(v.error, true));
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onErr);
    return () => {
      v.pause(); v.src = "";
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onErr);
    };
  }, [isVideo, AURL]);

  /* ── Escape exits clip mode ─────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && clipMode) { setClipMode(false); setRangeSelection(null); rangeDragRef.current = null; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clipMode]);

  /* ── Suppress context menu globally while note popup is open ── */
  useEffect(() => {
    if (!noteOpen) return;
    const suppress = (e) => e.preventDefault();
    window.addEventListener("contextmenu", suppress);
    return () => window.removeEventListener("contextmenu", suppress);
  }, [noteOpen]);

  /* ── togglePlay ─────────────────────────────────────────────────────────── */
  const seekTo = useCallback((t) => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    if (!isFinite(t)) return;
    el.currentTime = Math.max(0, Math.min(t, el.duration || 0));
    setTime(el.currentTime);
  }, [isVideo]);

  const togglePlay = useCallback(() => {
    if (!hasPlay) return;
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      // Fire-and-forget audit
      try {
        const u = getUser();
        fetch(`/api/audio?filePath=${encodeURIComponent(filePath)}&interactionId=${interactionId}&fileSourceType=${encodeURIComponent(fileSourceType || "")}&actionType=play`,
          { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`, loggedInUserId: u?.userId, userName: u?.userFullName } }
        ).catch(() => { });
      } catch (_) { }
      el.play().catch(() => { });
    }
  }, [isPlaying, hasPlay, isVideo, filePath, interactionId, fileSourceType]);

  const handleAddNote = useCallback(() => {
    if (noteOpen) return;
    const el = isVideo ? videoRef.current : audioRef.current;
    const wasActive = el ? !el.paused : false;
    resumeAfterNote.current = wasActive;  // captured before pause fires
    wasPlaying.current = wasActive;
    if (wasActive) el?.pause();
    const t = el?.currentTime ?? time;
    const dur = el?.duration ?? duration;
    setNoteTimeAt(t); setNotePct(dur > 0 ? (t / dur) * 100 : 0);
    setNoteText(""); setEditingId(null); setRangeSelection(null);
    setNoteOpen(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [noteOpen, time, duration, isVideo]);


  const handleWaveformMouseDown = useCallback((e) => {
    // Only allow left-clicks when clipMode is active
    if (e.button !== 0 || !clipMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const el = isVideo ? videoRef.current : audioRef.current;
    const dur = el?.duration ?? duration;

    // Canvas area starts 59px from the container's left edge (padding + icon + gap + border)
    // and ends 15px from the right edge. Adjust coordinates to map the clip accurately.
    const canvasLeft = isVideo ? rect.left : rect.left + 59;
    const canvasWidth = isVideo ? rect.width : Math.max(1, rect.width - 59 - 15);
    const pct = Math.max(0, Math.min(1, (e.clientX - canvasLeft) / canvasWidth));

    rangeDragRef.current = { startTime: pct * dur, canvasLeft, canvasWidth, dur };
    setRangeSelection({ start: pct * dur, end: pct * dur });
  }, [duration, clipMode, isVideo]);

  const handleWaveformMouseMove = useCallback((e) => {
    if (!rangeDragRef.current) return;
    const { startTime, canvasLeft, canvasWidth, dur } = rangeDragRef.current;
    const pct = Math.max(0, Math.min(1, (e.clientX - canvasLeft) / canvasWidth));
    setRangeSelection({ start: startTime, end: pct * dur });
  }, []);

  const handleWaveformMouseUp = useCallback((e) => {
    if (!rangeDragRef.current) return;
    const { startTime, canvasLeft, canvasWidth, dur } = rangeDragRef.current;
    rangeDragRef.current = null;
    const pct = Math.max(0, Math.min(1, (e.clientX - canvasLeft) / canvasWidth));
    const s = Math.min(startTime, pct * dur);
    const en = Math.max(startTime, pct * dur);

    const el = isVideo ? videoRef.current : audioRef.current;
    const wasActive = el ? !el.paused : false;

    if (en - s < 0.2) {
      // It's a click / select on the wave
      setRangeSelection(null);
      if (!hasCreateAnnotation) return;
      resumeAfterNote.current = wasActive;
      wasPlaying.current = wasActive;
      if (wasActive) el?.pause();
      seekTo(s);
      setNoteTimeAt(s);
      setNotePct(dur > 0 ? (s / dur) * 100 : 0);
      setNoteText("");
      setEditingId(null);
      setNoteOpen(true);
      setTimeout(() => noteInputRef.current?.focus(), 50);
    } else {
      // It's a drag on the wave
      setRangeSelection({ start: s, end: en });
      if (!hasCreateAnnotation) return;
      resumeAfterNote.current = wasActive;
      wasPlaying.current = wasActive;
      if (wasActive) el?.pause();
      seekTo(s);
      setNoteTimeAt(s);
      setNotePct(dur > 0 ? (s / dur) * 100 : 0);
      setNoteText("");
      setEditingId(null);
      setNoteOpen(true);
      setTimeout(() => noteInputRef.current?.focus(), 50);
    }
  }, [seekTo, isVideo, hasCreateAnnotation]);

  const handleDotClick = useCallback((ann) => {
    // hasEditAnnotation (34) → can edit any annotation (own or others')
    // hasCreateAnnotation (32) → can only edit own
    const canEdit = hasEditAnnotation || (ann.isOwn !== false && hasCreateAnnotation);
    if (!canEdit) return;
    const el = isVideo ? videoRef.current : audioRef.current;
    const wasActive = el ? !el.paused : false;
    resumeAfterNote.current = wasActive;
    wasPlaying.current = wasActive;
    if (wasActive) el?.pause();
    const dur = el?.duration ?? duration;
    setNoteTimeAt(ann.timeAt);
    setNotePct(dur > 0 ? (ann.timeAt / dur) * 100 : (ann.pct ?? 0));
    setNoteText(ann.text);
    setEditingId(ann.id);
    setEditingAnn(ann);
    if (ann.endTime) { setRangeSelection({ start: ann.timeAt, end: ann.endTime }); }
    else { setRangeSelection(null); }
    setNoteOpen(true);
    setTimeout(() => noteInputRef.current?.focus(), 50);
  }, [duration, isVideo, hasEditAnnotation, hasCreateAnnotation]);

  const handleTick = useCallback(() => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    if (editingId) {
      setAnnotations((p) => p.map((a) => a.id === editingId ? { ...a, text: trimmed, saved: false } : a));
    } else {
      const endTime = rangeSelection && Math.abs(rangeSelection.end - rangeSelection.start) > 0.2
        ? Math.max(rangeSelection.start, rangeSelection.end)
        : undefined;
      setAnnotations((p) => [...p, { id: `tmp_${Date.now()}`, text: trimmed, timeAt: noteTimeAt, pct: notePct, endTime, saved: false, creatorName: getUser()?.loginId || String(getUser()?.userId || ""), modifiedBy: null, isOwn: true }]);
    }
    setNoteOpen(false); setNoteText(""); setEditingId(null); setEditingAnn(null); setRangeSelection(null);
    setClipMode(false);
    if (resumeAfterNote.current) {
      resumeAfterNote.current = false;
      const el = isVideo ? videoRef.current : audioRef.current;
      el?.play().catch(() => { });
    }
  }, [noteText, editingId, noteTimeAt, notePct, rangeSelection, isVideo]);

  const handleDeleteDot = useCallback(() => {
    if (!editingId) return;
    const idToDelete = editingId;
    const annToDelete = annotationsRef.current.find((a) => a.id === idToDelete);
    setNoteOpen(false); setNoteText(""); setEditingId(null); setEditingAnn(null); setRangeSelection(null);
    setAnnotations((prev) => prev.filter((a) => a.id !== idToDelete));
    setDeletedIds((prev) => [...prev, idToDelete]);
    // Keep full metadata so handleSave can find dbRowId + noteKey after removal
    if (annToDelete) {
      deletedIdsRef.current = [...(deletedIdsRef.current ?? []), {
        id: idToDelete,
        dbRowId: annToDelete.dbRowId,
        noteKey: annToDelete.noteKey ?? null,
      }];
    }
    if (resumeAfterNote.current) {
      resumeAfterNote.current = false;
      const el = isVideo ? videoRef.current : audioRef.current;
      el?.play().catch(() => { });
    }
  }, [editingId, isVideo]);

  const handleCancel = useCallback(() => {
    setNoteOpen(false); setNoteText(""); setEditingId(null); setEditingAnn(null); setRangeSelection(null);
    setClipMode(false);
    if (resumeAfterNote.current) {
      resumeAfterNote.current = false;
      const el = isVideo ? videoRef.current : audioRef.current;
      el?.play().catch(() => { });
    }
  }, [isVideo]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTick(); }
    if (e.key === "Escape") handleCancel();
  }, [handleTick, handleCancel]);

  /* Save all to DB — one row per user per interaction, full saved[]/dragged[] blob */
  const handleSave = useCallback(async () => {
    const allCurrent = annotationsRef.current;
    const hasUnsavedNotes = allCurrent.some((a) => !a.saved);
    const hasDeletes = deletedIds.length > 0;
    if ((!hasUnsavedNotes && !hasDeletes) || saving) return;
    setSaving(true); setSaveError(null);

    const u = getUser();
    const userId = u?.userId ?? 0;
    const userName = u?.userFullName ?? String(userId);
    const iid = String(interactionId ?? "");

    try {
      // ── 1. Deletes — we keep a snapshot of deleted annotations in a ref so
      //    we can still find their dbRowId/noteKey after they've been removed
      //    from local state. deletedIds contains the annotation .id strings.
      const deletedSnapshot = deletedIdsRef.current ?? [];
      for (const { id: rawId, dbRowId, noteKey } of deletedSnapshot) {
        const numId = String(dbRowId ?? "").replace(/[^0-9]/g, "");
        if (!numId || numId === "0") continue; // tmp_ — never persisted

        const params = new URLSearchParams({
          id: numId,
          interactionId: iid,
          userId: String(userId),
          userName,
          canDeleteAny: hasDeleteAnnotation ? "1" : "0",
          ...(noteKey ? { noteKey } : {}),
        });
        await fetch(`/api/annotations?${params}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
        });
      }

      // ── 2. Group unsaved annotations by the DB row they belong to ──────────
      // Exclude any annotations that are pending deletion
      const deletedIdSet = new Set(deletedSnapshot.map((d) => d.id));
      const current = annotationsRef.current.filter((a) => !deletedIdSet.has(a.id));
      const unsaved = current.filter((a) => !a.saved);
      const groups = new Map(); // key: rowId string | "own" → { rowId, anns[] }

      for (const ann of unsaved) {
        const isTmp = String(ann.id).startsWith("tmp_");
        if (isTmp) {
          const key = "own";
          if (!groups.has(key)) groups.set(key, { rowId: existingDbRowId ?? null, anns: [] });
          groups.get(key).anns.push(ann);
        } else {
          const rowKey = String(ann.dbRowId ?? "own");
          if (!groups.has(rowKey)) {
            groups.set(rowKey, { rowId: ann.dbRowId ?? existingDbRowId ?? null, anns: [] });
          }
          groups.get(rowKey).anns.push(ann);
        }
      }

      // ── 3. For each affected row, send ALL notes that belong to that row ────
      for (const [key, group] of groups) {
        // Own row: all own annotations (isOwn === true) + new tmp_ notes
        // Other row: all annotations with matching dbRowId
        const rowAnns = key === "own"
          ? current.filter((a) => a.isOwn === true || String(a.id).startsWith("tmp_"))
          : current.filter((a) => String(a.dbRowId) === String(group.rowId));

        const savedArr = rowAnns
          .filter((a) => !(a.endTime && isFinite(a.endTime) && a.endTime > a.timeAt))
          .map((a) => ({
            annotation: a.text,
            recordingTimestampPoint: fmt(a.timeAt),
            recordingTimestampRaw: a.timeAt,
            createdBy: a.createdBy ?? a.creatorName ?? null, // preserve original creator
          }));

        const draggedArr = rowAnns
          .filter((a) => a.endTime && isFinite(a.endTime) && a.endTime > a.timeAt)
          .map((a) => ({
            annotation: a.text,
            recordingTimestampStarted: fmt(a.timeAt),
            recordingTimestampStartedRaw: a.timeAt,
            recordingTimestampEnded: fmt(a.endTime),
            recordingTimestampEndedRaw: a.endTime,
            createdBy: a.createdBy ?? a.creatorName ?? null,
          }));

        if (!savedArr.length && !draggedArr.length) continue;

        const res = await fetch("/api/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}` },
          body: JSON.stringify({
            interaction_id: iid,
            created_by: userId,
            userName,
            existing_id: group.rowId ?? null,
            canEditAny: hasEditAnnotation ? "1" : "0",
            annotation: {
              callId: String(callData?.callId ?? callData?.call_id ?? ""),
              saved: savedArr,
              dragged: draggedArr,
            },
          }),
        });
        const d = await res.json();
        if (!d.success) { setSaveError(d.message || "Save failed"); continue; }
        if (key === "own" && d.id) setExistingDbRowId(d.id);
      }

      setAnnotations((prev) => {
        const remaining = prev
          .filter((a) => !deletedIds.includes(a.id))
          .map((a) => ({ ...a, saved: true }));
        // If no own annotations remain, clear the stale row ID so next save does an INSERT
        const hasOwnLeft = remaining.some((a) => a.isOwn === true);
        if (!hasOwnLeft) setExistingDbRowId(null);
        return remaining;
      });
      setDeletedIds([]);
      deletedIdsRef.current = [];
      // Re-fetch from API to get fully resolved names (createdBy, modifiedBy)
      fetchAnnotations();
    } catch (e) {
      setSaveError(e.message || "Network error");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, interactionId, callData, deletedIds, existingDbRowId, hasDeleteAnnotation, hasEditAnnotation, fetchAnnotations]);

  const [infoLocked, setInfoLocked] = useState(false);
  const maskLastFour = (v) => {
    if (!v) return null;
    const str = String(v);
    if (str.length <= 4) return str;
    return "******" + str.slice(-4);
  };
  const infoLines = callData ? [
    { label: "Call ID", value: callData.callId ?? callData.call_id },
    { label: "UCID", value: callData.ucid ?? callData.UCID },
    { label: "ANI", value: maskLastFour(callData.ani ?? callData.ANI) },
    { label: "DNIS", value: maskLastFour(callData.dnis ?? callData.DNIS) },
    { label: "SID", value: callData.sid ?? callData.SID },
    { label: "Extension", value: callData.extension },
    { label: "Personal Name", value: callData.personalName ?? callData.personal_name },
    { label: "Agent ID", value: callData.agentId ?? callData.agent_id },
    { label: "PBX Login ID", value: callData.pbxLoginId ?? callData.pbx_login_id },
    { label: "Audio Start", value: (() => { const v = callData.audioStartTime ?? callData.audio_start_time; if (!v) return null; try { return new Date(v).toLocaleString(); } catch { return String(v); } })() },
    { label: "Duration", value: callData.duration ? `${callData.duration}s` : null },
    { label: "Direction", value: callData.direction != null ? (callData.direction === 1 ? "Inbound" : callData.direction === 0 ? "Outbound" : String(callData.direction)) : null },
  ].filter((r) => r.value != null && r.value !== "") : [];

  return (
    <div className={`flex flex-col gap-3 w-full${formOpen ? " h-full min-h-0" : ""}`}>
      {/* ── Player card ── */}
      <div className={`bg-card rounded-2xl shadow-lg border border-l-4 border-l-blue-900 overflow-visible p-5 flex flex-col min-h-0 relative${formOpen ? " flex-1" : ""}`}>
        {!showNotice && mediaLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm rounded-2xl gap-3">
            <span className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-foreground">
              {isVideo ? "Loading video…" : "Loading audio…"}
            </span>
          </div>
        )}

        {/* Title + info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" size="icon" className="h-7 w-7 shadow-md" onClick={onBack}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                <span className="sr-only">Back</span>
              </Button>
            )}
            <span className="text-sm font-bold text-foreground">
              {callData?.callId ?? callData?.call_id ?? ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {downloadNode}
            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                title={isAudioExpanded ? "Restore split view" : "Expand audio panel"}
                className="h-7 w-7 rounded-full border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition"
              >
                {isAudioExpanded
                  ? <Minimize2 className="h-3.5 w-3.5" />
                  : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            )}
            {infoLines.length > 0 && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setInfoLocked((v) => !v)}
                  className={`h-7 w-7 rounded-full border flex items-center justify-center transition
                    ${infoLocked
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <div className={`absolute right-0 top-8 z-[9999] rounded-xl border border-border bg-popover shadow-lg p-3
                  ${infoLocked ? "block" : "hidden group-hover:block"}`}
                  style={{ minWidth: "220px", maxWidth: "420px", width: "max-content" }}>
                  <p className="text-xs font-semibold text-foreground mb-2">Call Information</p>
                  {infoLines.map(({ label, value }) => (
                    <div key={label} className="flex text-[11px] py-0.5 whitespace-nowrap">
                      <span className="font-medium text-muted-foreground w-24 shrink-0">{label}:</span>
                      <span className="text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notice banner */}
        {showNotice && (
          <div className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>{noticeText}</div>
            {archiveStatus === "needs_retrieval" && onRetrieve ? (
              <button
                type="button"
                onClick={handleRetrieveCallSynced}
                className="w-fit px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold transition active:scale-95 text-[11px]"
              >
                Retrieve Call
              </button>
            ) : archiveStatus === "retrieving" ? (
              <button
                type="button"
                disabled={true}
                className="w-fit px-3 py-1 bg-amber-600 text-white rounded-md font-semibold text-[11px] opacity-50 cursor-not-allowed"
              >
                Retrieving Call...
              </button>
            ) : null}
          </div>
        )}

        {/* Hidden native audio element — handles all playback */}
        {!isVideo && <audio ref={audioRef} preload="metadata" style={{ display: "none" }} />}

        {/* Waveform / Video area */}
        {!showNotice && (
          <div
            className="rounded-lg border border-border overflow-hidden select-none relative flex flex-col min-h-0 flex-1"
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {isVideo ? (
              <div className="relative w-full bg-black flex items-center justify-center flex-1 min-h-0">
                <video ref={videoRef} className="w-full h-full object-contain" controls={false}
                  preload="auto" playsInline
                  style={{ cursor: hasPlay ? "pointer" : "default" }}
                  onClick={togglePlay} />
                {/* Progress bar overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/25 hover:h-3 transition-all duration-150 cursor-pointer"
                  onClick={(e) => {
                    if (!videoRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    seekTo(pct * duration);
                  }}
                >
                  <div className="h-full bg-blue-600 transition-all duration-75"
                    style={{ width: `${duration > 0 ? (time / duration) * 100 : 0}%` }} />
                </div>
              </div>
            ) : (
              /* ── TYPE 3: Unified Dual Channel Layout ── */
              <>
                {/* STT shimmer — shown while transcription is generating (not loading) */}
                {sttGenerating && !isActuallyLoading && (
                  <div className="absolute inset-0 pointer-events-none z-10 rounded-lg overflow-hidden">
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(59,102,241,0.06) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "stt-shimmer 1.5s ease-in-out infinite",
                    }} />
                  </div>
                )}
                {/* Agent channel — blue */}
                {(() => {
                  const isActive = activeSpeaker === "BOTH" ||
                    (activeSpeaker && String(activeSpeaker).toUpperCase().includes("AGENT"));
                  const labelColor = isActive ? "#2563eb" : "#94a3b8";
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 transition-all duration-150 flex-1 min-h-0"
                      style={{
                        background: isActive ? "rgba(59,130,246,0.10)" : "",
                        borderLeft: isActive ? "3px solid rgba(59,130,246,0.8)" : "3px solid transparent",
                      }}>
                      {/* Label — icon + text stacked, fixed width */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "36px", flexShrink: 0, gap: "3px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={labelColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                        </svg>
                        <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: labelColor, lineHeight: 1 }}>Agent</span>
                      </div>
                      <canvas ref={agentCanvasRef}
                        className="flex-1 min-w-0 w-full h-full cursor-pointer"
                        style={{ display: "block" }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          if (!duration) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          seekTo((e.clientX - rect.left) / rect.width * duration);
                        }}
                      />
                    </div>
                  );
                })()}
                <div className="border-t border-border" />
                {/* Customer channel — orange */}
                {(() => {
                  const isActive = activeSpeaker === "BOTH" ||
                    (activeSpeaker && String(activeSpeaker).toUpperCase().includes("CUSTOMER"));
                  const labelColor = isActive ? "#ea580c" : "#94a3b8";
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 transition-all duration-150 flex-1 min-h-0"
                      style={{
                        background: isActive ? "rgba(249,115,22,0.10)" : "",
                        borderLeft: isActive ? "3px solid rgba(249,115,22,0.8)" : "3px solid transparent",
                      }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "36px", flexShrink: 0, gap: "3px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={labelColor} stroke="none">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: labelColor, lineHeight: 1 }}>Customer</span>
                      </div>
                      <canvas ref={customerCanvasRef}
                        className="flex-1 min-w-0 w-full h-full cursor-pointer"
                        style={{ display: "block" }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          if (!duration) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          seekTo((e.clientX - rect.left) / rect.width * duration);
                        }}
                      />
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Annotation timeline — hidden (feature disabled in UI) */}
        {false && !showNotice && hasAnnotation && (
          <div style={{ position: "relative", isolation: "isolate", overflow: "hidden", paddingLeft: isVideo ? "0px" : "59px", paddingRight: isVideo ? "0px" : "15px" }}>
            <AnnotationTimeline
              annotations={annotations}
              duration={duration}
              time={time}
              onDotClick={handleDotClick}
              hasViewAnnotation={hasViewAnnotation}
              hasEditAnnotation={hasEditAnnotation}
              hasCreateAnnotation={hasCreateAnnotation}
              rangeSelection={rangeSelection}
            />
          </div>
        )}

        {/* Note input popup — hidden (feature disabled in UI) */}
        {false && (hasCreateAnnotation || hasEditAnnotation) && noteOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
            <div className="w-80 rounded-xl border border-primary/30 bg-popover shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                <span className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                  {editingId ? <Pencil className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                  {editingId
                    ? (rangeSelection && Math.abs(rangeSelection.end - rangeSelection.start) > 0.2
                      ? `Edit range: ${fmt(Math.min(rangeSelection.start, rangeSelection.end))} – ${fmt(Math.max(rangeSelection.start, rangeSelection.end))}`
                      : `Edit annotation @ ${fmt(noteTimeAt)}`)
                    : (rangeSelection && Math.abs(rangeSelection.end - rangeSelection.start) > 0.2
                      ? `Range: ${fmt(Math.min(rangeSelection.start, rangeSelection.end))} – ${fmt(Math.max(rangeSelection.start, rangeSelection.end))}`
                      : `Annotation @ ${fmt(noteTimeAt)}`)}
                </span>
                <button type="button" onClick={handleCancel}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="px-4 py-3 flex flex-col gap-3">
                {/* Audit info — only when editing an existing annotation */}
                {editingId && editingAnn && (
                  <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 flex flex-col gap-1">
                    {(hasViewAnnotation || hasEditAnnotation) && editingAnn.creatorName && (
                      <p className="text-[10px] text-muted-foreground">
                        Created by: <span className="font-semibold text-foreground">{editingAnn.creatorName}</span>
                      </p>
                    )}
                    {(hasViewAnnotation || hasEditAnnotation) && editingAnn.modifiedBy && (
                      <p className="text-[10px] text-muted-foreground">
                        Edited by: <span className="font-semibold text-foreground">{editingAnn.modifiedBy}</span>
                      </p>
                    )}
                    {/* Previous text — shown greyed out so user can see what they're changing */}
                    {editingAnn.text && editingAnn.text !== noteText && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-through opacity-60 leading-snug">
                        {editingAnn.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Textarea */}
                <textarea ref={noteInputRef} value={noteText} rows={3}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={onKeyDown}
                  onContextMenu={(e) => e.preventDefault()}
                  placeholder="e.g. positive sentiment…"
                  className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {/* Delete — shown when editing AND user has delete privilege */}
                  {editingId && hasDeleteAnnotation ? (
                    <button type="button" onClick={handleDeleteDot}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 text-[11px] font-medium hover:bg-red-50 transition"
                      title="Delete this annotation">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  ) : <span />}

                  <button type="button" onClick={handleTick} disabled={!noteText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition">
                    <Check className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls bar */}
        {!showNotice && (
          <div className="relative z-10 flex items-center gap-2 mt-3 flex-wrap">
            {/* Play/pause — pill-shaped */}
            <button type="button" onClick={togglePlay} disabled={!hasPlay || showNotice || isLoading}
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95"
              style={{
                background: hasPlay && !showNotice && !isLoading ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: hasPlay && !showNotice && !isLoading ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                cursor: hasPlay && !showNotice && !isLoading ? "pointer" : "not-allowed",
              }}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </button>

            {/* Annotation button — hidden (feature disabled in UI) */}
            {false && hasCreateAnnotation && (
              <button type="button" onClick={handleAddNote} disabled={noteOpen || isLoading}
                title="Add annotation at current position"
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition
                  ${!noteOpen && !isLoading ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border bg-card text-muted-foreground cursor-not-allowed"}`}>
                <MessageSquare className="h-3 w-3" /> Annotation
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setMuted((m) => !m)} className="text-muted-foreground hover:text-foreground transition shrink-0">
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                className="w-20 accent-primary h-1 rounded-full" />
            </div>

            {/* Speed — segmented control */}
            <div className="flex items-center rounded-full border border-border overflow-hidden bg-muted/30">
              {[0.5, 1, 1.5, 2].map((r) => (
                <button key={r} type="button" onClick={() => !isLoading && setSpeed(r)} disabled={isLoading}
                  className={`px-2.5 py-1 text-[11px] font-semibold transition border-r border-border last:border-r-0
                    ${isLoading ? "opacity-40 cursor-not-allowed text-muted-foreground" : speed === r ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/60"}`}>
                  {r}x
                </button>
              ))}
            </div>

            {/* Clip mode — hidden (feature disabled in UI) */}
            {false && hasCreateAnnotation && (
              <button
                type="button"
                disabled={isLoading}
                title={clipMode ? "Exit clip mode (Esc)" : "Clip mode: click & drag to select a range"}
                onClick={() => { if (isLoading) return; setClipMode((v) => !v); if (clipMode) setRangeSelection(null); }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border transition flex items-center gap-1
                  ${isLoading ? "opacity-40 cursor-not-allowed bg-card text-muted-foreground border-border" : clipMode
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/50"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
                Clip
              </button>
            )}

            {/* Fullscreen — video only */}
            {isVideo && (
              <button
                type="button"
                title="Fullscreen"
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (!document.fullscreenElement) v.requestFullscreen().catch(() => { });
                  else document.exitFullscreen();
                }}
                className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold border transition flex items-center gap-1 bg-card text-muted-foreground border-border hover:bg-muted/50">
                <Maximize2 className="h-3 w-3" />
              </button>
            )}

            {/* Save + timer — annotation save buttons hidden (feature disabled in UI) */}
            <div className="ml-auto flex items-center gap-2">
              {false && hasAnnotation && hasUnsaved && !saving && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-300 rounded-full px-2.5 py-0.5 animate-pulse select-none">
                  Save Changes!
                </span>
              )}
              {false && hasAnnotation && saveError && (
                <span className="text-[10px] text-red-500 max-w-[120px] truncate" title={saveError}>{saveError}</span>
              )}
              {false && (hasCreateAnnotation || hasEditAnnotation) && (
                <button type="button" onClick={handleSave} disabled={saving || !hasUnsaved || isLoading}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition
                    ${hasUnsaved && !saving && !isLoading ? "border-green-400 bg-green-50 text-green-700 hover:bg-green-100" : "border-border bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  {saving
                    ? <span className="h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    : <Check className="h-3 w-3" />}
                  Save
                </button>
              )}
              <span className="text-xs text-muted-foreground tabular-nums font-medium">{fmt(time)} / {fmt(duration)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Transcription panel ── */}
      {showTranscription && (
        <div className={`rounded-xl border border-border border-l-4 border-l-blue-700 bg-card shadow-sm overflow-hidden flex flex-col${formOpen ? " flex-1 min-h-0" : showTranscript ? " flex-1 min-h-0" : ""}`}>
          <button type="button" onClick={() => setShowTranscript((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 border-b border-border hover:bg-muted/50 transition shrink-0">
            <span className="text-xs font-bold text-foreground tracking-tight">Transcription</span>
            {showTranscript ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <div className={`transition-all duration-300 ease-in-out flex flex-col${showTranscript ? " opacity-100 flex-1 min-h-0" : " max-h-0 opacity-0 overflow-hidden"}`}
            style={showTranscript ? { minHeight: 0 } : {}}>
            {transcriptionRetrieving === "needs_retrieval" ? (
              <div className="px-3.5 py-2.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    The transcription needs to be retrieved.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRetrieveTranscription}
                  disabled={transcriptionLoading}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold transition active:scale-95 text-[11px] shrink-0"
                >
                  Retrieve Transcription
                </button>
              </div>
            ) : transcriptionRetrieving === "retrieving" ? (
              <div className="px-3.5 py-2.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <div className="font-medium text-amber-800 dark:text-amber-300">The transcription is retrieving...</div>
                </div>
                <button
                  type="button"
                  disabled={true}
                  className="px-3 py-1 bg-amber-600 text-white rounded-md font-semibold text-[11px] shrink-0 opacity-50 cursor-not-allowed"
                >
                  Retrieving Transcription...
                </button>
              </div>
            ) : sttGenerating ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <span className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground text-center">
                  {sttStatus === "processing"
                    ? <>Transcription in progress…<br /><span className="text-[10px]">Another request is already generating this transcription.</span></>
                    : <>Generating transcription…<br /><span className="text-[10px]">This may take a minute for longer recordings.</span></>
                  }
                </p>
              </div>
            ) : sttError ? (
              <div className="flex flex-col items-center justify-center py-5 gap-2 px-4">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Info className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 text-center">
                  {sttError.errorCode === "RULE_MISMATCH" || sttError.errorCode === "NO_RULE"
                    ? "No Transcription Rule"
                    : sttError.errorCode === "INVALID_API_KEY"
                      ? "API Key Error"
                      : sttError.errorCode === "AUDIO_NOT_FOUND"
                        ? "Audio File Not Found"
                        : sttError.errorCode === "FILE_TOO_LARGE"
                          ? "File Too Large"
                          : sttError.errorCode === "RATE_LIMIT"
                            ? "Rate Limit Reached"
                            : sttError.errorCode === "STT_TIMEOUT"
                              ? "STT Engine Timeout"
                              : sttError.errorCode === "UNSUPPORTED_FORMAT"
                                ? "Unsupported Format"
                                : sttError.errorCode === "STORAGE_ERROR"
                                  ? "Storage Error"
                                  : sttError.errorCode === "NETWORK_ERROR"
                                    ? "Network Error"
                                    : "Transcription Failed"}
                </p>
                <p className="text-[11px] text-muted-foreground text-center leading-snug max-w-xs">
                  {sttError.message || "An error occurred during transcription."}
                </p>
                {/* Error code badge */}
                <span className="text-[9px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                  {sttError.errorCode || "UNKNOWN"}
                </span>
                {/* Retry button — only for retryable errors */}
                {sttError.retryable && onRetryTranscription && (
                  <button
                    type="button"
                    onClick={onRetryTranscription}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Retry Transcription
                  </button>
                )}
                {/* Non-retryable: guide user to fix the config */}
                {!sttError.retryable && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    Fix the configuration and reopen this interaction.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {transcriptionMode === "none" && !useTranscriptionLayout ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No transcription available for this interaction.</p>
                ) : useTranscriptionLayout ? (
                  <TranscriptionCard
                    segments={segments}
                    loading={transcriptionLoading}
                    currentTime={time}
                    fillHeight={formOpen}
                    onSeek={(t) => {
                      seekTo(Math.max(0, t));
                    }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No transcription available for this interaction.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Children slot (Evaluation / Submitted Forms) ── */}
      {children && (
        <div className="flex gap-3 items-center flex-wrap pt-1">
          {children}
        </div>
      )}
    </div>
  );
};

export { AudioPlayer };
