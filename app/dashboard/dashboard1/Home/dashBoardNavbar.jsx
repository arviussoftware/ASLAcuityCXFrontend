  "use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";

// Constants
const MODULE_ID_DASHBOARD = 1;

const PRIVILEGES = {
  USER_MANAGEMENT: 21,
  FORMS: 22,
  INTERACTIONS: 23,
};

export default function DashboardHeader() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "Users";

  const [allowedTabs, setAllowedTabs] = useState([]);

  useEffect(() => {
    const getAllowedTabs = () => {
      try {
        const encrypted = sessionStorage.getItem("privileges");
        if (!encrypted) return;

        const bytes = CryptoJS.AES.decrypt(encrypted, ""); // Add secret if needed
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const parsed = JSON.parse(decrypted);

        const hasPrivilege = (privId) =>
          parsed.some(
            (p) =>
              p.ModuleId === MODULE_ID_DASHBOARD &&
              p.PrivilegeId === privId
          );

        const allowed = [];

        if (hasPrivilege(PRIVILEGES.USER_MANAGEMENT)) {
          allowed.push({ key: "Users", label: "User Management" });
        }

        if (hasPrivilege(PRIVILEGES.FORMS)) {
          allowed.push({ key: "forms", label: "Forms" });
        }

        if (hasPrivilege(PRIVILEGES.INTERACTIONS)) {
          allowed.push({ key: "interactions", label: "Interactions" });
        }

        setAllowedTabs(allowed);
      } catch (err) {
        console.error("Error reading privileges", err);
        setAllowedTabs([]);
      }
    };

    getAllowedTabs();
  }, []);

  return (
    <nav className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gradient-to-r from-card/90 via-background/70 to-card/90 backdrop-blur border-b border-border">
      {allowedTabs.map(({ key, label }) => {
        const isActive = tab === key;
        return (
          <Link
            key={key}
            href={`/dashboard/dashboard1?tab=${key}`}
            aria-current={isActive ? "page" : undefined}
            className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200
              ${isActive
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

