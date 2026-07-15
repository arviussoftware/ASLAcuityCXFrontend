"use client";

import React, { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, ShieldCheck, Search, Download, Play, Pause,
  Lock, AlertCircle, Loader2, FileAudio, FileVideo, FileText, File
} from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-200">
          <div className="w-full max-w-xl rounded-2xl border border-red-500/20 bg-red-950/5 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3 text-red-400 font-bold mb-4">
              <AlertCircle />
              <span>Rendering Error Caught</span>
            </div>
            <p className="text-sm font-mono bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 break-all select-all text-red-300">
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatTimeRemaining(ms) {
  const num = Number(ms);
  if (isNaN(num) || num <= 0) return "Expired";
  const seconds = Math.floor((num / 1000) % 60);
  const minutes = Math.floor((num / (1000 * 60)) % 60);
  const hours = Math.floor((num / (1000 * 60 * 60)) % 24);
  const days = Math.floor(num / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (days === 0 && hours === 0 && minutes === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(" ");
}

function getFileIcon(filename) {
  const safeName = String(filename || "");
  const ext = safeName.split(".").pop()?.toLowerCase() || "";
  if (["mp3", "wav", "ogg", "aac"].includes(ext)) {
    return { icon: FileAudio, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  }
  if (["mp4", "webm", "mkv", "mov", "m4a"].includes(ext)) {
    return { icon: FileVideo, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" };
  }
  if (["csv", "xml", "json", "txt", "xlsx", "xls"].includes(ext)) {
    return { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  }
  return { icon: File, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };
}

function formatExportedAt(dateString) {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "N/A";
  }
}

function ExportViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const configId = searchParams.get("configId");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [data, setData] = useState({ ruleName: "", exportPath: "", files: [], expiresAt: null, expiryHours: 120 });
  const [search, setSearch] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeMedia, setActiveMedia] = useState(null); // { filename, downloadUrl, type }

  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // Fetch files on load
  useEffect(() => {
    if (!configId || !token) {
      setError("Missing configuration or security token.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/workFlow/getExportFiles?configId=${configId}&token=${token}`)
      .then((res) => {
        if (res.status === 403) {
          setExpired(true);
          throw new Error("Link expired");
        }
        if (!res.ok) {
          throw new Error("Failed to load export files.");
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          if (json.success) {
            setData({
              ruleName: json.ruleName || "Export Rule",
              exportPath: json.exportPath || "",
              files: json.files || [],
              expiresAt: json.expiresAt,
              expiryHours: json.expiryHours || 120
            });
            if (json.expiresAt) {
              setTimeRemaining(json.expiresAt - Date.now());
            }
          } else {
            setError(json.message || "Failed to retrieve export files.");
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err.message !== "Link expired") {
            setError(err.message || "An error occurred while loading files.");
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [configId, token]);

  // Live countdown timer
  useEffect(() => {
    if (!data.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = data.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeRemaining(0);
        setExpired(true);
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data.expiresAt]);

  // Filter files
  const filteredFiles = useMemo(() => {
    return (data.files || []).filter((f) => {
      const filename = String(f?.filename || "");
      return filename.toLowerCase().includes(search.toLowerCase());
    });
  }, [data.files, search]);

  // Stop other media on switch
  const handlePlayMedia = async (file, type) => {
    if (activeMedia?.filename === file.filename) {
      // Toggle off if clicking the same file
      setActiveMedia(null);
      return;
    }
    
    let playbackUrl = file.downloadUrl;
    const ext = file.filename.split(".").pop()?.toLowerCase() || "";
    if (ext === "m4a") {
      try {
        const res = await fetch(file.downloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          const finalBlob = new Blob([blob], { type: "video/mp4" });
          playbackUrl = URL.createObjectURL(finalBlob);
        }
      } catch (err) {
        console.error("Failed to convert m4a to video blob:", err);
      }
    }

    setActiveMedia({
      filename: file.filename,
      downloadUrl: playbackUrl,
      type
    });
  };

  // Cleanup blob URLs when activeMedia changes or component unmounts
  useEffect(() => {
    const prevUrl = activeMedia?.downloadUrl;
    return () => {
      if (prevUrl && prevUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prevUrl);
      }
    };
  }, [activeMedia]);

  // Back button
  const handleBack = () => {
    router.push("/dashboard/Workspace/Export");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-zinc-400">Verifying secure token and loading files...</p>
        </div>
      </div>
    );
  }

  // 1. Expired / Invalid link view
  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 text-zinc-100">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
          
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Lock className="h-8 w-8" />
          </div>

          <h2 className="mb-2 text-xl font-bold tracking-tight">Security Session Expired</h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            This export download link is no longer active. To comply with data governance regulations, access tokens automatically expire after 
            <span className="mx-1 font-semibold text-zinc-200">{data.expiryHours} hours</span> (5 days).
          </p>

          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-left text-xs text-zinc-500 leading-relaxed space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span>Link generated via scheduler/portal logs has a strict validity window.</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span>Please request a new export report or download directly from the logs page inside the portal.</span>
            </div>
          </div>

          <button
            onClick={handleBack}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition-all border border-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Export Logs
          </button>
        </div>
      </div>
    );
  }

  // 2. Generic Error view
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-lg font-bold">Access Error</h2>
          <p className="mb-6 text-sm text-zinc-400">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Export Logs
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Viewer View
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-8 md:px-8 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        
        {/* Navigation & Action Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Export Logs
          </button>

          {/* Security & Expiry info */}
          <div className="flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs font-semibold text-emerald-400 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security Limit: {data.expiryHours}h
            </div>
            
            {data.expiresAt && (
              <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold backdrop-blur ${
                timeRemaining < 3600000 * 24 
                  ? "border-amber-500/20 bg-amber-500/5 text-amber-400" 
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
              }`}>
                <Clock className="h-3.5 w-3.5" />
                <span>Expires in: {formatTimeRemaining(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Headline Panel */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 md:p-8 backdrop-blur-md">
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">{data.ruleName}</h1>
          <p className="text-xs md:text-sm text-zinc-400 flex items-center gap-2">
            <span>Destination Path:</span>
            <span className="font-mono bg-zinc-950 px-2.5 py-1 rounded-md text-zinc-300 text-xs border border-zinc-800/80 break-all select-all">
              {data.exportPath}
            </span>
          </p>
        </div>

        {/* Media Player Sidebar/Drawer for Active Video Playback */}
        {activeMedia && activeMedia.type === "video" && (
          <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">Video Stream</span>
              <button
                onClick={() => setActiveMedia(null)}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 p-1.5 text-xs text-zinc-400 transition-colors border border-zinc-850"
              >
                Close Player
              </button>
            </div>
            <p className="mb-4 text-sm font-semibold truncate text-zinc-200">{activeMedia.filename}</p>
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-video max-w-3xl mx-auto border border-zinc-800">
              <video
                ref={videoRef}
                src={activeMedia.downloadUrl}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Media Player Sidebar/Drawer for Active Audio Playback */}
        {activeMedia && activeMedia.type === "audio" && (
          <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">Audio Stream</span>
              <button
                onClick={() => setActiveMedia(null)}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 p-1.5 text-xs text-zinc-400 transition-colors border border-zinc-850"
              >
                Close Player
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-zinc-200">{activeMedia.filename}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Playing temporary signed URL</p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                <audio
                  ref={audioRef}
                  src={activeMedia.downloadUrl}
                  controls
                  autoPlay
                  className="w-full md:w-[400px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Filter and Content Grid */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files by name..."
              className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 py-3.5 pl-11 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-emerald-500/45 focus:ring-1 focus:ring-emerald-500/20 backdrop-blur"
            />
          </div>

          {filteredFiles.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/10 py-16 text-center backdrop-blur">
              <p className="text-zinc-500 text-sm">No files found matching the search filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((file) => {
                const filename = String(file?.filename || "unknown_file");
                const meta = getFileIcon(filename);
                const FileIcon = meta.icon;
                const ext = filename.split(".").pop()?.toLowerCase() || "";
                const isAudio = ["mp3", "wav", "ogg", "aac"].includes(ext);
                const isVideo = ["mp4", "webm", "mkv", "mov", "m4a"].includes(ext);
                const isPlayable = isAudio || isVideo;
                const isCurrentlyPlaying = activeMedia?.filename === filename;

                return (
                  <div
                    key={filename}
                    className={`group relative overflow-hidden rounded-2xl border bg-zinc-900/40 p-5 transition-all duration-300 backdrop-blur ${
                      isCurrentlyPlaying 
                        ? "border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-950/20" 
                        : "border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.bg} ${meta.border} ${meta.color}`}>
                        <FileIcon className="h-5 w-5" />
                      </div>

                      {/* Content details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors" title={filename}>
                          {filename}
                        </h3>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Exported: {formatExportedAt(file.exportedAt)}
                        </p>
                        <span className="mt-2.5 inline-block rounded-md bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-400 uppercase border border-zinc-800">
                          {ext}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex gap-2 border-t border-zinc-800/60 pt-4">
                      {isPlayable && (
                        <button
                          onClick={() => handlePlayMedia(file, isAudio ? "audio" : "video")}
                          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                            isCurrentlyPlaying
                              ? "bg-zinc-800 text-zinc-100 border-zinc-750 hover:bg-zinc-700"
                              : "bg-zinc-950 text-zinc-200 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-750"
                          }`}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              Play Inline
                            </>
                          )}
                        </button>
                      )}

                      <a
                        href={file.downloadUrl}
                        download={file.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all border bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500/30 ${
                          isPlayable ? "w-auto" : "flex-1"
                        }`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ExportViewPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    }>
      <ErrorBoundary>
        <ExportViewerContent />
      </ErrorBoundary>
    </Suspense>
  );
}
