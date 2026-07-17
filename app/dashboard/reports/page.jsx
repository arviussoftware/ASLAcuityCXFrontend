// app/dashboard/reports/page.jsx//
// app/dashboard/reports/page.jsx
"use client";

import React, { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import withAuth from "@/components/withAuth";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { FiFileText } from "react-icons/fi";
import { BarChart2, ClipboardList, Users, ShieldCheck } from "lucide-react";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }
`;

// ── Tab definitions ───────────────────────────────────────────────────────────
const TAB_META = [
  // {
  //   key: "evaluation",
  //   label: "Evaluation Reports",
  //   icon: ClipboardList,
  //   description: "View evaluation scores and statistics",
  // },
  // {
  //   key: "interactions",
  //   label: "Interactions Reports",
  //   icon: BarChart2,
  //   description: "View raw interaction data reports",
  // },
  // {
  //   key: "user",
  //   label: "User Management Report",
  //   icon: Users,
  //   description: "View user management analytics",
  // },
  {
    key: "audit",
    label: "Audit Report",
    icon: ShieldCheck,
    description: "View audit trail logs",
  },
];

// ── Skeletons ─────────────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-gray-200/60 rounded-lg">
          {[120, 140, 160, 100].map((w, i) => (
            <div
              key={i}
              className="h-7 rounded-md bg-gray-300/50"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="h-3 w-40 bg-gray-100 rounded" />
        <div className="h-2.5 w-64 bg-gray-100 rounded mt-2" />
      </div>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-48 bg-gray-100 rounded" />
            <div className="h-2.5 w-32 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Report list for a tab (fully dynamic via TabKey from DB) ──────────────────
function ReportList({ reports, tabKey, router }) {
  const buildReportHref = (redirectPath) =>
    `${redirectPath}?tab=${encodeURIComponent(tabKey)}`;

  // All tabs are now fully driven by DB — no special cases
  const filtered = reports.filter((r) => r.TabKey === tabKey);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-400">
          No reports available for this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {filtered.map((report) => (
        <div
          key={report.Id}
          className="flex items-center bg-muted hover:bg-blue-50 transition-all duration-150 shadow-sm rounded-lg p-4 cursor-pointer border border-transparent hover:border-blue-100"
          onClick={() => router.push(buildReportHref(report.RedirectPath))}
        >
          <div className="text-primary text-3xl mr-4 flex-shrink-0">
            <FiFileText />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {report.ReportName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click to view detailed analysis
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ReportsCombinedPage() {
  const [activeTab, setActiveTab] = useState(null);
  const [reports, setReports] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const hasAccess = privileges.some((p) => p.PrivilegeId === 1);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          userId = user?.userId || null;
        }

        const response = await fetch("/api/privileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 10,
            orgId: sessionStorage.getItem("selectedOrgId") || "",
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();
        setPrivileges(data.privileges || []);
      } catch (err) {
        console.warn("Error fetching privileges:", err);
      } finally {
        setPrivilegesLoaded(true);
      }
    };

    fetchPrivileges();
  }, []);

  useEffect(() => {
    if (!privilegesLoaded || !hasAccess) return;

    const fetchReports = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          userId = user?.userId || null;
        }

        const response = await fetch("/api/reports", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });

        const result = await response.json();
        if (response.ok) {
          setReports(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setReportsLoaded(true);
      }
    };

    fetchReports();
  }, [privilegesLoaded, hasAccess]);

  useEffect(() => {
    if (!privilegesLoaded) return;

    const requestedTab = searchParams?.get("tab");
    const validKeys = TAB_META.map((t) => t.key);
    const nextTab = validKeys.includes(requestedTab)
      ? requestedTab
      : // : "evaluation";
        "audit";

    if (activeTab !== nextTab) setActiveTab(nextTab);
    if (requestedTab !== nextTab) {
      // router.replace(`/dashboard/reports?tab=evaluation`);
      router.replace(`/dashboard/reports?tab=audit`);
    }
  }, [privilegesLoaded, searchParams]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    router.replace(`/dashboard/reports?tab=${key}`);
  };

  if (!privilegesLoaded) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
        <div className="space-y-4">
          <TabSkeleton />
          <ContentSkeleton />
        </div>
      </>
    );
  }

  if (privilegesLoaded && !hasAccess) return notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {TAB_META.find((t) => t.key === activeTab)?.label || "Reports"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {TAB_META.find((t) => t.key === activeTab)?.description ||
                "Reports overview"}
            </p>
          </div>

          <div role="tabpanel" className="p-5">
            {!reportsLoaded ? (
              <ContentSkeleton />
            ) : (
              <ReportList
                reports={reports}
                tabKey={activeTab}
                router={router}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default withAuth(ReportsCombinedPage);
