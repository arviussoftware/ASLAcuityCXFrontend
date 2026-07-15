// app/dashboard/dashboard1/page.jsx
"use client";
import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { IoAddCircleOutline } from "react-icons/io5";
import withAuth from "@/components/withAuth";
import { notFound } from "next/navigation";
import { FaBuildingUser } from "react-icons/fa6";
import { FcSalesPerformance } from "react-icons/fc";
import { BiSolidReport } from "react-icons/bi";
import { RxActivityLog } from "react-icons/rx";
import { RiBarChartHorizontalFill } from "react-icons/ri";
import { FaChartPie } from "react-icons/fa6";
import { FaUserAstronaut } from "react-icons/fa";
import { MdOutlineMultilineChart } from "react-icons/md";
import { RxCountdownTimer } from "react-icons/rx";
import { MdOutlineSupportAgent } from "react-icons/md";
import { MdOutlineRecentActors } from "react-icons/md";
import { GiGrowth } from "react-icons/gi";
import { TbActivityHeartbeat } from "react-icons/tb";
import { SiPrivateinternetaccess } from "react-icons/si";
import { IoBarChart } from "react-icons/io5";
import { Plus } from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }
`;

const ICON_MAP = {
  FaUserAstronaut,
  FaBuildingUser,
  GiGrowth,
  TbActivityHeartbeat,
  SiPrivateinternetaccess,
  IoBarChart,
  FaChartPie,
  MdOutlineRecentActors,
  RiBarChartHorizontalFill,
  MdOutlineSupportAgent,
  MdOutlineMultilineChart,
  RxCountdownTimer,
  RxActivityLog,
  FcSalesPerformance,
  BiSolidReport,
};

const EvaluationPassFailUI = dynamic(
  () => import("./Interection/getEvaluationPassFailDetails.jsx"),
  { ssr: false },
);
const CallMetricsDashboard = dynamic(
  () => import("./Interection/callDashbordSummury.jsx"),
  { ssr: false },
);
const AgentCallSummary = dynamic(
  () => import("./Interection/agentCallSummary.jsx"),
  { ssr: false },
);
const FormUsageDashboard = dynamic(
  () => import("./Interection/FormUsageDashboard.jsx"),
  { ssr: false },
);
const CallVolumeTrends = dynamic(
  () => import("./Interection/callVolumeTrends.jsx"),
  { ssr: false },
);
const EvaluationCompletionSummary = dynamic(
  () => import("./Interection/evaluationCompletionSummary.jsx"),
  { ssr: false },
);
const EvaluationTimeAnalyzerPage = dynamic(
  () => import("./Interection/evaluationTimeAnalyzer.jsx"),
  { ssr: false },
);
const CallActivityTimelinePage = dynamic(
  () => import("./Interection/callActivity.jsx"),
  { ssr: false },
);
const AgentPerformancePage = dynamic(
  () => import("./Interection/agentPerformance.jsx"),
  { ssr: false },
);
const Dashboard = dynamic(() => import("./Form/Dashboard.jsx"), { ssr: false });
const FormTrendChart = dynamic(() => import("./Form/formTrend.jsx"), {
  ssr: false,
});
const FormStatusChart = dynamic(() => import("./Form/formStatusChart.jsx"), {
  ssr: false,
});
const TopCreatorsChart = dynamic(() => import("./Form/creatorWiseForm.jsx"), {
  ssr: false,
});
const FormVersionTracker = dynamic(
  () => import("./Form/formVersionTracker.jsx"),
  { ssr: false },
);
const RecentlyUpdatedFormsChart = dynamic(
  () => import("./Form/recentlyUpdatedForms.jsx"),
  { ssr: false },
);
const FormLifecycle = dynamic(() => import("./Form/formLifeCycle.jsx"), {
  ssr: false,
});
const StrictFormsLeaderboard = dynamic(
  () => import("./Form/top5StrictForms.jsx"),
  { ssr: false },
);
const FormActionCenter = dynamic(() => import("./Form/formAction.jsx"), {
  ssr: false,
});
const DashboardSummary = dynamic(() => import("./Users/DashboardSummary.jsx"), {
  ssr: false,
});
const UsersPerRoleChart = dynamic(
  () => import("./Users/usersPerRoleChart.jsx"),
  { ssr: false },
);
const UsersPerOrganizationChart = dynamic(
  () => import("./Users/usersPerOrganizationChart.jsx"),
  { ssr: false },
);
// const FilteredUsersForm = dynamic(() => import("./Users/FilteredUsersForm.jsx"), { ssr: false });
const UserGrowthChart = dynamic(() => import("./Users/usersGrowth.jsx"), {
  ssr: false,
});
const ActivityFeed = dynamic(() => import("./Users/usersRecentActivity.jsx"), {
  ssr: false,
});
const TopContributors = dynamic(() => import("./Users/TopContributors.jsx"), {
  ssr: false,
});
const RoleAccess = dynamic(() => import("./Users/userRoleAccess.jsx"), {
  ssr: false,
});

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Responsive, WidthProvider } from "react-grid-layout";
const ResponsiveGridLayout = WidthProvider(Responsive);

import { useRouter } from "next/navigation";

const MODULE_ID = 1;
const MODULE_LICENSE_BY_TAB = {
  Users: 2,
  forms: 5,
  interactions: 6,
};
const PRIVILEGES = {
  USERS: 21,
  FORMS: 22,
  INTERACTIONS: 23,
};

// ── Add Widget Modal — unchanged ──────────────────────────────────────────────
const AddWidgetModal = ({
  isOpen,
  onClose,
  onConfirm,
  widgets = [],
  alreadyVisible = [],
  pendingWidgets = [],
  onTogglePending,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl rounded-2xl p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-foreground">Add Widget</h2>
        <p className="text-muted-foreground mt-1 mb-6">
          Select one or more widgets to add
        </p>
        <hr className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {widgets.map((w) => {
            const Icon = ICON_MAP[w.IconName];
            const isAlreadyVisible = alreadyVisible.includes(w.WidgetKey);
            const isPending = pendingWidgets.includes(w.WidgetKey);

            return (
              <div
                key={w.WidgetKey}
                onClick={() =>
                  !isAlreadyVisible && onTogglePending(w.WidgetKey)
                }
                className={`relative bg-card border rounded-xl p-5 shadow-sm transition cursor-pointer
                  ${isAlreadyVisible ? "opacity-40 blur-[2px] pointer-events-none border-border" : ""}
                  ${isPending ? "border-primary ring-2 ring-primary/30" : "border-border hover:shadow-md"}
                `}
              >
                {isPending && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
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
                  </div>
                )}
                <div className="mb-4">
                  {Icon && <Icon className="text-4xl text-primary" />}
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {w.WidgetName}
                </h3>
                <p className="text-muted-foreground text-sm">{w.Description}</p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-8 gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-secondary hover:bg-gray-300 text-foreground font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pendingWidgets.length === 0}
            className="px-5 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            Add {pendingWidgets.length > 0 ? `(${pendingWidgets.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const DashboardHome = () => {
  const [tab, setTab] = useState("interactions");
  const [roles, setRoles] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [privileges, setPrivileges] = useState([]);
  const [privllagesLoaded, setPrivilegesLoaded] = useState(false);
  const [licensedModuleIds, setLicensedModuleIds] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pendingWidgets, setPendingWidgets] = useState([]);
  const [availableWidgets, setAvailableWidgets] = useState([]);
  const [visibleComponentsMap, setVisibleComponentsMap] = useState({
    interactions: [],
    forms: [],
    Users: [],
  });
  const [savedLayoutMap, setSavedLayoutMap] = useState({
    interactions: { lg: [], md: [], sm: [] },
    forms: { lg: [], md: [], sm: [] },
    Users: { lg: [], md: [], sm: [] },
  });

  const router = useRouter();

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  const hasLicensedModule = (moduleId) => {
    if (!Array.isArray(licensedModuleIds)) return false;
    return licensedModuleIds.map(Number).includes(Number(moduleId));
  };

  const isTabLicensed = (tabKey) =>
    hasLicensedModule(MODULE_LICENSE_BY_TAB[tabKey]);

  const canAccessDashboardShell = () =>
    hasLicensedModule(MODULE_ID) && (isSuperAdmin || hasPrivilege(1));

  const canAccessTab = (tabKey, privilegeId) =>
    canAccessDashboardShell() &&
    isTabLicensed(tabKey) &&
    (isSuperAdmin || hasPrivilege(privilegeId));

  const fetchWidgetsForTab = async () => {
    try {
      const res = await fetch(`/api/dashBoard1/widgets?tab=${tab}`);
      const data = await res.json();
      setAvailableWidgets(data.widgets || []);
    } catch (err) {
      console.error("Failed to fetch widgets", err);
    }
  };

  const loadUserDashboard = async (tabKey) => {
    const res = await fetch(`/api/dashBoard1/user-config?tab=${tabKey}`, {
      headers: { loggedInUserId: currentUser.userId },
    });
    const data = await res.json();
    return {
      widgets: data.widgets.map((w) => w.WidgetKey),
      layouts: data.layout
        ? JSON.parse(data.layout)
        : { lg: [], md: [], sm: [] },
    };
  };

  useEffect(() => {
    if (!currentUser) return;
    const loadAll = async () => {
      const usersData = await loadUserDashboard("Users");
      const formsData = await loadUserDashboard("forms");
      const interactionsData = await loadUserDashboard("interactions");
      setSavedLayoutMap({
        interactions: interactionsData.layouts,
        forms: formsData.layouts,
        Users: usersData.layouts,
      });
      setVisibleComponentsMap({
        interactions: interactionsData.widgets,
        forms: formsData.widgets,
        Users: usersData.widgets,
      });
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    const storedRoles = sessionStorage.getItem("agentRoles");
    if (!storedRoles) return;
    const agentRoles = JSON.parse(storedRoles);
    const fetchPrivileges = async () => {
      try {
        const encryptedUser = sessionStorage.getItem("user");
        if (!encryptedUser) return;
        const bytes = CryptoJS.AES.decrypt(encryptedUser, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        setCurrentUser(user);
        if (Array.isArray(user?.licensedModules)) {
          setLicensedModuleIds(user.licensedModules.map(Number));
        }
        const role = Number(user?.userRoles?.[0]?.roleId);

        let sessionIsSuperAdmin = false;
        try {
          const meRes = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
          });
          if (meRes.ok) {
            const me = await meRes.json();
            sessionIsSuperAdmin = !!me?.isSuperAdmin;
            if (Array.isArray(me?.licensedModules)) {
              setLicensedModuleIds(me.licensedModules.map(Number));
            }
          }
        } catch {
          sessionIsSuperAdmin = false;
        }
        setIsSuperAdmin(sessionIsSuperAdmin);
        const currentPath = window.location.pathname;
        if (
          currentPath === "/dashboard/QMagent" &&
          !agentRoles.includes(role) &&
          !sessionIsSuperAdmin
        ) {
          router.replace("/404");
          return;
        }
        const response = await fetch("/api/moduleswithPrivileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: user?.userId,
            moduleId: MODULE_ID,
            orgIds: (() => {
              const storedOrgIds = sessionStorage.getItem("selectedOrgIds");

              if (!storedOrgIds) {
                return sessionStorage.getItem("selectedOrgId") || "";
              }

              try {
                const parsed = JSON.parse(storedOrgIds);
                return Array.isArray(parsed)
                  ? parsed.join(",")
                  : String(parsed || "");
              } catch {
                return storedOrgIds;
              }
            })(),
          },
          credentials: "include",
        });
        const data = await response.json();
        const serverPrivileges = data?.privileges || [];
        const privilegeIds = serverPrivileges.map((p) => p.PrivilegeId);
        const hasOnly1And24 =
          privilegeIds.length === 2 &&
          privilegeIds.includes(1) &&
          privilegeIds.includes(24);
        if (
          agentRoles.includes(role) &&
          hasOnly1And24 &&
          currentPath === "/dashboard/dashboard1"
        ) {
          router.replace("/dashboard/QMagent");
          return;
        }
        if (
          agentRoles.includes(role) &&
          currentPath === "/dashboard/dashboard1" &&
          !hasOnly1And24
        ) {
          router.replace("/404");
          return;
        }
        setPrivileges(serverPrivileges);
        setPrivilegesLoaded(true);
      } catch (err) {
        console.error("Privilege fetch error:", err);
        setLicensedModuleIds((prev) => prev || []);
        setPrivilegesLoaded(true);
      }
    };
    fetchPrivileges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsClient(true);

    sessionStorage.removeItem("interactionDateRange");
    sessionStorage.removeItem("selectedCallStatus");

    if (typeof window !== "undefined" && privileges.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const requestedTab = searchParams.get("tab");

      // Find allowed tabs in order
      const allowedTabs = [];

      if (canAccessTab("interactions", PRIVILEGES.INTERACTIONS)) {
        allowedTabs.push("interactions");
      }

      if (canAccessTab("forms", PRIVILEGES.FORMS)) {
        allowedTabs.push("forms");
      }

      if (canAccessTab("Users", PRIVILEGES.USERS)) {
        allowedTabs.push("Users");
      }

      // First allowed tab
      const defaultTab = allowedTabs[0];
      if (!defaultTab) return;

      // If URL tab exists and user has access → use it
      // otherwise use first allowed tab
      const finalTab =
        requestedTab && allowedTabs.includes(requestedTab)
          ? requestedTab
          : defaultTab;

      setTab(finalTab);

      const url = new URL(window.location.href);
      url.searchParams.set("tab", finalTab);
      window.history.replaceState(null, "", url);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privileges, licensedModuleIds, isSuperAdmin]);

  const hasAnyAccess = () =>
    canAccessTab("interactions", PRIVILEGES.INTERACTIONS) ||
    canAccessTab("forms", PRIVILEGES.FORMS) ||
    canAccessTab("Users", PRIVILEGES.USERS);

  if (!privllagesLoaded || !Array.isArray(licensedModuleIds)) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }
  if (!canAccessDashboardShell()) {
    return notFound();
  }
  if (privllagesLoaded && !hasAnyAccess()) {
    return notFound();
  }
  if (privllagesLoaded && !hasPrivilege(1) && !isSuperAdmin) {
    return notFound();
  }
  if (!isClient) {
    return (
      <div className="p-4 text-muted-foreground text-sm">Initializing...</div>
    );
  }

  const availableTabs = [
    canAccessTab("interactions", PRIVILEGES.INTERACTIONS) && {
      key: "interactions",
      label: "Interactions",
    },
    canAccessTab("forms", PRIVILEGES.FORMS) && {
      key: "forms",
      label: "Forms",
    },
    canAccessTab("Users", PRIVILEGES.USERS) && {
      key: "Users",
      label: "User Management",
    },
  ].filter(Boolean);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.replaceState(null, "", url);
  };

  // ── NEW DashboardHeader — pill style matching design system ──────────────
  const DashboardHeader = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      {/* Pill tab strip */}
      <div
        role="tablist"
        className="inline-flex items-center gap-0.5 p-0.5 bg-gray-200/60 rounded-lg"
      >
        {availableTabs.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(key)}
              className={`
                flex items-center px-3 py-1.5
                rounded-md text-xs font-medium select-none outline-none
                transition-all duration-150
                ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-gray-200/70"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/40"
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Add Widget button */}
      <div className="relative group">
        <button
          onClick={async () => {
            await fetchWidgetsForTab();
            setShowAddMenu(true);
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg
                     bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white
                     text-xs font-medium transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Widget
        </button>

        {/* Modal */}
        <AddWidgetModal
          isOpen={showAddMenu}
          onClose={() => {
            setShowAddMenu(false);
            setPendingWidgets([]);
          }}
          onTogglePending={(key) => {
            setPendingWidgets((prev) =>
              prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key],
            );
          }}
          onConfirm={async () => {
            const currentVisible = visibleComponentsMap[tab] || [];
            const widgetConfig = getWidgetConfig(tab);
            let updatedVisible = [...currentVisible];
            let updatedLayouts = {
              ...(savedLayoutMap[tab] || {
                lg: [],
                md: [],
                sm: [],
                xs: [],
                xxs: [],
              }),
            };

            for (const key of pendingWidgets) {
              if (updatedVisible.includes(key)) continue;
              const config = widgetConfig[key]?.default;
              if (!config) continue;

              const index = updatedVisible.length;
              updatedVisible.push(key);

              const newItem = (cols) => ({
                i: key,
                w: config.w,
                h: config.h,
                x: (index * config.w) % cols,
                y: Math.floor(index / (cols / config.w)) * config.h,
                minW: config.minW,
                minH: config.minH,
                maxW: config.maxW,
                maxH: config.maxH,
              });

              updatedLayouts = {
                lg: [...(updatedLayouts.lg || []), newItem(12)],
                md: [...(updatedLayouts.md || []), newItem(10)],
                sm: [...(updatedLayouts.sm || []), newItem(6)],
                xs: [...(updatedLayouts.xs || []), newItem(4)],
                xxs: [...(updatedLayouts.xxs || []), newItem(2)],
              };

              await fetch("/api/dashBoard1/user-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: currentUser.userId,
                  tab,
                  widgetKey: key,
                  isVisible: true,
                }),
              });
            }

            setVisibleComponentsMap({
              ...visibleComponentsMap,
              [tab]: updatedVisible,
            });
            setSavedLayoutMap({ ...savedLayoutMap, [tab]: updatedLayouts });
            setPendingWidgets([]);
            setShowAddMenu(false);
          }}
          pendingWidgets={pendingWidgets}
          alreadyVisible={visibleComponentsMap[tab]}
          widgets={availableWidgets}
        />
      </div>
    </div>
  );

  // ── Widget configs — unchanged ────────────────────────────────────────────
  const widgetConfigUsers = {
    UsersPerRoleChart: {
      component: UsersPerRoleChart,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 8, maxH: 14 },
    },
    UsersPerOrganizationChart: {
      component: UsersPerOrganizationChart,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 8, maxH: 14 },
    },
    UserGrowthChart: {
      component: UserGrowthChart,
      default: { w: 4, h: 8, minW: 3, minH: 5, maxW: 10, maxH: 14 },
    },
    ActivityFeed: {
      component: ActivityFeed,
      default: { w: 4, h: 8, minW: 3, minH: 5, maxW: 8, maxH: 14 },
    },
    RoleAccess: {
      component: RoleAccess,
      default: { w: 4, h: 8, minW: 3, minH: 5, maxW: 8, maxH: 14 },
    },
    // FilteredUsersForm:          { component: FilteredUsersForm,          default: { w: 12, h: 12, minW: 8, minH: 10, maxW: 12, maxH: 16 } },
  };

  const widgetConfigForms = {
    FormStatusChart: {
      component: FormStatusChart,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 6, maxH: 12 },
    },
    RecentlyUpdatedFormsChart: {
      component: RecentlyUpdatedFormsChart,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 6, maxH: 12 },
    },
    FormActionCenter: {
      component: FormActionCenter,
      default: { w: 12, h: 12, minW: 8, minH: 10, maxW: 12, maxH: 16 },
    },
  };

  const widgetConfigInteractions = {
    AgentCallSummary: {
      component: AgentCallSummary,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 8, maxH: 14 },
    },
    CallVolumeTrends: {
      component: CallVolumeTrends,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 8, maxH: 14 },
    },
    EvaluationTimeAnalyzerPage: {
      component: EvaluationTimeAnalyzerPage,
      default: { w: 12, h: 12, minW: 8, minH: 10, maxW: 12, maxH: 16 },
    },
    CallActivityTimelinePage: {
      component: CallActivityTimelinePage,
      default: { w: 6, h: 8, minW: 4, minH: 5, maxW: 8, maxH: 14 },
    },
    AgentPerformancePage: {
      component: AgentPerformancePage,
      default: { w: 6, h: 8, minW: 4, minH: 9, maxW: 10, maxH: 16 },
    },
    EvaluationPassFailUI: {
      component: EvaluationPassFailUI,
      default: { w: 4, h: 8, minW: 3, minH: 5, maxW: 10, maxH: 24 },
    },
  };

  const getWidgetConfig = (currentTab) => {
    if (currentTab === "Users") return widgetConfigUsers;
    if (currentTab === "forms") return widgetConfigForms;
    if (currentTab === "interactions") return widgetConfigInteractions;
    return {};
  };

  const normalizeLayouts = (layouts) => {
    const breakpoints = ["lg", "md", "sm", "xs", "xxs"];
    const base = layouts.lg || [];
    const normalized = {};
    breakpoints.forEach((bp) => {
      normalized[bp] =
        layouts[bp] && layouts[bp].length
          ? layouts[bp]
          : base.map((l) => ({ ...l }));
    });
    return normalized;
  };

  const renderGrid = (currentTab) => {
    const visibleComponents = visibleComponentsMap[currentTab] || [];
    const currentLayouts = normalizeLayouts(
      savedLayoutMap[currentTab] || { lg: [] },
    );
    const widgetConfig = getWidgetConfig(currentTab);
    if (visibleComponents.length === 0) return null;

    return (
      <ResponsiveGridLayout
        className="layout"
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={20}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        isDraggable={true}
        isResizable={true}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-action-btn"
        layouts={currentLayouts}
        resizeHandles={["s", "e", "n", "w", "se", "sw", "ne", "nw"]}
        onLayoutChange={async (layout, allLayouts) => {
          const newLayoutsForTab = {
            lg: allLayouts.lg || [],
            md: allLayouts.md || [],
            sm: allLayouts.sm || [],
            xs: allLayouts.xs || [],
            xxs: allLayouts.xxs || [],
          };
          setSavedLayoutMap({
            ...savedLayoutMap,
            [currentTab]: newLayoutsForTab,
          });
          await fetch("/api/dashBoard1/user-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.userId,
              tab: currentTab,
              layouts: newLayoutsForTab,
            }),
          });
        }}
      >
        {visibleComponents.map((key) => {
          const WidgetComponent = widgetConfig[key]?.component;
          if (!WidgetComponent) return null;
          return (
            <div
              key={key}
              className="relative bg-card rounded-xl shadow-md overflow-visible ring-1 ring-gray-100 group"
            >
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={async (e) => {
                  e.stopPropagation();
                  const updatedVisible = visibleComponents.filter(
                    (c) => c !== key,
                  );
                  setVisibleComponentsMap({
                    ...visibleComponentsMap,
                    [currentTab]: updatedVisible,
                  });
                  const updatedLayouts = { ...currentLayouts };
                  Object.keys(updatedLayouts).forEach((bp) => {
                    updatedLayouts[bp] = updatedLayouts[bp].filter(
                      (l) => l.i !== key,
                    );
                  });
                  setSavedLayoutMap({
                    ...savedLayoutMap,
                    [currentTab]: updatedLayouts,
                  });
                  await fetch("/api/dashBoard1/user-config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId: currentUser.userId,
                      tab: currentTab,
                      widgetKey: key,
                      isVisible: false,
                    }),
                  });
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-red-500 rounded-full w-7 h-7 flex items-center justify-center shadow-sm hover:shadow"
              >
                ✕
              </button>
              <WidgetComponent />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    );
  };

  const renderContent = () => {
    switch (tab) {
      case "forms":
        return (
          <>
            <Dashboard />
            {renderGrid(tab)}
          </>
        );
      case "Users":
        return (
          <>
            <DashboardSummary />
            {renderGrid(tab)}
          </>
        );
      case "interactions":
        return (
          <>
            <CallMetricsDashboard />
            {renderGrid(tab)}
          </>
        );
      default:
        return (
          <h2 className="p-4 text-muted-foreground text-lg">
            {"Just wait a little, something amazing is about to happen!"}
          </h2>
        );
    }
  };

  return (
    <Suspense
      fallback={
        <div className="p-4 text-muted-foreground text-sm">
          Loading dashboard...
        </div>
      }
    >
      {isClient && (
        <>
          <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
          <DashboardHeader />
          <div className="dashboard-content p-4">{renderContent()}</div>
        </>
      )}
      <style>{`
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
        }
        .group:hover .react-resizable-handle {
          opacity: 1;
        }
      `}</style>
    </Suspense>
  );
};

export default withAuth(DashboardHome);
