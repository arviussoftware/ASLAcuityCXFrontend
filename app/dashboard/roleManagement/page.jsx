"use client";
import { Suspense, useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import withAuth from "@/components/withAuth";
import Link from "next/link";
import { useNonce } from "@/components/NonceProvider";
import { notFound, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HiMiniInformationCircle } from "react-icons/hi2";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  KeySquare,
  Search,
  UserCog,
} from "lucide-react";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }

/* ────────────────────────────────────────────
   BUTTON SYSTEM  —  exact brand colors
   text:    var(--brand-primary)
   primary: var(--brand-primary)  /  border: var(--brand-primary)
   hover:   var(--brand-secondary)
──────────────────────────────────────────── */

/* Primary filled — modal Create / Save / Go to Users */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 16px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  color: #ffffff;
  background: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(1,41,155,.28);
  transition: background .14s ease, border-color .14s ease,
              box-shadow .14s ease, transform .1s ease;
}
.btn-primary:hover:not(:disabled) {
  background: var(--brand-secondary);
  border-color: var(--brand-secondary);
  box-shadow: 0 4px 10px rgba(44,45,63,.32);
  transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(1,41,155,.2);
}
.btn-primary:disabled { opacity: .42; cursor: not-allowed; }

/* Ghost / outlined — Cancel, Dismiss */
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 16px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  color: #374151;
  background: #ffffff;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease, color .14s ease;
}
.btn-ghost:hover:not(:disabled) {
  background: #F3F4F6;
  border-color: #9CA3AF;
  color: #111827;
}
.btn-ghost:active:not(:disabled) { background: #E5E7EB; }
.btn-ghost:disabled { opacity: .42; cursor: not-allowed; }

/* Header "New Role" — slightly taller, more prominent */
.btn-new-role {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px;
  font-size: 12px; font-weight: 600; white-space: nowrap;
  color: #ffffff;
  background: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 5px rgba(1,41,155,.30);
  transition: background .14s ease, border-color .14s ease,
              box-shadow .14s ease, transform .1s ease;
}
.btn-new-role:hover {
  background: var(--brand-secondary);
  border-color: var(--brand-secondary);
  box-shadow: 0 4px 12px rgba(44,45,63,.34);
  transform: translateY(-1px);
}
.btn-new-role:active { transform: translateY(0); }

/* Row action buttons (Privileges / Edit / Delete) */
.btn-row {
  display: inline-flex; align-items: center; gap: 5px;
  height: 27px; padding: 0 10px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  border-radius: 6px;
  cursor: pointer;
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.btn-row-blue {
  color: var(--brand-primary);
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
}
.btn-row-red {
  color: #DC2626;
  background: #FEF2F2;
  border: 1px solid #FECACA;
}
.btn-row:disabled { opacity: .4; cursor: not-allowed; }

/* Loading spinner inside button */
.btn-spinner {
  width: 12px; height: 12px;
  border: 1.5px solid rgba(255,255,255,.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: btnSpin .65s linear infinite;
}
@keyframes btnSpin { to { transform: rotate(360deg); } }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function decryptUser() {
  try {
    const enc = sessionStorage.getItem("user");
    if (!enc) return {};
    const user = JSON.parse(
      CryptoJS.AES.decrypt(enc, "").toString(CryptoJS.enc.Utf8),
    );
    return {
      userId: user?.userId || null,
      userName: user?.userFullName || null,
      isSuperAdmin: false,
    };
  } catch {
    return {};
  }
}

async function fetchMe() {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
}

// ── Row action button ─────────────────────────────────────────────────────────
function RowBtn({
  onClick,
  label,
  icon: Icon,
  danger = false,
  href,
  disabled,
}) {
  const cls = `btn-row ${danger ? "btn-row-red" : "btn-row-blue"}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        <Icon style={{ width: 12, height: 12 }} />
        {label}
      </Link>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cls}
      aria-label={label}
    >
      <Icon style={{ width: 12, height: 12 }} />
      {label}
    </button>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 bg-gray-100 rounded" />
            <div className="h-2 w-16 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="h-2.5 w-48 bg-gray-100 rounded" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-2.5 w-24 bg-gray-100 rounded" />
      </td>
    </tr>
  );
}

// ── Create Role Modal ─────────────────────────────────────────────────────────
function CreateRoleModal({ onClose, onCreated, basePath }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Role name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { userId, userName } = decryptUser();
      const res = await fetch("/api/roleManagement/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          newRole: name,
          Description: desc,
          userId,
          userName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onCreated?.();
        onClose();
        router.push(
          `${basePath}/${data.newRole.user_role_id}?roleName=${encodeURIComponent(name.trim())}`,
        );
      } else {
        alert(`Failed to add role: ${data.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-800">Create New Role</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {`You'll be redirected to the privileges page after creation`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md
                     text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Role Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))
              }
              placeholder="e.g. Operations Lead"
              maxLength={20}
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
            />
            <p className="text-[10px] text-gray-300 mt-1">
              {name.length}/20 characters
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Access scope, team, or responsibility"
              maxLength={100}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="btn-primary"
          >
            {saving ? (
              <>
                <span className="btn-spinner" />
                Creating…
              </>
            ) : (
              <>
                <Plus style={{ width: 13, height: 13 }} />
                Create Role
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Single role row ───────────────────────────────────────────────────────────
function RoleRow({ role, canEdit, canDelete, canManagePrivileges, onRefresh }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteErr, setShowDeleteErr] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [editName, setEditName] = useState(role.user_role);
  const [editDesc, setEditDesc] = useState(role.Description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const roleName = role?.user_role || role?.user_role_name || "Unknown Role";

  const initials = roleName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to Delete role "${role.user_role}"?`))
      return;
    setDeleting(true);
    try {
      const { userId, userName } = decryptUser();
      const res = await fetch(
        `/api/roleManagement/delete/${role.user_role_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ userId, userName, roleName: role.user_role }),
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Role "${role.user_role}" deleted successfully.`); // ✅ ADD THIS
        onRefresh?.();
      } else if (data.statusCode === 403) {
        setDeleteMsg(data.message);
        setShowDeleteErr(true);
      } else alert(data.message || "Failed to delete role.");
    } catch {
      alert("An unexpected error occurred.");
    }
    setDeleting(false);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim()) {
      alert("Role name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const { userId, userName } = decryptUser();
      const res = await fetch(`/api/roleManagement/edit/${role.user_role_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        body: JSON.stringify({
          user_role: editName,
          Description: editDesc,
          ModifiedBy: userId,
          userName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowEdit(false);
        onRefresh?.();
      } else alert(data.message || "Failed to update role.");
    } catch {
      alert("An unexpected error occurred.");
    }
    setSaving(false);
  };

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0">
        {/* Role name + avatar */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100
                            flex items-center justify-center"
            >
              <span className="text-[10px] font-semibold text-slate-600 tracking-wide">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold text-gray-900 truncate"
                title={role.user_role}
              >
                {role.user_role}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                ID #{role.user_role_id}
              </p>
            </div>
          </div>
        </td>

        {/* Description */}
        <td className="px-5 py-3.5 max-w-xs">
          <p
            className="text-xs text-gray-500 truncate"
            title={role.Description}
          >
            {role.Description ? (
              role.Description
            ) : (
              <span className="text-gray-300 italic">No description</span>
            )}
          </p>
        </td>
        {/* Actions — fade in on hover */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            {canManagePrivileges && (
              <RowBtn
                href={`/dashboard/roleManagement/${role.user_role_id}?roleName=${encodeURIComponent(role.user_role)}`}
                label="Privileges"
                icon={KeySquare}
              />
            )}
            {canEdit && (
              <RowBtn
                onClick={() => {
                  setEditName(role.user_role);
                  setEditDesc(role.Description || "");
                  setShowEdit(true);
                }}
                label="Edit"
                icon={Pencil}
              />
            )}
            {canDelete && (
              <RowBtn
                onClick={handleDelete}
                label="Delete"
                icon={Trash2}
                danger
                disabled={deleting}
              />
            )}
          </div>
        </td>
      </tr>

      {/* ── Edit Modal ── */}
      {showEdit && (
        <Modal onClose={() => setShowEdit(false)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Edit Role</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Update name or description
              </p>
            </div>
            <button
              onClick={() => setShowEdit(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md
                         text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Role Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) =>
                  setEditName(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))
                }
                maxLength={20}
                placeholder="Role name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
              />
              <p className="text-[10px] text-gray-300 mt-1">
                {editName.length}/20
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={100}
                placeholder="Short description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
              />
            </div>
          </div>
          <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={() => setShowEdit(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete error Modal ── */}
      {showDeleteErr && (
        <Modal onClose={() => setShowDeleteErr(false)}>
          <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Cannot delete role
              </p>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-xs">
                {deleteMsg}
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 flex justify-center gap-2">
            <button
              onClick={() => setShowDeleteErr(false)}
              className="btn-ghost"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setShowDeleteErr(false);
                router.push("/dashboard/users");
              }}
              className="btn-primary"
            >
              Go to Users
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Role table ────────────────────────────────────────────────────────────────
function RoleTable({
  roleSubmitted,
  isSuperAdmin,
  canEdit,
  canDelete,
  canManagePrivileges,
  searchQuery,
}) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { userId } = decryptUser();
      const me = await fetchMe();
      const superAdmin = !!me?.isSuperAdmin;
      const superAdminRoleId = me?.superAdminRoleId ?? null;
      const res = await fetch("/api/roleManagement", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        const incoming = data.roles || [];
        setRoles(
          superAdmin || !superAdminRoleId
            ? incoming
            : incoming.filter(
                (r) => Number(r.roleId) !== Number(superAdminRoleId),
              ),
        );
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleSubmitted]);

  const query = (searchQuery || "").trim().toLowerCase();
  const filtered = roles.filter(
    (r) =>
      !query ||
      (r.user_role || "").toLowerCase().includes(query) ||
      (r.Description || "").toLowerCase().includes(query),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/70">
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-56">
              Role
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Description
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-44">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [1, 2, 3, 4].map((n) => <SkeletonRow key={n} />)
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserCog className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">
                    {query ? `No roles match "${searchQuery}"` : "No roles yet"}
                  </p>
                  {!query && (
                    <p className="text-[11px] text-gray-400">
                      {`Click "New Role" above to create your first role.`}
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((role) => (
              <RoleRow
                key={role.user_role_id}
                role={role}
                canEdit={canEdit}
                canDelete={canDelete}
                canManagePrivileges={canManagePrivileges}
                onRefresh={load}
              />
            ))
          )}
        </tbody>
      </table>

      {!loading && filtered.length > 0 && (
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400">
            {filtered.length} role{filtered.length !== 1 ? "s" : ""}
            {query ? ` matching "${searchQuery}"` : " total"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function RolesPage({ basePath = "/dashboard/roleManagement" }) {
  const nonce = useNonce();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleSubmitted, setRoleSubmitted] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const has = (id) => privileges.some((p) => p.PrivilegeId === id);

  useEffect(() => {
    (async () => {
      try {
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        const { userId } = decryptUser();
        const me = await fetchMe();
        setIsSuperAdmin(!!me?.isSuperAdmin);
        const res = await fetch("/api/moduleswithPrivileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 7,
            orgIds: getSelectedOrgIdsHeader(),
          },
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) setPrivileges(data.PrivilegeList || []);
      } catch (err) {
        console.error("Failed to load modules with privileges:", err);
      }
      setPrivilegesLoaded(true);
    })();
  }, []);

  if (!privilegesLoaded)
    return (
      <>
        <style
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: FONT_IMPORT }}
        />
        <div className="flex items-center gap-2.5 py-10 justify-center">
          <div className="w-4 h-4 border-[1.5px] border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Checking access…</span>
        </div>
      </>
    );

  if (!has(1)) return notFound();

  const canCreate = has(2);
  const canEdit = has(3);
  const canDelete = has(5);
  const canManagePrivileges = has(12);

  return (
    <>
      <style nonce={nonce} dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />

      <div className="space-y-4">
        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* ── SHIELD ICON BOX ── */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#EFF6FF" }}
            >
              <Shield
                className="w-4 h-4"
                style={{ color: "var(--brand-primary)" }}
              />
            </div>

            <div>
              <h1 className="text-sm font-semibold text-gray-900">
                Role Management
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Create roles and assign module-level privileges per organization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles…"
                className="h-[34px] w-44 pl-7 pr-3 text-xs border border-gray-200 rounded-lg
                           bg-white focus:outline-none focus:border-blue-400 transition-colors
                           placeholder-gray-300"
              />
            </div>

            {/* ── NEW ROLE BUTTON ── */}
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-new-role"
              >
                <Plus style={{ width: 14, height: 14 }} />
                New Role
              </button>
            )}
            <button
              onClick={() => setHelpOpen(true)}
              className="ml-auto text-muted-foreground hover:text-primary"
              title="Information"
            >
              <HiMiniInformationCircle className="h-7 w-7 cursor-pointer text-blue-500 hover:text-blue-600" />
            </button>
          </div>
        </div>

        {/* ── TABLE CARD ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">All Roles</p>
          </div>

          <Suspense
            fallback={
              <table className="w-full">
                <tbody>
                  {[1, 2, 3].map((n) => (
                    <SkeletonRow key={n} />
                  ))}
                </tbody>
              </table>
            }
          >
            <RoleTable
              roleSubmitted={roleSubmitted}
              isSuperAdmin={isSuperAdmin}
              canEdit={canEdit}
              canDelete={canDelete}
              canManagePrivileges={canManagePrivileges}
              searchQuery={searchQuery}
            />
          </Suspense>
        </div>
      </div>

      {/* ── CREATE ROLE MODAL ── */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setRoleSubmitted((n) => n + 1)}
          basePath={basePath}
        />
      )}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          className="max-w-lg max-h-[80vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogTitle className="text-sm font-semibold">
            Role Management — How it works
          </DialogTitle>

          <div className="text-xs text-muted-foreground space-y-4 mt-2 leading-relaxed">
            {/* Section 1 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                📋 Roles List
              </p>
              <p>
                All roles are displayed here in{" "}
                <strong>alphabetical order</strong>. You can use the{" "}
                <strong>search bar</strong> at the top to quickly find any role
                by its name or description.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                ➕ Creating a New Role
              </p>
              <p>
                Click the <strong>&quot;New Role&quot;</strong> button to open
                the creation form. You will need to fill in:
              </p>
              <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                <li>
                  <strong>Role Name</strong> — required, up to 20 characters.
                </li>
                <li>
                  <strong>Description</strong> — optional, briefly describe the
                  role&apos;s purpose or scope.
                </li>
              </ul>
              <p className="mt-1.5">
                Once saved, you will be{" "}
                <strong>automatically redirected</strong> to the Privileges page
                for that newly created role to begin setting it up.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                🏢 Mapping an Organization
              </p>
              <p>
                On the Privileges page, you must first{" "}
                <strong>select an Organization</strong>
                to map to the role. This determines which organization&apos;s
                modules and privileges you are configuring for this role.
              </p>
              <p className="mt-1.5">
                Once an organization is selected, all available{" "}
                <strong>modules</strong> for that organization will appear
                below.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                🔐 Assigning Privileges
              </p>
              <p>
                For each module, you can select the specific{" "}
                <strong>privileges</strong>
                (e.g. View, Create, Edit, Delete) you want to grant to this
                role.
              </p>
              <p className="mt-1.5">
                When setting up a <strong>new role for the first time</strong>,
                no privileges are selected by default — you start from a clean
                slate and assign only what is needed. Once done, click{" "}
                <strong>&quot;Save Changes&quot;</strong> to apply.
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                ✏️ Viewing or Editing Existing Privileges
              </p>
              <p>
                For any existing role in the list, click the{" "}
                <strong>&quot;Privileges&quot;</strong> button in its row. On
                the Privileges page:
              </p>
              <ul className="mt-1.5 space-y-1 pl-3 list-disc">
                <li>
                  Select an <strong>Organization</strong> to view what
                  privileges that role currently has for it.
                </li>
                <li>
                  You can <strong>modify</strong> existing privileges — add or
                  remove as needed — and save.
                </li>
                <li>
                  You can also <strong>map a new Organization </strong> to the
                  role and assign fresh privileges for it.
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div>
              <p className="text-gray-700 font-semibold text-[11px] uppercase tracking-wide mb-1">
                🗑️ Deleting a Role
              </p>
              <p>
                A role can only be deleted if it is{" "}
                <strong>not assigned to any active user</strong>. If users are
                still mapped to the role, you will need to reassign or remove
                those users first before deletion is allowed.
              </p>
              <p className="mt-1.5">
                Additionally, the <strong>Delete button</strong> is only visible
                if you have been <strong>granted the Delete privilege</strong>{" "}
                for Role Management — if you do not see it, contact your
                administrator to request access.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withAuth(RolesPage);
