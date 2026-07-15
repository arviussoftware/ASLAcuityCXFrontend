"use client";
import Link from "next/link";
import Navbar from "./navbar";
import { useRouter } from "next/navigation";
import { ChevronLeft, X, Sparkles } from "lucide-react";
import { useBranding } from "@/lib/use-branding";
import { useState, useRef } from "react";

export default function Sidebar({
  isOpen = false,
  onClose,
  collapsed = false,
  onToggle,
}) {
  const router = useRouter();
  const branding = useBranding();
  const logoInitial = (branding.appName || "Q").trim().charAt(0).toUpperCase();
  const [showAppTooltip, setShowAppTooltip] = useState(false);
  const appNameRef = useRef(null);

  // Show tooltip only when text is actually truncated
  const handleAppNameMouseEnter = () => {
    const el = appNameRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      setShowAppTooltip(true);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-all duration-300 sm:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-all duration-300 hidden sm:block ${
          !collapsed ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onToggle}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ease-in-out ${
          collapsed ? "w-16 sm:w-16" : "w-64 sm:w-72"
        } ${isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}
        role="navigation"
        aria-label="Sidebar"
        style={{
          background:
            "linear-gradient(145deg, hsl(var(--card) / 0.95) 0%, hsl(var(--background) / 0.95) 100%)",
        }}
      >
        <div className="relative flex h-16 items-center justify-between px-2 border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/20" />

          <div
            onClick={collapsed ? onToggle : undefined}
            className={`relative flex items-center gap-3 min-w-0 group ${
              collapsed ? "cursor-pointer" : ""
            }`}
          >
            <div
              className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              <span className="relative text-white font-bold text-xl">{logoInitial}</span>
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Sparkles className="h-3 w-3 text-yellow-300" />
              </div>
            </div>

            {(!collapsed || isOpen) && (
              <div className="relative flex flex-col min-w-0 max-w-[10.5rem]">
                <Link
                  href="/dashboard/dashboard1"
                  onClick={() => router.refresh()}
                  className="flex flex-col min-w-0 transition-all duration-200"
                >
                  <span
                    ref={appNameRef}
                    className="font-semibold text-lg leading-tight transition-all duration-200 truncate"
                    onMouseEnter={handleAppNameMouseEnter}
                    onMouseLeave={() => setShowAppTooltip(false)}
                    style={{
                      background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {branding.appName}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    {branding.appTagline}
                  </span>
                </Link>

                {/* Tooltip - neeche aayega */}
                {showAppTooltip && (
                  <div
                    className="absolute left-0 top-full mt-2 z-50 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xl pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                    }}
                  >
                    {/* Arrow upar ki taraf */}
                    <span
                      className="absolute left-4 bottom-full w-0 h-0"
                      style={{
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderBottom: `5px solid ${branding.primaryColor}`,
                      }}
                    />
                    {branding.appName}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-1">
            {!collapsed && (
              <button
                onClick={onToggle}
                className="hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              </button>
            )}

            <button
              onClick={onClose}
              className="sm:hidden inline-flex items-center justify-center rounded-lg p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:shadow-md transition-all duration-200 group"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            </button>
          </div>
        </div>

        <nav className="flex flex-col flex-1 overflow-y-auto">
          <style jsx>{`
            nav::-webkit-scrollbar {
              width: 4px;
            }
            nav::-webkit-scrollbar-track {
              background: transparent;
            }
            nav::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.3);
              border-radius: 2px;
            }
            nav::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.5);
            }
          `}</style>
          <Navbar collapsed={collapsed} onClose={onClose} onToggle={onToggle} />
        </nav>

        {!collapsed && (
          <div className="relative mt-auto p-4 border-t border-border/60">
            <div className="absolute inset-0 bg-gradient-to-r from-muted/40 to-primary/10" />
            <div className="relative text-xs text-muted-foreground text-center">
              (c) 2025 {branding.appName}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}