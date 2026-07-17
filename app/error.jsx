"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.warn("Application segment warning:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0f1d] px-6 text-center font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[var(--brand-secondary,#20b2aa)]/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Large Elegant Symbol */}
        <div className="text-6xl md:text-7xl font-extralight text-red-400 mb-4 select-none">
          !
        </div>

        {/* Status Text */}
        <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">
          Something went wrong
        </h2>
        
        {/* Short clean description */}
        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 max-w-xs mx-auto">
          An unexpected application state was encountered. Our monitoring tools have recorded the diagnostics details.
        </p>

        {/* Diagnostic error box if available */}
        {error && (
          <div className="mb-8 p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-[10px] text-red-400/80 text-left overflow-x-auto max-h-24">
            {error.message || "An unexpected error occurred."}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {reset && (
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 bg-[var(--brand-secondary,#20b2aa)] hover:bg-[var(--brand-secondary,#20b2aa)]/90 active:scale-95 shadow-lg shadow-[var(--brand-secondary,#20b2aa)]/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-300 transition-all duration-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}