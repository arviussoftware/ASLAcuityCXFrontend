// components\navbar.jsx
"use client";
import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PhoneCall,
  Home,
  Users2,
  Briefcase,
  Handshake,
  Building,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { FaBriefcase, FaUserCog } from "react-icons/fa";
import { MdOutlineSecurity, MdDataExploration } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import withAuth from "@/components/withAuth";

// Icon mapping based on menuSequenceNo
// 5 (Forms) and 9 (OrgMapping) removed — shown via hardcoded Forms & Mapping
// 2 (Users), 7 (Roles), 8 (Organization) removed — shown via hardcoded Management
const iconMapping = {
  1: <Home className="h-4 w-4" />,
  // 3: <Briefcase className="h-4 w-4" />,
  4: <Handshake className="h-4 w-4" />,
  5: <FileText className="h-4 w-4" />,
  6: <PhoneCall className="h-4 w-4" />,
  10: <FileText className="h-4 w-4" />,
  11: <FaBriefcase className="h-4 w-4" />,
  12: <MdOutlineSecurity className="h-4 w-4" />,
  13: <MdDataExploration className="h-4 w-4" />,
};

// Hardcoded module 1 — Forms + Mapping combined
// Hardcoded module 2 — Users + Organization + Roles combined
const HARDCODED_MANAGEMENT_MODULE = {
  moduleName: "User Management",
  redirectPath: "/dashboard/Management_combined_page",
  icon: <ShieldCheck className="h-4 w-4" />,
};

const HARDCODED_INTEGRATION_MODULE = {
  moduleName: "Integration",
  redirectPath: "/dashboard/integrationWorkspace",
  icon: <FaBriefcase className="h-4 w-4" />,
};

const SOURCE_FILTER_MAP = {
  ccaas: "CCaaS",
  ucaas: "UCaaS",
  crm: "CRM",
  others: "Others",
  stt: "STT",
};

const DEFAULT_SOURCE_FILTERS = Object.values(SOURCE_FILTER_MAP);

function normalizeSourceLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const key = raw.toLowerCase();
  // Keep nice canonical casing for known sources, but allow any dynamic source name too.
  return SOURCE_FILTER_MAP[key] || raw;
}

