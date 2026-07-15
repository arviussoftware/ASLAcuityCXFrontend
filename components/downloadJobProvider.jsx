"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { X } from "lucide-react";
import { RiDownloadFill } from "react-icons/ri";

const DOWNLOAD_JOB_STORAGE_KEY = "activeDownloadJob";
const WIDGET_POSITION_STORAGE_KEY = "downloadWidgetPosition";

const DownloadJobContext = createContext(null);

const readPersistedJob = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(DOWNLOAD_JOB_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const persistJob = (job) => {
  if (typeof window === "undefined") return;
  try {
    if (job) {
      sessionStorage.setItem(DOWNLOAD_JOB_STORAGE_KEY, JSON.stringify(job));
    } else {
      sessionStorage.removeItem(DOWNLOAD_JOB_STORAGE_KEY);
    }
  } catch {}
};

const readPersistedPosition = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(WIDGET_POSITION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const persistPosition = (position) => {
  if (typeof window === "undefined") return;
  try {
    if (position) {
      sessionStorage.setItem(
        WIDGET_POSITION_STORAGE_KEY,
        JSON.stringify(position),
      );
    } else {
      sessionStorage.removeItem(WIDGET_POSITION_STORAGE_KEY);
    }
  } catch {}
};

export function DownloadJobProvider({ children }) {
  const [downloadJob, setDownloadJobState] = useState(null);
  const pollRef = useRef(null);

  const setDownloadJob = useCallback((next) => {
    setDownloadJobState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      persistJob(resolved);
      return resolved;
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId) => {
      const token = process.env.NEXT_PUBLIC_API_TOKEN;

      const tick = async () => {
        try {
          const res = await fetch(
            `/api/interactions/downloadSelected/status?jobId=${jobId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) return;
          const { job } = await res.json();

          setDownloadJob((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;

            const merged = { ...prev, ...job, jobId };

            // If we've optimistically shown "cancelling" locally, don't let
            // a poll that still says "running" (because the server hasn't
            // finished tearing down yet) flicker it back. Only a terminal
            // status from the server should override "cancelling".
            if (prev.status === "cancelling" && job.status === "running") {
              merged.status = "cancelling";
            }

            return merged;
          });

          if (
            job.status === "completed" ||
            job.status === "failed" ||
            job.status === "cancelled"
          ) {
            stopPolling();
          }
        } catch (err) {
          console.error("Download status poll failed:", err);
        }
      };

      stopPolling();
      tick();
      pollRef.current = setInterval(tick, 3000);
    },
    [setDownloadJob, stopPolling],
  );

  const startDownloadJob = useCallback(
    (jobMeta) => {
      setDownloadJob({ ...jobMeta, status: "running", minimized: false });
      pollJob(jobMeta.jobId);
    },
    [pollJob, setDownloadJob],
  );

  const cancelDownloadJob = useCallback(
    async (jobId) => {
      if (!jobId) return;

      setDownloadJob((prev) =>
        prev && prev.jobId === jobId ? { ...prev, status: "cancelling" } : prev,
      );

      try {
        const token = process.env.NEXT_PUBLIC_API_TOKEN;
        const res = await fetch("/api/interactions/downloadSelected/cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId }),
        });

        if (!res.ok) {
          console.error("Failed to request download cancellation");
        }
        // The active polling loop will pick up the eventual "cancelled"
        // status once the server finishes tearing the job down.
      } catch (err) {
        console.error("Cancel download request failed:", err);
      }
    },
    [setDownloadJob],
  );

  const dismissDownloadJob = useCallback(() => {
    stopPolling();
    setDownloadJob(null);
  }, [setDownloadJob, stopPolling]);

  const toggleMinimize = useCallback(() => {
    setDownloadJob((prev) =>
      prev ? { ...prev, minimized: !prev.minimized } : prev,
    );
  }, [setDownloadJob]);

  // Runs ONCE when the dashboard layout first mounts (e.g. on login or hard
  // refresh) — reconnects to a job that was started earlier and is still
  // running, even if it was started from a different dashboard page.
  useEffect(() => {
    const persisted = readPersistedJob();
    if (persisted?.jobId) {
      setDownloadJobState(persisted);
      if (persisted.status === "running" || persisted.status === "cancelling") {
        pollJob(persisted.jobId);
      }
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DownloadJobContext.Provider
      value={{
        downloadJob,
        startDownloadJob,
        cancelDownloadJob,
        dismissDownloadJob,
        toggleMinimize,
      }}
    >
      {children}
      <DraggableDownloadWidget
        job={downloadJob}
        onDismiss={dismissDownloadJob}
        onToggleMinimize={toggleMinimize}
        onCancel={() => cancelDownloadJob(downloadJob?.jobId)}
      />
    </DownloadJobContext.Provider>
  );
}

export function useDownloadJob() {
  const ctx = useContext(DownloadJobContext);
  if (!ctx) {
    throw new Error("useDownloadJob must be used within a DownloadJobProvider");
  }
  return ctx;
}

// Default corner the widget starts in before the person ever drags it —
// matches the old fixed bottom-20 right-4 placement.
const DEFAULT_MARGIN_RIGHT = 16;
const DEFAULT_MARGIN_BOTTOM = 80;
const DRAG_THRESHOLD_PX = 4;

const clampPosition = (pos, width, height) => {
  if (typeof window === "undefined") return pos;

  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);

  return {
    left: Math.min(Math.max(0, pos.left), maxLeft),
    top: Math.min(Math.max(0, pos.top), maxTop),
  };
};

// Wraps the progress widget with pointer-based drag-and-drop. Works for both
// the full card and the minimized pill, and remembers where it was left
// (in sessionStorage) so navigating between dashboard pages — or even a
// refresh — keeps it where the person put it.
//
// IMPORTANT: the minimized pill's "expand on click" behaviour is handled
// manually here in handlePointerUp, NOT via a native onClick on the button.
// Calling setPointerCapture() during drag can suppress the browser's own
// click event afterwards (a known cross-browser quirk), so relying on
// onClick for the pill made clicking unreliable. Deciding click-vs-drag
// ourselves, purely from pointer movement distance, avoids that entirely.
const DraggableDownloadWidget = ({
  job,
  onDismiss,
  onToggleMinimize,
  onCancel,
}) => {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(null);
  const dragStateRef = useRef({
    dragging: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    onActivate: null,
  });

  // Hydrate a saved position once, on mount.
  useEffect(() => {
    const saved = readPersistedPosition();
    if (
      saved &&
      typeof saved.left === "number" &&
      typeof saved.top === "number"
    ) {
      setPosition(saved);
    }
  }, []);

  // If the window is resized (or the widget toggles between minimized/full
  // size), keep it fully on-screen instead of letting it drift off the edge.
  useEffect(() => {
    if (!job) return;

    const reclamp = () => {
      const el = containerRef.current;
      if (!el) return;
      setPosition((prev) => {
        if (!prev) return prev;
        return clampPosition(prev, el.offsetWidth, el.offsetHeight);
      });
    };

    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
    // Re-run when minimized state flips, since the element's size changes.
  }, [job, job?.minimized]);

  // onActivate (optional) fires on pointerup if the press turned out NOT to
  // be a drag — used by the minimized pill to expand itself. The expanded
  // header has no activate action (matches previous behaviour: dragging the
  // header doesn't do anything extra on a plain click).
  const handlePointerDown = useCallback((e, onActivate) => {
    const el = containerRef.current;
    if (!el) return;

    // Only the primary button/touch should start a drag.
    if (e.button !== undefined && e.button !== 0) return;

    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      dragging: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      onActivate: onActivate || null,
    };

    el.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const dragState = dragStateRef.current;
    if (!dragState.dragging || dragState.pointerId !== e.pointerId) return;

    const el = containerRef.current;
    if (!el) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    // Ignore tiny sub-pixel jitter that fires between pointerdown and
    // pointerup on a normal click — only commit to "this is a drag" once
    // the pointer has actually traveled past a small threshold.
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
      return;
    }

    dragState.moved = true;

    const nextLeft = e.clientX - dragState.offsetX;
    const nextTop = e.clientY - dragState.offsetY;

    const clamped = clampPosition(
      { left: nextLeft, top: nextTop },
      el.offsetWidth,
      el.offsetHeight,
    );
    setPosition(clamped);
  }, []);

  const handlePointerUp = useCallback((e) => {
    const dragState = dragStateRef.current;
    if (!dragState.dragging || dragState.pointerId !== e.pointerId) return;

    const el = containerRef.current;
    el?.releasePointerCapture?.(e.pointerId);

    if (dragState.moved) {
      setPosition((prev) => {
        persistPosition(prev);
        return prev;
      });
    } else if (typeof dragState.onActivate === "function") {
      // No real movement happened — treat this as a click/tap and fire the
      // activate action ourselves, instead of depending on the browser to
      // still dispatch a native click after pointer capture was used.
      dragState.onActivate();
    }

    dragStateRef.current = {
      dragging: false,
      moved: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      onActivate: null,
    };
  }, []);

  if (!job) return null;

  const style = position
    ? {
        position: "fixed",
        left: position.left,
        top: position.top,
        right: "auto",
        bottom: "auto",
        zIndex: 9999,
      }
    : {
        position: "fixed",
        right: DEFAULT_MARGIN_RIGHT,
        bottom: DEFAULT_MARGIN_BOTTOM,
        zIndex: 9999,
      };

  return (
    <div
      ref={containerRef}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <DownloadProgressWidget
        job={job}
        onDismiss={onDismiss}
        onToggleMinimize={onToggleMinimize}
        onCancel={onCancel}
        onDragHandlePointerDown={handlePointerDown}
      />
    </div>
  );
};

const DownloadProgressWidget = ({
  job,
  onDismiss,
  onToggleMinimize,
  onCancel,
  onDragHandlePointerDown,
}) => {
  const pct =
    job.total > 0
      ? Math.min(100, Math.round((job.processed / job.total) * 100))
      : 0;
  const isRunning = job.status === "running";
  const isCancelling = job.status === "cancelling";
  const isCancelled = job.status === "cancelled";
  const isDone = job.status === "completed";
  const isFailed = job.status === "failed";
  const isActive = isRunning || isCancelling;

  if (job.minimized) {
    let label = `${pct}%`;
    if (isDone) label = "Download ready";
    else if (isFailed) label = "Download failed";
    else if (isCancelling) label = "Cancelling…";
    else if (isCancelled) label = "Cancelled";

    return (
      <button
        onPointerDown={(e) => onDragHandlePointerDown(e, onToggleMinimize)}
        title="Drag to move · click to expand"
        className="flex items-center gap-2 rounded-full bg-[#1a76d1] text-white text-xs px-4 py-2 shadow-lg hover:opacity-90 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <RiDownloadFill
          className={isActive ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"}
        />
        {label}
      </button>
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-background shadow-2xl p-3">
      <div
        onPointerDown={(e) => onDragHandlePointerDown(e)}
        title="Drag to move"
        className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <span className="text-xs font-semibold">
          {job.downloadType === "selected"
            ? "Downloading selected calls"
            : "Downloading all calls"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggleMinimize}
            className="p-1 rounded hover:bg-muted"
            title="Minimize"
          >
            <span className="text-xs">—</span>
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDismiss}
            className="p-1 rounded hover:bg-muted"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p
        className="text-[10px] text-muted-foreground mb-2 truncate"
        title={job.dateRangeLabel}
      >
        {job.dateRangeLabel}
      </p>

      {isActive && (
        <>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1a76d1] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isCancelling
              ? `Cancelling — ${job.processed} of ${job.total} were saved before stopping`
              : `${job.processed} of ${job.total} recordings (${pct}%)${
                  job.failed > 0 ? ` · ${job.failed} failed` : ""
                }`}
          </p>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onCancel}
            disabled={isCancelling}
            className="mt-2 w-full text-[10px] font-medium rounded-md border border-destructive/40 text-destructive py-1 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? "Cancelling…" : "Cancel download"}
          </button>
        </>
      )}

      {isCancelled && (
        <p className="text-[10px] text-muted-foreground">
          Download cancelled. {job.processed} recording(s) were saved to a
          partial zip before stopping. You can start a new download anytime.
        </p>
      )}

      {isDone && (
        <p className="text-[10px] text-emerald-600">
          {job.processed} recording(s) zipped successfully. Check your email for
          details.
          {job.notRetrieved > 0 && (
            <span className="block text-amber-600 mt-1">
              {job.notRetrieved} recording(s) were skipped because they haven’t
              finished restoring from Glacier yet.
            </span>
          )}
        </p>
      )}

      {isFailed && (
        <p className="text-[10px] text-destructive">
          Download failed{job.error ? `: ${job.error}` : "."}
        </p>
      )}
    </div>
  );
};
