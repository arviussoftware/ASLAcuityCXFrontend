"use client";

import React, { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import withAuth from "@/components/withAuth";
import { notFound, useRouter } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

/* ─────────────────────────────────────────────
   DESIGN: "Refined Administrative" — same system as RolesPage + RoleModulesPage
   - bg: #F8F9FA, panels: white + 1px #E5E7EB border
   - Accent: slate-900 only
   - Font: DM Sans
   - Tabs: full-width underline bar inside white card
   - Loading: skeleton bar, not plain text
   - Tab icons: lucide-react, small + subtle
───────────────────────────────────────────── */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }
`;

// ── Privilege fetcher ─────────────────────────────────────────────────────────
const fetchPrivilegesForModule = async (moduleId) => {
  let userId = null;
  try {
    const enc = sessionStorage.getItem("user");
    if (enc) {
      const bytes = CryptoJS.AES.decrypt(enc, "");
      const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      userId = user?.userId ?? null;
    }
  } catch { /* silent */ }

  const res = await fetch("/api/privileges", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      loggedInUserId: userId,
      moduleId,
      orgId: sessionStorage.getItem("selectedOrgId") || "",
      orgIds: getSelectedOrgIdsHeader(),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch privileges for module ${moduleId}`);
  const data = await res.json();
  return data.privileges || [];
};

// Tabs removed: this page now redirects to the first allowed management section.

// ── Main page ─────────────────────────────────────────────────────────────────
function ManagementPage() {
  const [privLoaded, setPrivLoaded] = useState(false);
  const [access, setAccess] = useState({ users: false, org: false, roles: false });

  const router = useRouter();

  // ── Load all three module privileges in parallel ──────────────────────────
  useEffect(() => {
    (async () => {
      sessionStorage.removeItem("interactionDateRange");
      sessionStorage.removeItem("selectedCallStatus");
      try {
        const [u, o, r] = await Promise.all([
          fetchPrivilegesForModule(2),
          fetchPrivilegesForModule(8),
          fetchPrivilegesForModule(7),
        ]);
        setAccess({
          users: u.some((p) => p.PrivilegeId === 1),
          org:   o.some((p) => p.PrivilegeId === 1),
          roles: r.some((p) => p.PrivilegeId === 1),
        });
      } catch (err) {
        console.error("Error loading privileges:", err);
      } finally {
        setPrivLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!privLoaded) return;
    if (access.users) { router.replace("/dashboard/users"); return; }
    if (access.org) { router.replace("/dashboard/organization"); return; }
    if (access.roles) { router.replace("/dashboard/roleManagement"); return; }
  }, [privLoaded, access, router]);

  // ── No access at all ──────────────────────────────────────────────────────
  if (privLoaded && !access.users && !access.org && !access.roles) {
    return notFound();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-500">
          Redirecting to your management section...
        </div>
      </div>
    </>
  );
}

export default withAuth(ManagementPage);
