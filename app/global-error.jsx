"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.warn("Application shell warning:", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>System Error - AcuityCX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            margin: 0;
            padding: 0;
            background-color: #0a0f1d;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        `}} />
      </head>
      <body>
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0f1d] px-6 text-center">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[var(--brand-secondary,#20b2aa)]/5 blur-[80px] pointer-events-none" />

          <div className="relative z-10 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Large Elegant Symbol */}
            <div className="text-6xl md:text-7xl font-extralight text-red-400 mb-4 select-none">
              !
            </div>

            {/* Status Text */}
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">
              Application Error
            </h2>
            
            {/* Short clean description */}
            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-xs mx-auto">
              A critical connection fault occurred. Please reload the application shell to attempt system recovery.
            </p>

            {/* Reload Button */}
            <div className="flex justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium text-white transition-all duration-200 bg-[var(--brand-secondary,#20b2aa)] hover:bg-[var(--brand-secondary,#20b2aa)]/90 active:scale-95 shadow-lg shadow-[var(--brand-secondary,#20b2aa)]/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
