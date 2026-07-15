// components\topbar.jsx
"use client";
import { Button } from "@/components/ui/button";
import CryptoJS from "crypto-js";
import { User, KeyRound, LogOut, PanelLeft, Building2, LayoutDashboard, Users2, FileText, PhoneCall, ShieldCheck, Moon, Bell, ChevronDown, Clock, FolderOpen, Trash2, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import Navbar from "./navbar";
import ProfileDisplay from "./profile-display";
import ResetPassword from "./reset-password";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import BreadCrumbListWrapper from "./breadcrumb-list";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import withAuth from "@/components/withAuth";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";
import { useBranding } from "@/lib/use-branding";
import { CreateRoleModal } from "@/components/modals/CreateRoleModal";
import { useMsal } from "@azure/msal-react";
const routeMeta = {
  QMagent: {
    title: "Dashboard",
    desc: "Real-time metrics and system overview",
    icon: LayoutDashboard,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
  },
  dashboard1: {
    title: "Dashboard",
    desc: "Real-time metrics and system overview",
    icon: LayoutDashboard,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
  },
  users: {
    title: "User Management",
    desc: "Manage system users and access levels",
    icon: Users2,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
  interactions: {
    title: "Interactions",
    desc: "Track and analyze call records",
    icon: PhoneCall,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-50",
  },
  forms: {
    title: "Form Management",
    desc: "Design and manage evaluation forms",
    icon: FileText,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
  },
  builder: {
    title: "Form Builder",
    desc: "Design and customize forms",
    icon: FileText,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
  },
  agentOrganization: {
    title: "Agent Organization",
    desc: "Manage agent hierarchy and assignments",
    icon: Building2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
  },
  organization: {
    title: "Organization",
    desc: "Manage organization profile and hierarchy",
    icon: Building2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
  },
  roleManagement: {
    title: "Role Management",
    desc: "Configure role privileges and permissions",
    icon: ShieldCheck,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  Management_combined_page: {
    title: "User Management",
    desc: "Manage user directory and credentials",
    icon: Users2,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
  },
};

function formatRemainingTime(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }
  return `Expires in ${minutes}m`;
}

const Topbar = ({ sidebarCollapsed = false }) => {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState("/noavatar.png");
  const [error, setError] = useState(null);
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false); // ✅ NEW
  const [userModeDialogOpen, setUserModeDialogOpen] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [addableItems, setAddableItems] = useState([]);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isEmail, setIsEmail] = useState(true);
  const nameRef = useRef(null);
  const router = useRouter();
  const { accounts, instance } = useMsal();

  // Global Notification States & Callbacks
  const [tick, setTick] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef(null);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(0);
  const [clearedTimestamp, setClearedTimestamp] = useState(0);

  // Live timer interval to update remaining times
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications history from the database API
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const orgIds = getSelectedOrgIdsHeader();
      const res = await fetch("/api/workFlow/getExportHistory", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgIds: orgIds || "",
        },
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setNotifications(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load notifications in topbar:", e);
    }
  }, [userId]);

  // Polling to auto-refresh notifications list
  useEffect(() => {
    if (!userId) return;
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, loadNotifications]);

  // Listen for manual notification update requests from other components
  useEffect(() => {
    const handler = () => {
      loadNotifications();
    };
    window.addEventListener("notifications:update", handler);
    return () => window.removeEventListener("notifications:update", handler);
  }, [loadNotifications]);

  // Load client read/clear timestamps from localStorage on mount
  useEffect(() => {
    try {
      const readStored = localStorage.getItem("acuitycx_last_read_timestamp");
      if (readStored) setLastReadTimestamp(Number(readStored));
      
      const clearStored = localStorage.getItem("acuitycx_notifications_cleared_timestamp");
      if (clearStored) setClearedTimestamp(Number(clearStored));
    } catch (e) {
      console.error("Failed to load notification settings from localStorage:", e);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    const now = Date.now();
    setClearedTimestamp(now);
    try {
      localStorage.setItem("acuitycx_notifications_cleared_timestamp", String(now));
    } catch (e) {
      console.error("Failed to save cleared timestamp:", e);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    const latest = notifications.length > 0 ? notifications[0].timestamp : Date.now();
    setLastReadTimestamp(latest);
    try {
      localStorage.setItem("acuitycx_last_read_timestamp", String(latest));
    } catch (e) {
      console.error("Failed to save last read timestamp:", e);
    }
  }, [notifications]);

  // Click outside notification panel handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleBellClick = useCallback(() => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) {
        loadNotifications();
        markAllNotificationsAsRead();
      }
      return next;
    });
  }, [loadNotifications, markAllNotificationsAsRead]);

  // Filter notifications to show runs where calls were exported or runs that failed
  const visibleNotifications = useMemo(() => {
    const filtered = notifications.filter((item) => (item.copied ?? 0) > 0 || item.status === "FAILED");
    const seen = new Set();
    return filtered.filter((item) => {
      const configId = item.exportConfigId ?? item.exportconfigid ?? item.id;
      if (seen.has(configId)) {
        return false;
      }
      seen.add(configId);
      return true;
    });
  }, [notifications]);

  // Compute unread count based on item.timestamp > lastReadTimestamp
  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((item) => item.timestamp > lastReadTimestamp).length;
  }, [visibleNotifications, lastReadTimestamp]);

  useEffect(() => {
    try {
      const userData = sessionStorage.getItem("user");
      if (userData) {
        const bytes = CryptoJS.AES.decrypt(userData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        setUserEmail(user?.email || "email@email.com");
        setUserRole(user?.userRoles?.[0]?.roleName || user?.userRole || "");
        setUserName(
          user?.userFullName || user?.user_login_id || user?.loginId || "",
        );
        setUserId(user?.userId ?? null);
      }
    } catch (err) {
      console.error("Error accessing sessionStorage:", err);
      setError("Failed to load user data");
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchAddPrivileges = async () => {
      try {
        const orgIds = getSelectedOrgIdsHeader();
        if (!orgIds) return;

        // Module 2 = User Mgmt (priv 2), Module 7 = Role Mgmt (priv 2),
        // Module 8 = Organization (priv 2), Module 5 = Form Designer (priv 10)
        const checks = [
          {
            label: "Create User",
            moduleId: 2,
            privId: 2,
            description: "Add a new user to the system",
          },
          {
            label: "Create Role",
            moduleId: 7,
            privId: 2,
            description: "Define a new role with permissions",
          },
          {
            label: "Create Organization",
            moduleId: 8,
            privId: 2,
            description: "Set up a new organization",
            path: "/dashboard/organization?action=create",
          },
          {
            label: "Create Form",
            moduleId: 5,
            privId: 10,
            description: "Build a new evaluation form",
            path: "/dashboard/forms?action=create",
          },
        ];

        const results = await Promise.all(
          checks.map(({ moduleId }) =>
            fetch(`/api/privileges`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
                loggedInUserId: userId,
                moduleId,
                orgIds,
              },
              cache: "no-store",
            }).then((r) => (r.ok ? r.json() : { privileges: [] })),
          ),
        );

        const allowed = checks.filter(({ privId }, i) =>
          (results[i].privileges || []).some((p) => p.PrivilegeId === privId),
        );

        setAddableItems(allowed);
        setCanAdd(allowed.length > 0);
      } catch (err) {
        console.error("Failed to fetch add privileges:", err);
      }
    };

    fetchAddPrivileges();
  }, [userId]); // runs once userId is known

  useEffect(() => {
    const handlePictureUpdated = (e) => {
      if (e?.detail?.picturePath) {
        setAvatarSrc(e.detail.picturePath);
      }
    };
    window.addEventListener("profile:picture-updated", handlePictureUpdated);
    return () =>
      window.removeEventListener(
        "profile:picture-updated",
        handlePictureUpdated,
      );
  }, []);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!userId) return;
      try {
        const res = await fetch("/api/profileDisplay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ userId }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.data?.profile_picture) {
          setAvatarSrc(data.data.profile_picture);
        }
      } catch (err) {
        console.error("Failed to load profile picture:", err);
      }
    };
    fetchProfilePicture();
  }, [userId]);

  const clearClientSession = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("visibilityRules");
    sessionStorage.removeItem("selectedModuleId");
    sessionStorage.removeItem("scoringRules");
    sessionStorage.removeItem("disabledOptions");
    sessionStorage.removeItem("tempDashboardData");
    sessionStorage.removeItem("selectedTimezone");
    sessionStorage.removeItem("authType");
    document.cookie =
      "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure";
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    try {
      setError(null);
      debugger;
      const encryptedUserData = sessionStorage.getItem("user");
      const authType = sessionStorage.getItem("authType");

      if (authType === 'azureAD') {
        await instance.logoutPopup();
      }
      let userId = null;
      let userLoginId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        userId = decrypted?.userId;
        userLoginId = decrypted?.userFullName;
      }

      clearClientSession();
      debugger;
      if (authType === 'saml') {
        window.location.replace("/api/auth/logout");
        return;
      }

      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          userName: userLoginId,
        },
      });
      if (response.ok) {
        window.location.replace("/");
      } else {
        alert(
          "Logged out locally, but the server could not be reached. Please close this tab or restart the project.",
        );
      }
    } catch (err) {
      console.error("Error during logout:", err);
      clearClientSession();
      alert(
        "Logged out locally, but the server is not running right now. Please close this tab or restart the project.",
      );
    }
  };

  const smallTextStyle = { fontSize: "0.775rem" };

  const fullDisplayName = (userName || userEmail || "").trim();

  const compactDisplayName =
    fullDisplayName.length > 12
      ? `${fullDisplayName.charAt(0)}…`
      : fullDisplayName;

  const handleNameMouseEnter = () => {
    if (fullDisplayName.length > 12) {
      setShowNameTooltip(true);
    }
  };

  const pathnames = pathname?.split("/").filter((x) => x);
  const secondPathname = pathnames?.[1];

  const getHeaderMeta = () => {
    if (!secondPathname) return { title: "", desc: "", icon: null, iconColor: "", iconBg: "" };
    const meta = routeMeta[secondPathname] || {
      title: secondPathname.charAt(0).toUpperCase() + secondPathname.slice(1),
      desc: "",
      icon: null,
      iconColor: "text-slate-500",
      iconBg: "bg-slate-50",
    };

    let title = meta.title;
    let desc = meta.desc;

    if (pathnames.length > 2) {
      const action = pathnames[2];
      if (action === "add" || action === "create") {
        title = `${title} (Create)`;
        desc = `Add new entry for ${meta.title.toLowerCase()}`;
      } else if (!isNaN(Number(action)) || action.length > 10) {
        title = `${title} (Edit)`;
        desc = `Modify existing ${meta.title.toLowerCase()} configurations`;
      } else {
        title = `${title} (${action.charAt(0).toUpperCase() + action.slice(1)})`;
      }
    }
    return { ...meta, title, desc };
  };

  const headerMeta = getHeaderMeta();


  useEffect(() => {
    debugger;
    if (typeof window !== "undefined") {
      let user = null;
      const cookiesList = document.cookie.split(";");
      const userCookieMatch = cookiesList.find(row => row.trim().startsWith("user="));
      if (userCookieMatch) {
        const userCookieValue = userCookieMatch.split("=")[1];
        if (userCookieValue) {
          try {
            user = JSON.parse(decodeURIComponent(userCookieValue));
          } catch (e) {
            console.error("Failed to parse user cookie", e);
          }
        }
      }

      const params = new URLSearchParams(window.location.search);
      const samlEmail = user?.nameID || params.get("samlEmail");

      if (samlEmail) {
        // Clean URL to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("samlEmail");
        window.history.replaceState({}, document.title, url.pathname);

        // Delete the cookie as we are logging in now and will set sessionStorage
        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        setIsEmail(false);
      }
    }
  }, []);


  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 flex-shrink-0">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <Navbar />
          </SheetContent>
        </Sheet>
        <BreadCrumbListWrapper />
        <div className="relative ml-auto flex-1 md:grow-0"></div>

        {/* Right side controls group */}
        <div className="flex items-center gap-3">
          {/* Quick Add Button */}
          {canAdd && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-slate-50 hover:bg-slate-100 shadow-sm text-foreground text-xs font-semibold transition-colors duration-150"
                  title="Add New"
                >
                  <span className="text-base font-bold leading-none">+</span>
                  <span>Add</span>
                </button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] max-w-lg sm:w-full p-6 rounded-2xl">
                <DialogTitle className="text-lg font-semibold mb-5">
                  Quick Actions
                </DialogTitle>

                <div className="grid grid-cols-2 gap-3">
                  {addableItems.map(({ label, description, path }) => {
                    const meta = {
                      "Create User": {
                        icon: (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                          </svg>
                        ),
                        color: "text-violet-500",
                        bg: "bg-violet-100",
                      },
                      "Create Role": {
                        icon: (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17 11c.34 0 .67.03 1 .08V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55A6.95 6.95 0 0 1 17 11zm-6.5 6.74C8.07 16.57 5 12.69 5 11.18V7.4l5.5-2.44L16 7.4v3.73c0 .17-.01.34-.02.51A7 7 0 0 0 10.5 17.74zM17 13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 1.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 5c-.83 0-1.58-.42-2.02-1.05.46-.3 1-.45 2.02-.45s1.55.15 2.02.45A2.49 2.49 0 0 1 17 19.5z" />
                          </svg>
                        ),
                        color: "text-blue-500",
                        bg: "bg-blue-100",
                      },
                      "Create Organization": {
                        icon: (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2L2 7v2h20V7L12 2zm0 2.24L18.77 7H5.23L12 4.24zM4 11v7H2v2h20v-2h-2v-7h-2v7h-3v-7h-2v7H9v-7H7v7H5v-7H4z" />
                          </svg>
                        ),
                        color: "text-emerald-500",
                        bg: "bg-emerald-100",
                      },
                      "Create Form": {
                        icon: (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                          </svg>
                        ),
                        color: "text-amber-500",
                        bg: "bg-amber-100",
                      },
                    };

                    const { icon, color, bg } = meta[label] || {
                      icon: null,
                      color: "text-gray-500",
                      bg: "bg-gray-100",
                    };

                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setAddDialogOpen(false);
                          if (label === "Create User") {
                            setUserModeDialogOpen(true);
                          } else if (label === "Create Role") {
                            setAddRoleDialogOpen(true);
                          } else {
                            router.push(path);
                          }
                        }}
                        className="flex flex-col items-start gap-3 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20 transition-all duration-150 text-left group"
                      >
                        <span className={`p-2 rounded-lg ${bg} ${color}`}>
                          {icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {label.replace("Create ", "New ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          )}
          {/* Global Notification Bell */}
          {userId && (
            <div ref={bellRef} className="relative inline-block mr-1">
              <button
                type="button"
                onClick={handleBellClick}
                className="relative p-2 rounded-lg border border-[var(--brand-input-border)] bg-transparent text-muted-foreground cursor-pointer hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                title="Notifications"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  className="absolute right-0 z-[100] mt-2 w-80 sm:w-96 rounded-xl border border-[var(--brand-input-border)] bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{ top: "100%" }}
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[var(--brand-input-border)] flex items-center justify-between bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
                    <span className="text-xs font-bold text-foreground">Notifications</span>
                    {visibleNotifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clear all logs"
                      >
                        <Trash2 size={11} /> Clear All
                      </button>
                    )}
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--brand-input-border)]">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-6 flex flex-col items-center justify-center text-center text-muted-foreground gap-1.5">
                        <AlertCircle size={20} className="opacity-20" />
                        <p className="m-0 text-xs font-semibold">No recent export logs</p>
                      </div>
                    ) : (
                      visibleNotifications.map((item) => {
                        const isExpired = item.expiresAt - Date.now() <= 0;
                        
                        // Determine status
                        let statusText = "Success";
                        let statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
                        const isGlacierPending = item.errorSummary && (item.errorSummary.includes("GlacierObjectArchived") || item.errorSummary.includes("Glacier"));

                        if (item.failedCount > 0) {
                          if (isGlacierPending) {
                            statusText = "Glacier Pending";
                            statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/30";
                          } else if (item.copied > 0) {
                            statusText = "Partial";
                            statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/30";
                          } else {
                            statusText = "Failed";
                            statusColor = "text-red-500 bg-red-500/10 border-red-500/30";
                          }
                        } else if (item.copied === 0 && item.totalCandidates === 0) {
                          statusText = "Success";
                          statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/30 font-semibold";
                        }

                        return (
                          <div key={item.id} className="p-3.5 flex flex-col gap-2.5 hover:bg-[color-mix(in_srgb,var(--brand-primary)_2%,transparent)] transition-colors">
                            {/* Title & Status */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-foreground truncate" title={item.ruleName}>
                                {item.ruleName}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                                {statusText}
                              </span>
                            </div>

                            {/* Time & Metrics */}
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-muted-foreground/75" />
                                  {new Date(item.timestamp).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span>
                                  {formatRemainingTime(item.expiresAt)}
                                </span>
                              </div>
                              
                              <div className="text-[11px] font-medium text-muted-foreground bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-[var(--brand-input-border)]/50 mt-1 flex justify-around">
                                <div>
                                  Total: <strong className="text-foreground">{item.totalCandidates}</strong>
                                </div>
                                <div className="w-px h-3 bg-muted-foreground/30 self-center" />
                                <div>
                                  Exported: <strong className="text-emerald-500">{item.copied}</strong>
                                </div>
                                {item.failedCount > 0 && (
                                  <>
                                    <div className="w-px h-3 bg-muted-foreground/30 self-center" />
                                    <div>
                                      Failed: <strong className={isGlacierPending ? "text-amber-500" : "text-red-500"}>{item.failedCount}</strong>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center mt-1 w-full">
                              {!isExpired ? (
                                item.folderLink && (
                                  <a
                                    href={item.folderLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground bg-transparent border border-[var(--brand-input-border)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors cursor-pointer"
                                  >
                                    <FolderOpen size={12} />
                                    Browse Folder
                                  </a>
                                )
                              ) : (
                                <div className="w-full text-center text-[10px] font-semibold text-red-400/80 bg-red-500/5 py-1 rounded border border-red-500/10">
                                  Links Expired (Security Limit: {item.expiryHours || 24}h)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Custom page-specific actions portal */}
          <div id="topbar-actions-portal" className="flex items-center gap-2" />

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-slate-200" />

          {/* Profile Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 focus:outline-none group"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c2340] text-white transition-all shadow-sm hover:opacity-90 overflow-hidden">
                  {avatarSrc && avatarSrc !== "/noavatar.png" ? (
                    <Image
                      src={avatarSrc}
                      width={36}
                      height={36}
                      alt="Avatar"
                      className="h-9 w-9 rounded-xl object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </div>

                <div className="hidden md:flex flex-col items-start leading-none text-left">
                  <span
                    ref={nameRef}
                    className="max-w-[100px] truncate text-xs font-semibold text-slate-800"
                    onMouseEnter={handleNameMouseEnter}
                    onMouseLeave={() => setShowNameTooltip(false)}
                  >
                    {compactDisplayName}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase tracking-tight">
                    {userRole || "User"}
                  </span>
                </div>

                <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />

                {showNameTooltip && (
                  <span className="absolute right-0 -top-9 z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-xl pointer-events-none">
                    {fullDisplayName}
                    <span
                      className="absolute right-3 top-full w-0 h-0"
                      style={{
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderTop: `5px solid hsl(var(--foreground))`,
                      }}
                    />
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 p-2 rounded-xl shadow-lg border bg-white"
            >
              {/* Profile */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => setProfileOpen(true), 100);
                }}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition hover:bg-gray-100 hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)]"
              >
                <User className="h-4 w-4 text-gray-500 group-hover:text-[var(--brand-primary)]" />
                <span>Profile</span>
              </DropdownMenuItem>

              {/* Reset Password */}
              {userRole !== "Super Admin" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    setTimeout(() => setResetPasswordOpen(true), 100);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition hover:bg-gray-100 hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)]"
                >
                  <KeyRound className="h-4 w-4 text-gray-500 group-hover:text-[var(--brand-primary)]" />
                  <span>Reset Password</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-2" />

              {/* Logout */}
              <DropdownMenuItem
                onSelect={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer text-red-500 hover:bg-gray-100 hover:text-blue-900 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/*Reset Password Modal — OUTSIDE DropdownMenu */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogTitle>Reset Password</DialogTitle>
          <ResetPassword />
        </DialogContent>
      </Dialog>

      {/* ✅ Profile Modal — OUTSIDE DropdownMenu */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="w-[92vw] max-w-2xl sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="text-xl font-semibold mb-4">
            Profile
          </DialogTitle>
          <ProfileDisplay />
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={userModeDialogOpen} onOpenChange={setUserModeDialogOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogTitle className="text-lg font-semibold mb-4">
            Create User
          </DialogTitle>

          <div className="grid gap-3">
            {/* Single User */}
            <button
              onClick={() => {
                setUserModeDialogOpen(false);
                router.push("/dashboard/users/add?mode=single");
              }}
              className="flex items-start gap-3 p-4 rounded-xl border hover:bg-muted transition text-left"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-500">👤</div>
              <div>
                <p className="text-sm font-semibold">Single User</p>
                <p className="text-xs text-muted-foreground">
                  Add one user manually
                </p>
              </div>
            </button>

            {/* Bulk Upload */}
            <button
              onClick={() => {
                setUserModeDialogOpen(false);
                router.push("/dashboard/users/add?mode=bulk");
              }}
              className="flex items-start gap-3 p-4 rounded-xl border hover:bg-muted transition text-left"
            >
              <div className="p-2 rounded-lg bg-green-100 text-green-500">
                📤
              </div>
              <div>
                <p className="text-sm font-semibold">Bulk Upload</p>
                <p className="text-xs text-muted-foreground">
                  Upload users via Excel/CSV
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ✅ Create Role Modal */}
      {addRoleDialogOpen && (
        <CreateRoleModal
          onClose={() => setAddRoleDialogOpen(false)}
          onCreated={() => { }}
          basePath="/dashboard/roleManagement"
        />
      )}
      {error && <div className="error-message">{error}</div>}
    </header>
  );
};

export default withAuth(Topbar);
