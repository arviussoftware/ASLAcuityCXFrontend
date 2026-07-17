"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0f1d] px-6 text-center font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[var(--brand-secondary,#20b2aa)]/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Large Elegant Numeric Indicator */}
        <h1 className="text-8xl md:text-9xl font-extralight tracking-tighter text-[var(--brand-secondary,#20b2aa)] mb-2 select-none">
          404
        </h1>

        {/* Status Text */}
        <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">
          Lost in transmission
        </h2>
        
        {/* Short clean description */}
        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-xs mx-auto">
          The page you are looking for doesn't exist or has been moved to a new address.
        </p>

        {/* Clean and Simple Action Button */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 bg-[var(--brand-secondary,#20b2aa)] hover:bg-[var(--brand-secondary,#20b2aa)]/90 active:scale-95 shadow-lg shadow-[var(--brand-secondary,#20b2aa)]/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
