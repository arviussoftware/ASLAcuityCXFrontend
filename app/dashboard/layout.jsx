//app/dashboard/layout.jsx
"use client";
import { useState } from "react";
import Sidebar from "../../components/sidebar";
import TopBar from "../../components/topbar";
import "./../globals.css";
import ScreenSizeGuard from "../../components/ScreenSizeGuard";
import { DownloadJobProvider } from "@/components/downloadJobProvider";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const contentOffset = sidebarCollapsed ? "sm:pl-14" : "sm:pl-14";
  return (
    <ScreenSizeGuard>
      <DownloadJobProvider>
        <div className="flex min-h-screen flex-col bg-muted/40">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((prev) => !prev)}
          />

          {/* add transition so it slides smoothly */}
          <div
            className={`flex flex-col flex-grow ${contentOffset} transition-all duration-300`}
          >
            <TopBar
              onMenuClick={() => setSidebarOpen(true)}
              onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
              sidebarCollapsed={sidebarCollapsed}
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </main>
            {/* <Toaster /> */}
          </div>
        </div>
      </DownloadJobProvider>
    </ScreenSizeGuard>
  );
};

export default Layout;
