// components/modals/CreateRoleModal.jsx

// components/modals/CreateRoleModal.jsx
"use client";
import { useState, useEffect } from "react"; // ✅ add useEffect
import { createPortal } from "react-dom"; // ✅ add createPortal
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import CryptoJS from "crypto-js";

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
    };
  } catch {
    return {};
  }
}

// ── Modal shell ──
function Modal({ children, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md mx-4">
        {children}
      </div>
    </div>,
    document.body, // ✅ renders outside all stacking contexts
  );
}

export function CreateRoleModal({
  onClose,
  onCreated,
  basePath = "/dashboard/roleManagement",
}) {
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
        router.push(`${basePath}/${data.newRole.user_role_id}?roleName=${encodeURIComponent(name.trim())}`);
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
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition-colors placeholder-gray-300"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center h-[34px] px-4 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 h-[34px] px-4 text-xs font-semibold rounded-lg text-white disabled:opacity-40"
            style={{ background: "var(--brand-primary)" }}
          >
            {saving ? (
              <span className="text-xs">Creating…</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Role
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