const Navbar = ({ collapsed, onClose, onToggle }) => {
  const pathname = usePathname();
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [showManagementModule, setShowManagementModule] = useState(false);
  const [showWorkspaceModule, setShowWorkspaceModule] = useState(false);
  const [managementAccess, setManagementAccess] = useState({
    users: false,
    roles: false,
    org: false,
  });
  const [workspaceAccess, setWorkspaceAccess] = useState({
    transcription: false,
    export: false,
  });
  const [reportsAccess, setReportsAccess] = useState(false);
  const [userId, setUserId] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [openManagement, setOpenManagement] = useState(false);
  //const [openReports, setOpenReports] = useState(false);
  const [openIntegration, setOpenIntegration] = useState(false);
  const [openWorkspace, setOpenWorkspace] = useState(false);
  const [integrationFilters, setIntegrationFilters] = useState([]);
  const [hasIntegrationSourceAccess, setHasIntegrationSourceAccess] =
    useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const toggleExclusiveMenu = (menuName) => {
    const nextState = {
      management: menuName === "management" ? !openManagement : false,
      //reports: menuName === "reports" ? !openReports : false,
      integration: menuName === "integration" ? !openIntegration : false,
      workspace: menuName === "workspace" ? !openWorkspace : false,
    };

    setOpenManagement(nextState.management);
    // setOpenReports(nextState.reports);
    setOpenIntegration(nextState.integration);
    setOpenWorkspace(nextState.workspace);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();

        const nextUserId = data?.userId ?? null;
        if (!nextUserId) throw new Error("User ID is not available.");

        setUserId(nextUserId);
        setIsSuperAdmin(!!data?.isSuperAdmin);

        const roles = Array.isArray(data?.roles) ? data.roles : [];
        setRoleId(roles?.[0]?.roleId ?? null);

        setCurrentOrgId(sessionStorage.getItem("selectedOrgId") || null);
        fetchModules(nextUserId);
        fetchPermissions(nextUserId);
      } catch (error) {
        console.error("Error bootstrapping navbar session:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep navbar in sync when org selection changes (modules, permissions, integration sources).
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const interval = setInterval(() => {
      try {
        const nextOrgId = sessionStorage.getItem("selectedOrgId") || null;
        if (!alive) return;
        if (nextOrgId !== currentOrgId) {
          setCurrentOrgId(nextOrgId);
          fetchModules(userId);
          fetchPermissions(userId);
        }
      } catch {
        /* ignore */
      }
    }, 800);

    return () => {
      alive = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentOrgId]);

  const fetchModules = async (userId) => {
    try {
      const orgId = sessionStorage.getItem("selectedOrgId") || null;
      const response = await fetch("/api/modules", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          ...(orgId ? { orgId } : {}),
        },
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const navbarModules = data.navbarModules || [];
      setModules(navbarModules);

      const hasIntegration = navbarModules.some((m) =>
        String(m?.moduleName || "")
          .toLowerCase()
          .includes("integration"),
      );
      if (hasIntegration) {
        fetchIntegrationSources(userId);
      } else {
        setIntegrationFilters([]);
        setHasIntegrationSourceAccess(false);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const fetchPermissions = async (userId) => {
    try {
      const orgId = sessionStorage.getItem("selectedOrgId") || null;
      const response = await fetch("/api/permission", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          ...(orgId ? { orgId } : {}),
        },
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPermissions(data.permissionModel || []);
    } catch (error) {
      console.error(`Error fetching permissions:, ${error}`);
    }
  };

  const fetchIntegrationSources = async (userId) => {
    try {
      const orgId = sessionStorage.getItem("selectedOrgId") || "";
      // Without org context, the DB procedure returns all sources; fail closed for navbar.
      if (!orgId) {
        if (isSuperAdmin) {
          setIntegrationFilters(DEFAULT_SOURCE_FILTERS);
          setHasIntegrationSourceAccess(true);
        } else {
          setIntegrationFilters([]);
          setHasIntegrationSourceAccess(false);
        }
        return;
      }

      const response = await fetch("/api/integrationWorkspace", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgId,
        },
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 403) {
        setIntegrationFilters([]);
        setHasIntegrationSourceAccess(false);
        return;
      }

      const data = await response.json();
      const sourceNames = (data?.data || [])
        .map((s) => normalizeSourceLabel(s?.source))
        .filter(Boolean);

      const allowed = Array.from(new Set(sourceNames));

      const merged = Array.from(
        new Set([...(isSuperAdmin ? DEFAULT_SOURCE_FILTERS : []), ...allowed]),
      );

      setIntegrationFilters(merged);
      setHasIntegrationSourceAccess(isSuperAdmin ? true : allowed.length > 0);
    } catch (error) {
      setIntegrationFilters([]);
      setHasIntegrationSourceAccess(false);
      console.error("Error fetching integration sources:", error);
    }
  };

  useEffect(() => {
    if (!modules.length) return;

    // Super Admin: bypass org-scoped permission filtering and show everything.
    if (isSuperAdmin) {
      const hasWorkspace = (modules || []).some(
        (m) => Number(m.menuSequenceNo) === 13,
      );
      setShowWorkspaceModule(hasWorkspace);
      setWorkspaceAccess({ transcription: hasWorkspace, export: hasWorkspace });

      const hasUsersAccess = (modules || []).some(
        (m) => Number(m.menuSequenceNo) === 2,
      );
      const hasRolesAccess = (modules || []).some(
        (m) => Number(m.menuSequenceNo) === 7,
      );
      const hasOrgAccess = (modules || []).some(
        (m) => Number(m.menuSequenceNo) === 8,
      );
      setShowManagementModule(hasUsersAccess || hasRolesAccess || hasOrgAccess);
      setManagementAccess({
        users: hasUsersAccess,
        roles: hasRolesAccess,
        org: hasOrgAccess,
      });

      const hasReportsAccess = (modules || []).some(
        (m) => Number(m.menuSequenceNo) === 10,
      );
      setReportsAccess(hasReportsAccess);

      setIntegrationFilters((prev) =>
        prev.length ? prev : DEFAULT_SOURCE_FILTERS,
      );
      setHasIntegrationSourceAccess(true);

      setFilteredModules(
        (modules || []).filter(
          (module) =>
            module.menuSequenceNo !== 9 && // Excluded — shown in hardcoded Forms & Mapping
            module.menuSequenceNo !== 2 && // Excluded — shown in hardcoded Management
            module.menuSequenceNo !== 7 && // Excluded — shown in hardcoded Management
            module.menuSequenceNo !== 8 && // Excluded — shown in hardcoded Management
            module.menuSequenceNo !== 10 && // Excluded — shown in Reports submenu
            !String(module.redirectPath || "").startsWith(
              "/dashboard/Workspace",
            ),
        ),
      );
      return;
    }

    if (permissions.length) {
      const byModule = new Map();
      permissions.forEach((perm) => {
        const mid = Number(perm.moduleId);
        const pid = Number(perm.privilegeId);
        if (!Number.isFinite(mid)) return;
        if (!byModule.has(mid)) byModule.set(mid, []);
        byModule.get(mid).push(pid);
      });

      const restrictedModuleIds = Array.from(byModule.entries())
        .filter(([, privs]) => privs.length > 0 && privs.every((p) => p === 11))
        .map(([mid]) => mid);

      const allowedModuleIds = Array.from(byModule.entries())
        .filter(([, privs]) => privs.some((p) => p !== 11))
        .map(([mid]) => mid);

      const moduleIdBySequence = new Map(
        (modules || []).map((m) => [Number(m.menuSequenceNo), Number(m.id)]),
      );
      const moduleIdForSeq = (seq) => moduleIdBySequence.get(Number(seq));
      const isAllowedModule = (moduleId) =>
        Number.isFinite(Number(moduleId)) &&
        allowedModuleIds.includes(Number(moduleId)) &&
        !restrictedModuleIds.includes(Number(moduleId));

      const allowedModules = modules.filter(
        (module) =>
          allowedModuleIds.includes(Number(module.id)) &&
          !restrictedModuleIds.includes(Number(module.id)) &&
          module.menuSequenceNo !== 9 && // Excluded — shown in hardcoded Forms & Mapping
          module.menuSequenceNo !== 2 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 7 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 8 && // Excluded — shown in hardcoded Management
          module.menuSequenceNo !== 10, // Excluded — shown in Reports submenu
      );
      const hasTranscription = permissions.some(
        (p) => Number(p.privilegeId) === 30,
      );
      const hasExport = permissions.some((p) => Number(p.privilegeId) === 31);
      const hasWorkspace = hasTranscription || hasExport;
      setShowWorkspaceModule(hasWorkspace);
      setWorkspaceAccess({
        transcription: hasTranscription,
        export: hasExport,
      });

      setFilteredModules(
        hasWorkspace
          ? allowedModules.filter(
              (m) =>
                !String(m.redirectPath || "").startsWith(
                  "/dashboard/Workspace",
                ),
            )
          : allowedModules,
      );

      // Show Management if user has access to module 2 OR 7 OR 8
      const hasUsersAccess = isAllowedModule(moduleIdForSeq(2));
      const hasRolesAccess = isAllowedModule(moduleIdForSeq(7));
      const hasOrgAccess = isAllowedModule(moduleIdForSeq(8));
      setShowManagementModule(hasUsersAccess || hasRolesAccess || hasOrgAccess);
      setManagementAccess({
        users: hasUsersAccess,
        roles: hasRolesAccess,
        org: hasOrgAccess,
      });
      const hasReportsAccess = isAllowedModule(moduleIdForSeq(10));
      setReportsAccess(hasReportsAccess);
    }
  }, [modules, permissions, isSuperAdmin]);

  useEffect(() => {
    if (!pathname) return;
    const isOnManagement =
      pathname.startsWith("/dashboard/users") ||
      pathname.startsWith("/dashboard/organization") ||
      pathname.startsWith("/dashboard/roleManagement") ||
      pathname.startsWith("/dashboard/Management_combined_page");
    if (isOnManagement) {
      setOpenManagement(true);
      // setOpenReports(false);
      setOpenIntegration(false);
      setOpenWorkspace(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnForms = pathname.startsWith("/dashboard/forms");
    if (isOnForms) {
      setOpenManagement(false);
      // setOpenReports(false);
      setOpenIntegration(false);
      setOpenWorkspace(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnReports =
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/dashboard/reports-combined");
    if (isOnReports) {
      //setOpenReports(true);
      setOpenManagement(false);
      setOpenIntegration(false);
      setOpenWorkspace(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnIntegration = pathname.startsWith(
      "/dashboard/integrationWorkspace",
    );
    if (isOnIntegration) {
      setOpenIntegration(true);
      setOpenManagement(false);
      // setOpenReports(false);
      setOpenWorkspace(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    const isOnWorkspace = pathname.startsWith("/dashboard/Workspace");
    if (isOnWorkspace) {
      setOpenWorkspace(true);
      setOpenManagement(false);
      // setOpenReports(false);
      setOpenIntegration(false);
    }
  }, [pathname]);

  const handleModuleClick = () => {
    if (!collapsed && onToggle && window.innerWidth >= 640) {
      onToggle();
    }
    if (onClose && window.innerWidth < 640) {
      onClose();
    }
  };

  const handleDynamicModuleClick = (module) => {
    sessionStorage.setItem("selectedModuleId", module.id);
    handleModuleClick();
  };

  return (
    <TooltipProvider>
      <nav className="flex flex-col items-start gap-3 px-4 sm:py-5">
        {/* ── Helper to render a single dynamic module link ── */}
        {(() => {
          const renderItem = (
            label,
            href,
            iconEl,
            onClick,
            isActive,
            showChevron = false,
          ) => {
            if (collapsed) {
              return (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      onClick={onClick}
                      className={`flex items-center justify-center w-full px-2 py-2 rounded-md transition-colors ${
                        isActive
                          ? "bg-muted/60 text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {iconEl}
                      <span className="sr-only">{label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={label}
                href={href}
                onClick={onClick}
                className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-muted/60 text-brand-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-[16px] w-5 flex items-center justify-center">
                  {iconEl}
                </span>
                <span className="flex-1 truncate">{label}</span>
                {showChevron && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                )}
              </Link>
            );
          };
          const renderDynamicModule = (module) => {
            if (!module?.redirectPath) {
              return null;
            }

            const normalizedHref = String(module.redirectPath).startsWith("/")
              ? String(module.redirectPath)
              : `/${String(module.redirectPath)}`;
            const isActive = pathname?.startsWith(normalizedHref);

            const isFormsModule =
              Number(module?.menuSequenceNo) === 5 ||
              String(module?.moduleName || "")
                .toLowerCase()
                .includes("form designer");

            const displayLabel = isFormsModule
              ? "Form Management"
              : module.moduleName;
            const displayIcon = isFormsModule ? (
              <LayoutDashboard className="h-4 w-4" />
            ) : (
              module.icon ||
              iconMapping[module.menuSequenceNo] || <Home className="h-4 w-4" />
            );

            return (
              <div key={module.moduleName} className="flex items-center w-full">
                {renderItem(
                  displayLabel,
                  normalizedHref,
                  displayIcon,
                  () => handleDynamicModuleClick(module),
                  isActive,
                )}
              </div>
            );
          };
          const workspaceItem = showWorkspaceModule ? (
            <div key="workspace-hardcoded" className="w-full">
              {collapsed ? (
                renderItem(
                  "Workspace",
                  workspaceAccess.transcription
                    ? "/dashboard/Workspace/Transcription"
                    : "/dashboard/Workspace/Export",
                  iconMapping[13] || <Briefcase className="h-4 w-4" />,
                  handleModuleClick,
                  pathname?.startsWith("/dashboard/Workspace"),
                )
              ) : (
                <div
                  className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    openWorkspace
                      ? "bg-muted/60 text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link
                    href={
                      workspaceAccess.transcription
                        ? "/dashboard/Workspace/Transcription"
                        : "/dashboard/Workspace/Export"
                    }
                    onClick={handleModuleClick}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="text-[16px] w-5 flex items-center justify-center">
                      {iconMapping[13] || <Briefcase className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 truncate text-left">Workspace</span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle workspace menu"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExclusiveMenu("workspace");
                    }}
                    className="p-1 -mr-1 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <ChevronRight
                      className={`h-3 w-3 text-muted-foreground transition-transform ${
                        openWorkspace ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                </div>
              )}

              {!collapsed && openWorkspace && (
                <div className="mt-1 pl-6">
                  {workspaceAccess.transcription && (
                    <Link
                      href="/dashboard/Workspace/Transcription"
                      onClick={handleModuleClick}
                      className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                        pathname?.startsWith(
                          "/dashboard/Workspace/Transcription",
                        )
                          ? "text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: pathname?.startsWith(
                            "/dashboard/Workspace/Transcription",
                          )
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="truncate">Transcription</span>
                    </Link>
                  )}
                  {workspaceAccess.export && (
                    <Link
                      href="/dashboard/Workspace/Export"
                      onClick={handleModuleClick}
                      className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                        pathname?.startsWith("/dashboard/Workspace/Export")
                          ? "text-brand-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: pathname?.startsWith(
                            "/dashboard/Workspace/Export",
                          )
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="truncate">Export</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : null;

          const managementItem = showManagementModule ? (
            <div key="management-hardcoded" className="w-full">
              {collapsed ? (
                renderItem(
                  HARDCODED_MANAGEMENT_MODULE.moduleName,
                  "/dashboard/users",
                  HARDCODED_MANAGEMENT_MODULE.icon,
                  handleModuleClick,
                  pathname?.startsWith("/dashboard/users") ||
                    pathname?.startsWith("/dashboard/organization") ||
                    pathname?.startsWith("/dashboard/roleManagement") ||
                    pathname?.startsWith("/dashboard/Management_combined_page"),
                )
              ) : (
                <div
                  className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    openManagement
                      ? "bg-muted/60 text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link
                    href="/dashboard/Management_combined_page"
                    onClick={handleModuleClick}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="text-[16px] w-5 flex items-center justify-center">
                      {HARDCODED_MANAGEMENT_MODULE.icon}
                    </span>
                    <span className="flex-1 truncate text-left">
                      User Management
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle management menu"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExclusiveMenu("management");
                    }}
                    className="p-1 -mr-1 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <ChevronRight
                      className={`h-3 w-3 text-muted-foreground transition-transform ${
                        openManagement ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                </div>
              )}

              {!collapsed && openManagement && (
                <div className="mt-1 pl-6">
                  {(() => {
                    const items = [
                      managementAccess.users && {
                        label: "Users",
                        href: "/dashboard/users",
                        active: pathname?.startsWith("/dashboard/users"),
                      },
                      managementAccess.roles && {
                        label: "Roles",
                        href: "/dashboard/roleManagement",
                        active: pathname?.startsWith(
                          "/dashboard/roleManagement",
                        ),
                      },
                      managementAccess.org && {
                        label: "Organization",
                        href: "/dashboard/organization",
                        active: pathname?.startsWith("/dashboard/organization"),
                      },
                    ].filter(Boolean);

                    return items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleModuleClick}
                        className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                          item.active
                            ? "text-brand-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: item.active
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))",
                          }}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : null;

          // const reportsItem = reportsAccess ? (
          //   <div key="reports-hardcoded" className="w-full">
          //     {collapsed ? (
          //       renderItem(
          //         "Reports",
          //         "/dashboard/reports/AuditTrailReport?tab=audit",
          //         <FileText className="h-4 w-4" />,
          //         handleModuleClick,
          //         pathname?.startsWith("/dashboard/reports") ||
          //           pathname?.startsWith("/dashboard/reports-combined"),
          //       )
          //     ) : (
          //       <div
          //         className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
          //           openReports
          //             ? "bg-muted/60 text-brand-primary"
          //             : "text-muted-foreground hover:text-foreground"
          //         }`}
          //       >
          //         <Link
          //           href="/dashboard/reports/AuditTrailReport?tab=audit"
          //           onClick={handleModuleClick}
          //           className="flex min-w-0 flex-1 items-center gap-3"
          //         >
          //           <span className="text-[16px] w-5 flex items-center justify-center">
          //             <FileText className="h-4 w-4" />
          //           </span>
          //           <span className="flex-1 truncate text-left">Reports</span>
          //         </Link>
          //         <button
          //           type="button"
          //           aria-label="Toggle reports menu"
          //           onClick={(e) => {
          //             e.preventDefault();
          //             e.stopPropagation();
          //             toggleExclusiveMenu("reports");
          //           }}
          //           className="p-1 -mr-1 rounded-md hover:bg-muted/60 transition-colors"
          //         >
          //           <ChevronRight
          //             className={`h-3 w-3 text-muted-foreground transition-transform ${
          //               openReports ? "rotate-90" : ""
          //             }`}
          //           />
          //         </button>
          //       </div>
          //     )}

          //     {!collapsed && openReports && (
          //       <div className="mt-1 pl-6">
          //         <Link
          //           href="/dashboard/reports/AuditTrailReport?tab=audit"
          //           onClick={handleModuleClick}
          //           className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
          //             pathname?.startsWith(
          //               "/dashboard/reports/AuditTrailReport",
          //             )
          //               ? "text-brand-primary"
          //               : "text-muted-foreground hover:text-foreground"
          //           }`}
          //         >
          //           <span
          //             className="h-1.5 w-1.5 rounded-full"
          //             style={{
          //               background: pathname?.startsWith(
          //                 "/dashboard/reports/AuditTrailReport",
          //               )
          //                 ? "hsl(var(--primary))"
          //                 : "hsl(var(--muted-foreground))",
          //             }}
          //           />
          //           <span>Audit</span>
          //         </Link>
          //       </div>
          //     )}
          //   </div>
          // ) : null;
          const reportsItem = reportsAccess
            ? renderItem(
                "Reports",
                "/dashboard/reports/AuditTrailReport?tab=audit",
                <FileText className="h-4 w-4" />,
                handleModuleClick,
                pathname?.startsWith("/dashboard/reports"),
              )
            : null;

          const nameMatch = (m, kw) =>
            String(m?.moduleName || "")
              .toLowerCase()
              .includes(kw);

          const dashboardMods = filteredModules.filter(
            (m) => m.menuSequenceNo === 1 || nameMatch(m, "dashboard"),
          );
          const integrationMods = filteredModules.filter((m) =>
            nameMatch(m, "integration"),
          );
          const interactionMods = filteredModules.filter((m) =>
            nameMatch(m, "interaction"),
          );
          const workflowMods = filteredModules.filter((m) =>
            nameMatch(m, "workflow"),
          );

          const integrationItem =
            integrationMods.length > 0 &&
            (isSuperAdmin || hasIntegrationSourceAccess) ? (
              <div key="integration-hardcoded" className="w-full">
                {collapsed ? (
                  renderItem(
                    HARDCODED_INTEGRATION_MODULE.moduleName,
                    HARDCODED_INTEGRATION_MODULE.redirectPath,
                    HARDCODED_INTEGRATION_MODULE.icon,
                    handleModuleClick,
                    pathname?.startsWith("/dashboard/integrationWorkspace"),
                  )
                ) : (
                  <div
                    className={`group flex items-center gap-3 w-full px-3 py-2 text-[13.5px] font-medium transition-colors ${
                      openIntegration
                        ? "bg-muted/60 text-brand-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link
                      href={HARDCODED_INTEGRATION_MODULE.redirectPath}
                      onClick={handleModuleClick}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="text-[16px] w-5 flex items-center justify-center">
                        {HARDCODED_INTEGRATION_MODULE.icon}
                      </span>
                      <span className="flex-1 truncate text-left">
                        Integration
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Toggle integration menu"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExclusiveMenu("integration");
                      }}
                      className="p-1 -mr-1 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <ChevronRight
                        className={`h-3 w-3 text-muted-foreground transition-transform ${
                          openIntegration ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>
                )}

                {!collapsed && openIntegration && (
                  <div className="mt-1 pl-6">
                    {(integrationFilters.length
                      ? integrationFilters
                      : DEFAULT_SOURCE_FILTERS
                    ).map((label) => {
                      const item = {
                        label,
                        //href: `/dashboard/integrationWorkspace?filter=${encodeURIComponent(label)}`,
                        href:
                          label === "STT"
                            ? `/dashboard/integrationWorkspace/Transcription?filter=${encodeURIComponent(label)}`
                            : `/dashboard/integrationWorkspace?filter=${encodeURIComponent(label)}`,
                      };
                      const currentFilter =
                        typeof window !== "undefined"
                          ? new URLSearchParams(window.location.search).get(
                              "filter",
                            ) || ""
                          : "";
                      const isActive =
                        pathname?.startsWith(
                          "/dashboard/integrationWorkspace",
                        ) && currentFilter === item.label;

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={handleModuleClick}
                          className={`flex items-center gap-2 px-2 py-2 text-[12.5px] transition-colors ${
                            isActive
                              ? "text-brand-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: isActive
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted-foreground))",
                            }}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null;

          const picked = new Set([
            ...dashboardMods,
            ...integrationMods,
            ...interactionMods,
            ...workflowMods,
          ]);
          const otherMods = filteredModules.filter((m) => !picked.has(m));

          const formsMods = otherMods.filter(
            (m) =>
              Number(m?.menuSequenceNo) === 5 ||
              String(m?.moduleName || "")
                .toLowerCase()
                .includes("form designer"),
          );
          const otherNonFormsMods = otherMods.filter(
            (m) => !formsMods.includes(m),
          );

          const ordered = [
            ...dashboardMods,
            ...(managementItem ? [managementItem] : []),
            ...formsMods,
            ...(integrationItem ? [integrationItem] : []),
            ...(workspaceItem ? [workspaceItem] : []),
            ...workflowMods,
            ...interactionMods,
            ...(reportsItem ? [reportsItem] : []),
            ...otherNonFormsMods.filter((m) => !nameMatch(m, "integration")),
          ];

          return ordered.map((item) =>
            item?.moduleName ? renderDynamicModule(item) : item,
          );
        })()}
      </nav>
    </TooltipProvider>
  );
};

export default withAuth(Navbar);
