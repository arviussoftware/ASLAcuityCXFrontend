"use client";
import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import NotFound from "@/components/NotFound";
import { useNonce } from "@/components/NonceProvider";
import {
  ChevronLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Building2,
  Save,
} from "lucide-react";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEW_PRIVILEGE_ID = 1;
const NONE_PRIVILEGE_ID = 11;
const DASHBOARD_MODULE_ID = 1;
const AGENT_DASHBOARD_PRIV_ID = 24;
const ANNOTATION_PARENT_ID = 28;
const ANNOTATION_SUB_IDS = [32, 33, 34, 35];
const ANNOTATION_PRIV = { CREATE: 32, VIEW: 33, EDIT: 34, DELETE: 35 };
const INTERACTION_MODULE_ID = 6;
const ACTION_PRIV_IDS = [
  ANNOTATION_PRIV.CREATE,
  ANNOTATION_PRIV.EDIT,
  ANNOTATION_PRIV.DELETE,
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const isIntegrationModule = (name = "") =>
  String(name).toLowerCase().includes("integration");
const getPrivilegeId = (p) =>
  Number(p?.PrivilegeId ?? p?.privilegeId ?? p?.id ?? p?.ID);
const getPrivilegeName = (p) =>
  p?.PrivilegeName ??
  p?.privilegeName ??
  p?.privilegename ??
  p?.privilege_name ??
  p?.privilege_label ??
  p?.label ??
  p?.name ??
  p?.Name ??
  p?.title ??
  "";

const getDefaultPrivilegeIds = (moduleId, privileges = []) =>
  privileges
    .map(getPrivilegeId)
    .filter(
      (id) =>
        id !== NONE_PRIVILEGE_ID &&
        !(
          Number(moduleId) === DASHBOARD_MODULE_ID &&
          id === AGENT_DASHBOARD_PRIV_ID
        ),
    );

const buildPrivilegeSelectionState = (
  moduleId,
  privileges = [],
  selectedIds = [],
) => {
  const sel = new Set(selectedIds.map(Number));
  const noneOn = sel.has(NONE_PRIVILEGE_ID);
  const actionSaved = ACTION_PRIV_IDS.some((id) => sel.has(id));
  const subSaved = ANNOTATION_SUB_IDS.some((id) => sel.has(id));
  return privileges.map((p) => ({
    ...p,
    PrivilegeId: getPrivilegeId(p),
    PrivilegeName: getPrivilegeName(p),
    selected:
      sel.has(getPrivilegeId(p)) ||
      (getPrivilegeId(p) === ANNOTATION_PARENT_ID && subSaved) ||
      (getPrivilegeId(p) === ANNOTATION_PRIV.VIEW && actionSaved),
    disabled:
      (noneOn && getPrivilegeId(p) !== NONE_PRIVILEGE_ID) ||
      (getPrivilegeId(p) === ANNOTATION_PRIV.VIEW && actionSaved),
  }));
};

const hasNonNoneSelected = (privileges = []) =>
  privileges.some((p) => getPrivilegeId(p) !== NONE_PRIVILEGE_ID && p.selected);

const selectAllSources = (sources = []) =>
  sources.map((s) => ({ ...s, selected: true }));

const collectDescendantIds = (node) => {
  if (!node) return [];
  return [
    String(node.id),
    ...(node.children || []).flatMap((c) => collectDescendantIds(c)),
  ];
};

const collectAllIds = (nodes = []) =>
  nodes.flatMap((n) => [String(n.id), ...collectAllIds(n.children || [])]);

const findName = (nodes, id) => {
  for (const n of nodes || []) {
    if (String(n.id) === String(id)) return n.label;
    const hit = findName(n.children, id);
    if (hit) return hit;
  }
  return "";
};

const findNode = (nodes, id) => {
  for (const n of nodes || []) {
    if (String(n.id) === String(id)) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
*, *::before, *::after { font-family: 'DM Sans', sans-serif; }
.btn-primary {
  display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 16px;
  font-size:11.5px;font-weight:600;white-space:nowrap;color:#fff;
  background:var(--brand-primary);border:none;border-radius:8px;cursor:pointer;
  box-shadow:0 1px 4px rgba(1,41,155,.25);
  transition:background .14s ease,box-shadow .14s ease,transform .1s ease;
}
.btn-primary:hover:not(:disabled){background:var(--brand-secondary);box-shadow:0 4px 10px rgba(44,45,63,.28);transform:translateY(-1px);}
.btn-primary:active:not(:disabled){transform:translateY(0);box-shadow:0 1px 3px rgba(1,41,155,.18);}
.btn-primary:disabled{opacity:.42;cursor:not-allowed;}
.btn-ghost {
  display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;
  font-size:11.5px;font-weight:600;white-space:nowrap;color:#374151;
  background:#fff;border:1px solid #D1D5DB;border-radius:8px;cursor:pointer;
  transition:background .14s,border-color .14s,color .14s;
}
.btn-ghost:hover:not(:disabled){background:#F3F4F6;border-color:#9CA3AF;color:#111827;}
.btn-ghost:active:not(:disabled){background:#E5E7EB;}
.btn-ghost:disabled{opacity:.42;cursor:not-allowed;}
.btn-spinner{width:12px;height:12px;border:1.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .65s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
*{scrollbar-width:thin;scrollbar-color:rgba(107,114,128,.35) transparent;}
*::-webkit-scrollbar{height:8px;width:8px;}
*::-webkit-scrollbar-thumb{background:rgba(107,114,128,.35);border-radius:999px;}
*::-webkit-scrollbar-track{background:transparent;}
`;

function PrivilegeChip({ label, selected, disabled, onChange }) {
  return (
    <label
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all duration-150 select-none ${disabled ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"}`}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
        checked={selected}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

function ModuleToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? "var(--brand-primary)" : "#E5E7EB" }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

function OrgNode({ node, depth, selectedOrgIds, onToggle, onActivate }) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = selectedOrgIds.includes(String(node.id));
  const hasChildren = (node.children || []).length > 0;
  const label =
    node.label || node.name || node.OrgName || node.Name || "Untitled";
  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={`flex-shrink-0 w-5 h-6 flex items-center justify-center rounded transition-colors duration-100 ${hasChildren ? "text-gray-400 hover:text-gray-600" : "cursor-default text-transparent"}`}
        >
          {hasChildren &&
            (open ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            ))}
        </button>
        <label className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
            checked={isSelected}
            onChange={() => onToggle(node.id)}
          />
          <button
            type="button"
            onClick={() => onActivate(node.id)}
            className={`flex-1 min-w-0 text-left text-xs whitespace-nowrap px-2 py-1.5 rounded-md transition-colors duration-100 ${isSelected ? "text-[var(--brand-primary)] font-semibold" : "text-gray-700 hover:text-[var(--brand-primary)]"}`}
          >
            {label}
          </button>
        </label>
      </div>
      {hasChildren && open && (
        <ul className="mt-0.5 ml-5 pl-2.5 border-l border-gray-100 space-y-0.5">
          {node.children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedOrgIds={selectedOrgIds}
              onToggle={onToggle}
              onActivate={onActivate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      {title && (
        <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>
      )}
      <p className="text-[11px] text-gray-400 max-w-[180px] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="relative flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{
              border: "2.5px solid #E2E8F0",
              borderTopColor: "var(--brand-primary)",
            }}
          />
          <div className="absolute w-12 h-12 rounded-full border border-[var(--brand-primary)]/20 animate-ping opacity-75" />
        </div>
        <span className="text-xs font-semibold text-gray-600 tracking-tight">
          Checking access...
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoleModulesPage({ params }) {
  const nonce = useNonce();
  const resolvedParams = use(params);
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const roleName = searchParams.get("roleName");

  // ── FIX 1: Derive roleId reliably — useParams() can be null on first render
  // in Next.js App Router. We also accept params prop as fallback (passed by
  // the server component wrapper). Store in a ref so callbacks always read the
  // latest value without needing to be in every dep array.
  const resolvedRoleId = useMemo(() => {
    const INVALID = ["", "undefined", "null", "0"];
    const directId = routeParams?.id || resolvedParams?.id;
    if (directId && !INVALID.includes(String(directId)))
      return String(directId);
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1] || "";
      if (!INVALID.includes(last)) return last;
    }
    return "";
  }, [routeParams?.id, resolvedParams?.id]);

  // Keep a ref so async callbacks always read the current value
  const roleIdRef = useRef(resolvedRoleId);
  useEffect(() => {
    roleIdRef.current = resolvedRoleId;
  }, [resolvedRoleId]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [orgTree, setOrgTree] = useState([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState([]);
  const [selectedOrgNames, setSelectedOrgNames] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [showOrgOverflow, setShowOrgOverflow] = useState(false);
  const [modules, setModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState({});
  const [modulePrivileges, setModulePrivileges] = useState({});
  const [moduleSourceAccess, setModuleSourceAccess] = useState({});
  const [collapsedModules, setCollapsedModules] = useState({});
  const [persistedOrgIds, setPersistedOrgIds] = useState([]);
  const [initialOrgLoading, setInitialOrgLoading] = useState(false);
  const [moduleDataLoading, setModuleDataLoading] = useState(false);
  const [orgSelectionResolved, setOrgSelectionResolved] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── FIX 2: Keep a ref for persistedOrgIds so loadBundle closure never goes stale
  const persistedOrgIdsRef = useRef([]);
  useEffect(() => {
    persistedOrgIdsRef.current = persistedOrgIds;
  }, [persistedOrgIds]);

  // useRef to track if preload already triggered — avoids double calls on StrictMode
  const preloadTriggered = useRef(false);

  // ── Bootstrap: access check + org tree in parallel ─────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");

        const [meRes, treeRes] = await Promise.all([
          fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/organization/root", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            },
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (!meRes.ok) {
          setHasAccess(false);
          router.replace("/not-found");
          return;
        }
        const me = await meRes.json();
        const userRole = me?.userId ?? null;
        const superAdmin = !!me?.isSuperAdmin;

        // Read from ref — guaranteed fresh even if state hasn't settled yet
        if (!superAdmin && Number(roleIdRef.current) === 1) {
          router.replace("/not-found");
          return;
        }

        const privRes = await fetch("/api/moduleswithPrivileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userRole,
            moduleId: 7,
            orgIds: getSelectedOrgIdsHeader(),
          },
          credentials: "include",
          cache: "no-store",
        });
        const privData = await privRes.json();
        const ok =
          privRes.ok &&
          (privData.PrivilegeList || []).some(
            (p) => Number(p.PrivilegeId ?? p.privilegeId) === 12,
          );
        setHasAccess(ok);
        if (!ok) {
          router.replace("/not-found");
          return;
        }

        if (treeRes.ok) {
          const treeData = await treeRes.json();
          const normalize = (node) => ({
            id:
              node.id ??
              node.ID ??
              node.orgId ??
              node.OrgId ??
              node.organizationId,
            label:
              node.Name ||
              node.name ||
              node.OrgName ||
              node.orgName ||
              node.OrganizationName ||
              node.organizationName ||
              node.label ||
              "Untitled",
            children: (node.children || []).map(normalize),
          });
          const roots = Array.isArray(treeData.organizations)
            ? treeData.organizations.map(normalize)
            : [];
          setOrgTree(roots);
        }
      } catch {
        setHasAccess(false);
        router.replace("/not-found");
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bundle loader ──────────────────────────────────────────────────────────
  // FIX 3: Read roleId and persistedOrgIds from refs — no stale closures,
  // no need to list them in dep array. This is the core fix for the blank
  // modules/privileges bug on new role creation.
  const loadBundle = useCallback(async (orgId, knownPersistedIds = []) => {
    const roleId = roleIdRef.current;

    // Guard: never fire with an empty role id
    if (!roleId || !orgId) return;

    setModuleDataLoading(true);
    try {
      const res = await fetch(`/api/roleManagement/roleOrgBundle/${roleId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgId: String(orgId),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) return;
      const bundle = await res.json();
      if (!bundle?.success || !Array.isArray(bundle?.modulePayloads)) return;

      setModules(bundle.modules || []);

      // FIX 4: Merge current persisted ids (from ref) with freshly-passed ones
      // so we never rely on stale state from a closure
      const allPersistedIds = [
        ...new Set([...persistedOrgIdsRef.current, ...knownPersistedIds]),
      ];
      const isPersistedOrg = allPersistedIds.includes(String(orgId));

      const nextModules = {};
      const nextPrivileges = {};
      const nextSources = {};

      bundle.modulePayloads.forEach((p) => {
        const moduleId = Number(p.moduleId);
        const moduleName = p.moduleName || "";
        const savedIds = (p.savedPrivilegeIds || []).map(Number);
        const defaults = getDefaultPrivilegeIds(moduleId, p.privileges || []);

        // New org (not persisted) → apply defaults so toggles come pre-filled
        // Persisted org → use saved values even if empty (intentionally disabled)
        const effectiveIds =
          savedIds.length === 0 && !isPersistedOrg ? defaults : savedIds;
        const hasSaved = effectiveIds.some((id) => id !== NONE_PRIVILEGE_ID);

        nextModules[moduleId] = { checked: hasSaved, name: moduleName };
        nextPrivileges[moduleId] = buildPrivilegeSelectionState(
          moduleId,
          p.privileges || [],
          effectiveIds,
        );

        if (isIntegrationModule(moduleName)) {
          const savedSet = new Set((p.savedSourceIds || []).map(Number));
          nextSources[moduleId] = {
            loading: false,
            sources: (p.sources || []).map((s) => {
              const sid = Number(s.id ?? s.SourceId ?? s.sourceId);
              return {
                id: sid,
                label:
                  s.source || s.Source || s.Name || s.label || `Source ${sid}`,
                selected: savedSet.has(sid),
              };
            }),
          };
        }
      });

      setSelectedModules(nextModules);
      setModulePrivileges(nextPrivileges);
      setModuleSourceAccess(nextSources);
    } catch (err) {
      console.error("Failed to load roleOrgBundle:", err);
    } finally {
      setModuleDataLoading(false);
    }
  }, []); // no deps — reads everything from refs

  // ── Pre-load saved orgs once tree is ready ─────────────────────────────────
  useEffect(() => {
    if (
      !resolvedRoleId ||
      orgTree.length === 0 ||
      orgSelectionResolved ||
      selectedOrgIds.length > 0 ||
      preloadTriggered.current
    )
      return;

    preloadTriggered.current = true;

    const preload = async () => {
      setInitialOrgLoading(true);
      try {
        const res = await fetch(
          `/api/roleManagement/savedOrgs/${resolvedRoleId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            },
            credentials: "include",
            cache: "no-store",
          },
        );

        if (res.ok) {
          const data = await res.json();
          const treeIdSet = new Set(collectAllIds(orgTree));
          const detectedOrgIds = (data.orgIds || [])
            .map(String)
            .filter((id) => treeIdSet.has(id));

          if (detectedOrgIds.length > 0) {
            // Update ref immediately so loadBundle closure sees the right value
            persistedOrgIdsRef.current = detectedOrgIds;
            setPersistedOrgIds(detectedOrgIds);
            setSelectedOrgIds(detectedOrgIds);
            setActiveOrgId(detectedOrgIds[0]);
            await loadBundle(detectedOrgIds[0], detectedOrgIds);
          }
        }
      } catch (err) {
        console.error("Failed to preload saved orgs:", err);
      } finally {
        setOrgSelectionResolved(true);
        setInitialOrgLoading(false);
      }
    };

    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgTree, resolvedRoleId]);

  // ── Sync active org when selectedOrgIds changes ────────────────────────────
  useEffect(() => {
    if (selectedOrgIds.length === 0) {
      setActiveOrgId("");
      return;
    }
    if (!activeOrgId || !selectedOrgIds.includes(activeOrgId))
      setActiveOrgId(selectedOrgIds[selectedOrgIds.length - 1]);
  }, [selectedOrgIds, activeOrgId]);

  // ── Sync org names ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgTree.length) return;
    setSelectedOrgNames(
      selectedOrgIds.map((id) => findName(orgTree, id)).filter(Boolean),
    );
  }, [selectedOrgIds, orgTree]);

  // ── Org toggle ─────────────────────────────────────────────────────────────
  const handleOrgToggle = useCallback(
    (orgId) => {
      const id = String(orgId);
      const node = findNode(orgTree, id);
      const family = collectDescendantIds(node);

      setSelectedOrgIds((prev) => {
        const removing = prev.includes(id);
        const next = removing
          ? prev.filter((x) => !family.includes(x))
          : [...new Set([...prev, ...family])];
        const nextActive = next.includes(id) ? id : next[next.length - 1] || "";

        setActiveOrgId(nextActive);
        setSelectedModules({});
        setModulePrivileges({});
        setModuleSourceAccess({});
        setCollapsedModules({});

        if (nextActive) {
          // Pass next as knownPersistedIds — for new roles this is fine (empty
          // persistedOrgIdsRef means defaults get applied, which is correct)
          loadBundle(nextActive, persistedOrgIdsRef.current);
        }

        return next;
      });
    },
    [orgTree, loadBundle],
  );

  // ── Org activate (click on label) ──────────────────────────────────────────
  const handleOrgActivate = useCallback(
    (orgId) => {
      const id = String(orgId);
      if (!selectedOrgIds.includes(id)) {
        handleOrgToggle(id);
        return;
      }
      setActiveOrgId(id);
      setSelectedModules({});
      setModulePrivileges({});
      setModuleSourceAccess({});
      setCollapsedModules({});
      loadBundle(id, persistedOrgIdsRef.current);
    },
    [selectedOrgIds, handleOrgToggle, loadBundle],
  );

  // ── Module toggle ──────────────────────────────────────────────────────────
  const handleCheckboxChange = useCallback(
    async (moduleId, moduleName) => {
      try {
        const isChecked = !selectedModules[moduleId]?.checked;
        setSelectedModules((prev) => ({
          ...prev,
          [moduleId]: { checked: isChecked, name: moduleName },
        }));
        if (!isChecked) return;

        const current = modulePrivileges[moduleId] || [];
        if (!current.length) {
          const roleId = roleIdRef.current;
          if (!roleId) return;
          const res = await fetch(
            `/api/roleManagement/savedPrivileges/${roleId}/${moduleId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
                orgId: activeOrgId || "",
              },
              credentials: "include",
              cache: "no-store",
            },
          );
          const data = await res.json();
          if (!res.ok) return;
          const ids = (data.savedPrivileges || []).map((p) =>
            getPrivilegeId(p),
          );
          const defaults = getDefaultPrivilegeIds(
            moduleId,
            data.privileges || [],
          );
          const effective = ids.length === 0 ? defaults : ids;
          setModulePrivileges((prev) => ({
            ...prev,
            [moduleId]: buildPrivilegeSelectionState(
              moduleId,
              data.privileges,
              effective,
            ),
          }));
          return;
        }

        if (hasNonNoneSelected(current)) return;

        const defaults = getDefaultPrivilegeIds(moduleId, current);
        setModulePrivileges((prev) => ({
          ...prev,
          [moduleId]: buildPrivilegeSelectionState(
            moduleId,
            prev[moduleId] || [],
            defaults,
          ),
        }));

        if (isIntegrationModule(moduleName)) {
          setModuleSourceAccess((prev) => {
            const sources = prev[moduleId]?.sources || [];
            if (!sources.length) return prev;
            return {
              ...prev,
              [moduleId]: {
                loading: false,
                sources: selectAllSources(sources),
              },
            };
          });
        }
      } catch (err) {
        console.error("Failed to handle module checkbox change:", err);
      }
    },
    [selectedModules, modulePrivileges, activeOrgId],
  );

  // ── Privilege toggle ───────────────────────────────────────────────────────
  const handlePrivilegeChange = useCallback((moduleId, privilegeId) => {
    setModulePrivileges((prev) => {
      const current = prev[moduleId] || [];
      const isNone = privilegeId === NONE_PRIVILEGE_ID;

      let updated = current.map((p) => {
        if (isNone) {
          return getPrivilegeId(p) === NONE_PRIVILEGE_ID
            ? { ...p, selected: !p.selected }
            : { ...p, selected: false };
        }
        if (getPrivilegeId(p) === NONE_PRIVILEGE_ID && p.selected)
          return { ...p, selected: false };
        if (getPrivilegeId(p) === privilegeId)
          return { ...p, selected: !p.selected };
        return p;
      });

      if (Number(moduleId) === INTERACTION_MODULE_ID) {
        if (privilegeId === ANNOTATION_PARENT_ID) {
          const parentOn =
            updated.find((p) => getPrivilegeId(p) === ANNOTATION_PARENT_ID)
              ?.selected ?? false;
          updated = updated.map((p) =>
            ANNOTATION_SUB_IDS.includes(getPrivilegeId(p))
              ? { ...p, selected: parentOn }
              : p,
          );
        }
        if (ACTION_PRIV_IDS.includes(privilegeId)) {
          const nowOn =
            updated.find((p) => getPrivilegeId(p) === privilegeId)?.selected ??
            false;
          if (nowOn)
            updated = updated.map((p) =>
              getPrivilegeId(p) === ANNOTATION_PRIV.VIEW
                ? { ...p, selected: true }
                : p,
            );
        }
        const anyAction = updated.some(
          (p) => ACTION_PRIV_IDS.includes(getPrivilegeId(p)) && p.selected,
        );
        if (privilegeId === ANNOTATION_PRIV.VIEW && anyAction)
          updated = updated.map((p) =>
            getPrivilegeId(p) === ANNOTATION_PRIV.VIEW
              ? { ...p, selected: true }
              : p,
          );
        updated = updated.map((p) =>
          getPrivilegeId(p) === ANNOTATION_PRIV.VIEW
            ? { ...p, disabled: anyAction }
            : p,
        );
        if (ANNOTATION_SUB_IDS.includes(privilegeId)) {
          const anySub = updated.some(
            (p) => ANNOTATION_SUB_IDS.includes(getPrivilegeId(p)) && p.selected,
          );
          if (!anySub)
            updated = updated.map((p) =>
              getPrivilegeId(p) === ANNOTATION_PARENT_ID
                ? { ...p, selected: false }
                : p,
            );
        }
      }

      const noneOn =
        updated.find((p) => getPrivilegeId(p) === NONE_PRIVILEGE_ID)
          ?.selected ?? false;
      updated = updated.map((p) => ({
        ...p,
        disabled: getPrivilegeId(p) !== NONE_PRIVILEGE_ID && noneOn,
      }));

      return { ...prev, [moduleId]: updated };
    });

    if (privilegeId === NONE_PRIVILEGE_ID) {
      setModuleSourceAccess((prev) => ({
        ...prev,
        [moduleId]: {
          loading: false,
          sources: (prev[moduleId]?.sources || []).map((s) => ({
            ...s,
            selected: false,
          })),
        },
      }));
    }
  }, []);

  // ── Source toggle ──────────────────────────────────────────────────────────
  const handleSourceToggle = useCallback((moduleId, sourceId) => {
    setModuleSourceAccess((prev) => {
      const next = (prev[moduleId]?.sources || []).map((s) =>
        Number(s.id) === Number(sourceId) ? { ...s, selected: !s.selected } : s,
      );
      const anySelected = next.some((s) => s.selected);
      setModulePrivileges((pp) => ({
        ...pp,
        [moduleId]: (pp[moduleId] || []).map((p) => {
          if (getPrivilegeId(p) === NONE_PRIVILEGE_ID)
            return { ...p, selected: false, disabled: false };
          if (getPrivilegeId(p) === VIEW_PRIVILEGE_ID)
            return anySelected
              ? { ...p, selected: true, disabled: false }
              : { ...p, disabled: false };
          return { ...p, disabled: false };
        }),
      }));
      return { ...prev, [moduleId]: { loading: false, sources: next } };
    });
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const roleId = roleIdRef.current;
    if (!roleId) {
      alert("Role ID is missing. Please refresh and try again.");
      return;
    }

    const orgIds = selectedOrgIds.filter(Boolean);
    if (!orgIds.length) {
      alert("Please select at least one organization.");
      return;
    }

    const checkedIds = Object.keys(selectedModules).filter(
      (id) => selectedModules[id].checked,
    );
    const uncheckedIds = Object.keys(selectedModules).filter(
      (id) => !selectedModules[id].checked,
    );

    let userId = null,
      userName = null;
    try {
      const meRes = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = await meRes.json();
        userId = me?.userId ?? null;
        userName = me?.userFullName ?? null;
      }
    } catch {
      /* ignore */
    }

    const privByOrg = {};
    const sourceByOrg = {};
    let hasAny = false;

    for (const moduleId of checkedIds) {
      const privs = (modulePrivileges[moduleId] || []).filter(
        (p) => p.selected,
      );
      const modName = selectedModules[moduleId]?.name || "";
      const isInteg = isIntegrationModule(modName);
      const noneOn = privs.some((p) => getPrivilegeId(p) === NONE_PRIVILEGE_ID);
      const selSources = (moduleSourceAccess[moduleId]?.sources || []).filter(
        (s) => s.selected,
      );

      if (
        parseInt(moduleId) === 5 &&
        privs.some((p) => getPrivilegeId(p) === 16) &&
        !privs.some((p) => getPrivilegeId(p) === 10)
      ) {
        alert(
          'Please select "Create/Edit" privilege for module Form Designer.',
        );
        return;
      }
      if (parseInt(moduleId) === INTERACTION_MODULE_ID) {
        const parentOn = privs.some(
          (p) => getPrivilegeId(p) === ANNOTATION_PARENT_ID,
        );
        const subOn = privs.some((p) =>
          ANNOTATION_SUB_IDS.includes(getPrivilegeId(p)),
        );
        if (parentOn && !subOn) {
          alert("Please select at least one Annotation permission.");
          return;
        }
      }
      if (!privs.length) {
        alert(`Select at least one privilege for: ${modName}`);
        return;
      }
      if (isInteg && !noneOn && !selSources.length) {
        alert(`Select at least one source for: ${modName}`);
        return;
      }

      orgIds.forEach((orgId) => {
        privByOrg[orgId] = privByOrg[orgId] || [];
        sourceByOrg[orgId] = sourceByOrg[orgId] || [];
        privs.forEach((p) => {
          privByOrg[orgId].push({
            roleid: roleId,
            moduleId,
            privilegeId: getPrivilegeId(p),
            orgId,
            userId,
          });
          hasAny = true;
        });
        if (isInteg && !noneOn)
          selSources.forEach((s) =>
            sourceByOrg[orgId].push({
              roleid: roleId,
              moduleId,
              sourceId: s.id,
              orgId,
              userId,
            }),
          );
      });
    }

    if (!hasAny) {
      alert("Select privileges before saving.");
      return;
    }

    setSaving(true);
    try {
      for (const orgId of orgIds) {
        const res = await fetch("/api/roleManagement/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          credentials: "include",
          body: JSON.stringify({
            privilegesToSave: privByOrg[orgId] || [],
            sourceAccessToSave: sourceByOrg[orgId] || [],
            uncheckedModuleIds: uncheckedIds,
            roleid: roleId,
            roleName,
            userId,
            userName,
            orgId,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          alert(`Failed for org ${orgId}: ${result.message}`);
          setSaving(false);
          return;
        }
      }
      alert("Privileges saved successfully.");
      window.location.href = "/dashboard/roleManagement";
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  // ── Derived / memoised values ──────────────────────────────────────────────
  const filteredOrgTree = useMemo(() => {
    if (!orgSearch.trim()) return orgTree;
    const q = orgSearch.trim().toLowerCase();
    const filter = (node) => {
      const children = (node.children || []).map(filter).filter(Boolean);
      return (node.label || "").toLowerCase().includes(q) || children.length
        ? { ...node, children }
        : null;
    };
    return orgTree.map(filter).filter(Boolean);
  }, [orgTree, orgSearch]);

  const orgCount = useMemo(() => {
    const count = (nodes) =>
      (nodes || []).reduce((acc, n) => acc + 1 + count(n.children || []), 0);
    return count(orgTree);
  }, [orgTree]);

  const selectedOrgOptions = selectedOrgIds
    .map((id) => ({ id, label: findName(orgTree, id) || id }))
    .filter((o) => o.label);
  const visibleOrgOptions = selectedOrgOptions.slice(0, 2);
  const hiddenOrgOptions = selectedOrgOptions.slice(2);
  const noOrgSelected = selectedOrgIds.length === 0;
  const showModules = !noOrgSelected && modules.length > 0;
  const noModules =
    !noOrgSelected && modules.length === 0 && !moduleDataLoading;
  const showInitialLoader = initialOrgLoading && selectedOrgIds.length === 0;
  const showOverlay = initialOrgLoading || moduleDataLoading;
  const displayOrgLabel =
    selectedOrgNames.length > 1
      ? `${selectedOrgNames.length} organizations`
      : selectedOrgNames[0] || "";
  const overlayTitle = moduleDataLoading
    ? "Loading modules and privileges"
    : !roleName
      ? "Preparing role privileges"
      : "Loading privileges";
  const overlayMessage = moduleDataLoading
    ? "Please wait while we load modules and privileges for the selected organization."
    : !roleName
      ? "Please wait while we load organizations and their default privileges."
      : "Please wait while we load organizations and saved privilege selections.";

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (hasAccess === null) return <Spinner />;
  if (hasAccess === false) return null;
  if (notFound)
    return (
      <NotFound
        message="The role you are trying to assign privileges to does not exist."
        redirectUrl="/dashboard/roleManagement"
        redirectText="Go Back"
      />
    );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style nonce={nonce} dangerouslySetInnerHTML={{ __html: FONT_IMPORT }} />
      <div className="min-h-screen bg-[#F8F9FA]">
        {/* TOP BAR */}
        <header className="relative z-0 bg-transparent">
          <div className="max-w-screen-xl mx-auto px-6 pt-2 pb-2">
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard/roleManagement")}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0 leading-none">
                    <Shield className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 relative -top-[1px]" />
                    <h1 className="text-sm font-semibold text-gray-900 truncate">
                      Role Privileges
                    </h1>
                    {roleName && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50">
                        Role: {roleName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {selectedOrgOptions.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">
                      {selectedOrgOptions.length} org
                      {selectedOrgOptions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedModules({});
                      setModulePrivileges({});
                      setModuleSourceAccess({});
                    }}
                    className="btn-ghost"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <span className="btn-spinner" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="max-w-screen-xl mx-auto px-6 py-3">
          <div className="relative">
            <div
              className={`grid grid-cols-[280px_1fr] gap-4 items-stretch transition-all duration-150 ${showOverlay ? "pointer-events-none select-none" : ""}`}
              style={{ filter: showOverlay ? "blur(2px)" : "none" }}
            >
              {/* LEFT SIDEBAR */}
              <aside
                className="bg-white border border-gray-200 rounded-2xl overflow-visible sticky top-[48px] flex flex-col shadow-sm"
                style={{ height: "calc(100vh - 120px)" }}
              >
                <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building2
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--brand-primary)" }}
                      />
                      <span className="text-xs font-semibold text-gray-700">
                        Organizations
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "#F3F4F6",
                        color: "var(--brand-primary)",
                      }}
                    >
                      {orgCount}
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder="Search organizations…"
                      className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Selected org pills */}
                {selectedOrgOptions.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                        Active ({selectedOrgOptions.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedOrgIds([]);
                          setSelectedOrgNames([]);
                          setActiveOrgId("");
                          setSelectedModules({});
                          setModulePrivileges({});
                          setModuleSourceAccess({});
                          setCollapsedModules({});
                        }}
                        className="text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap items-start gap-1">
                      {visibleOrgOptions.map((org) => {
                        const isActive = String(activeOrgId) === String(org.id);
                        return (
                          <div
                            key={org.id}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                              checked
                              onChange={() => handleOrgToggle(org.id)}
                            />
                            <button
                              type="button"
                              onClick={() => handleOrgActivate(org.id)}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                              style={
                                isActive
                                  ? {
                                      background: "var(--brand-primary)",
                                      borderColor: "var(--brand-primary)",
                                      color: "#fff",
                                    }
                                  : {
                                      background: "#fff",
                                      borderColor: "#D1D5DB",
                                      color: "var(--brand-primary)",
                                    }
                              }
                              onMouseEnter={(e) => {
                                if (!isActive)
                                  e.currentTarget.style.borderColor =
                                    "var(--brand-primary)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive)
                                  e.currentTarget.style.borderColor = "#D1D5DB";
                              }}
                            >
                              {org.label}
                            </button>
                          </div>
                        );
                      })}
                      {hiddenOrgOptions.length > 0 && (
                        <div
                          className="relative basis-full"
                          onMouseEnter={() => setShowOrgOverflow(true)}
                          onMouseLeave={() => setShowOrgOverflow(false)}
                        >
                          <button
                            type="button"
                            onClick={() => setShowOrgOverflow((v) => !v)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-dashed border-gray-300 bg-white text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all"
                          >
                            +{hiddenOrgOptions.length} more
                          </button>
                          {showOrgOverflow && (
                            <div className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                              <div className="max-h-48 overflow-auto pr-1 space-y-1">
                                {hiddenOrgOptions.map((org) => {
                                  const isActive =
                                    String(activeOrgId) === String(org.id);
                                  return (
                                    <div
                                      key={org.id}
                                      className="flex items-center gap-1.5"
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                                        checked
                                        onChange={() => handleOrgToggle(org.id)}
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOrgActivate(org.id)
                                        }
                                        className={`min-w-0 truncate text-[10px] font-semibold px-2 py-1 rounded-full border transition-all ${isActive ? "text-white" : "bg-white text-[var(--brand-primary)] border-gray-300 hover:border-[var(--brand-primary)]"}`}
                                        style={
                                          isActive
                                            ? {
                                                background:
                                                  "var(--brand-primary)",
                                                borderColor:
                                                  "var(--brand-primary)",
                                              }
                                            : undefined
                                        }
                                        title={org.label}
                                      >
                                        {org.label}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Org tree */}
                <div className="flex-1 overflow-auto overflow-x-auto px-3 py-3">
                  {filteredOrgTree.length > 0 ? (
                    <ul className="space-y-1">
                      {filteredOrgTree.map((node) => (
                        <OrgNode
                          key={node.id}
                          node={node}
                          depth={0}
                          selectedOrgIds={selectedOrgIds}
                          onToggle={handleOrgToggle}
                          onActivate={handleOrgActivate}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-400 py-6 text-center">
                      No results for &quot;{orgSearch}&quot;
                    </p>
                  )}
                </div>
              </aside>

              {/* RIGHT PANEL */}
              <section className="min-w-0">
                <div
                  className="bg-transparent flex flex-col gap-3"
                  style={{ height: "calc(100vh - 120px)" }}
                >
                  {/* Context header */}
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {showInitialLoader
                          ? "Loading organizations"
                          : noOrgSelected
                            ? "No organization selected"
                            : displayOrgLabel}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {showInitialLoader
                          ? "Checking existing privilege mappings for this role"
                          : noOrgSelected
                            ? "Pick an organization from the sidebar to begin"
                            : `${modules.length} module${modules.length !== 1 ? "s" : ""} available · Role: ${roleName || "—"}`}
                      </p>
                    </div>
                  </div>

                  {selectedOrgOptions.length > 1 && (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <p className="text-[11px] text-amber-700">
                        Changes apply to all {selectedOrgOptions.length}{" "}
                        selected organizations simultaneously.
                      </p>
                    </div>
                  )}

                  {/* Modules list */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0">
                    <div className="overflow-auto h-full">
                      {showInitialLoader && (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                          <div className="relative flex items-center justify-center mb-4">
                            <div
                              className="w-8 h-8 rounded-full animate-spin"
                              style={{
                                border: "2.5px solid #E5E7EB",
                                borderTopColor: "var(--brand-primary)",
                              }}
                            />
                            <div className="absolute w-12 h-12 rounded-full border border-[var(--brand-primary)]/20 animate-ping opacity-75" />
                          </div>
                          <p className="text-xs font-bold text-gray-800 tracking-tight">
                            Loading organizations
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1.5 max-w-[240px] leading-relaxed">
                            Checking which organizations already have saved
                            privileges for this role.
                          </p>
                        </div>
                      )}
                      {noOrgSelected && !showInitialLoader && (
                        <EmptyState
                          icon={Building2}
                          title="Select an organization"
                          message="Choose one or more organizations from the sidebar to load role privileges."
                        />
                      )}
                      {noModules && (
                        <EmptyState
                          icon={Shield}
                          title="No modules found"
                          message="No modules are configured for this role."
                        />
                      )}

                      {showModules && (
                        <ul className="divide-y divide-gray-100">
                          {modules.map((module) => {
                            const isChecked =
                              !!selectedModules[module.ID]?.checked;
                            const isCollapsed = !!collapsedModules[module.ID];
                            const privileges =
                              modulePrivileges[module.ID] || [];
                            const sourceState = moduleSourceAccess[
                              module.ID
                            ] || { loading: false, sources: [] };
                            const countable = privileges.filter(
                              (p) => getPrivilegeId(p) !== ANNOTATION_PARENT_ID,
                            );
                            const selCount = countable.filter(
                              (p) => p.selected,
                            ).length;
                            const srcCount = (sourceState.sources || []).filter(
                              (s) => s.selected,
                            ).length;

                            return (
                              <li key={module.ID}>
                                <div
                                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${isChecked ? "bg-white" : "bg-white hover:bg-gray-50/50"}`}
                                >
                                  <ModuleToggle
                                    checked={isChecked}
                                    onChange={() =>
                                      handleCheckboxChange(
                                        module.ID,
                                        module.ModuleName,
                                      )
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate transition-colors ${isChecked ? "text-gray-900" : "text-gray-400"}`}
                                    >
                                      {module.ModuleName}
                                    </p>
                                    {isChecked && privileges.length > 0 && (
                                      <p
                                        className="text-[10px] mt-0.5"
                                        style={{
                                          color: "var(--brand-primary)",
                                        }}
                                      >
                                        {selCount} of {countable.length}{" "}
                                        privilege
                                        {countable.length !== 1 ? "s" : ""}{" "}
                                        enabled
                                      </p>
                                    )}
                                    {isChecked &&
                                      isIntegrationModule(
                                        module.ModuleName,
                                      ) && (
                                        <p className="text-[10px] mt-0.5 text-gray-500">
                                          {srcCount} source
                                          {srcCount !== 1 ? "s" : ""} selected
                                        </p>
                                      )}
                                  </div>
                                  {isChecked && privileges.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCollapsedModules((prev) => ({
                                          ...prev,
                                          [module.ID]: !prev[module.ID],
                                        }))
                                      }
                                      className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-all"
                                      style={{
                                        color: "var(--brand-primary)",
                                        background: "#F3F4F6",
                                        borderColor: "#F3F4F6",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                          "#E5E7EB";
                                        e.currentTarget.style.borderColor =
                                          "#D1D5DB";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                          "#F3F4F6";
                                        e.currentTarget.style.borderColor =
                                          "#F3F4F6";
                                      }}
                                    >
                                      {isCollapsed ? "Show" : "Hide"}
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}
                                      />
                                    </button>
                                  )}
                                </div>

                                {isChecked &&
                                  !isCollapsed &&
                                  (privileges.length > 0 ||
                                    isIntegrationModule(module.ModuleName)) && (
                                    <div className="px-5 pb-4 pt-3 bg-gray-50/60 border-t border-gray-100">
                                      {privileges.length > 0 &&
                                        (() => {
                                          const mainPrivs = privileges.filter(
                                            (p) =>
                                              !ANNOTATION_SUB_IDS.includes(
                                                getPrivilegeId(p),
                                              ),
                                          );
                                          const subPrivs = privileges.filter(
                                            (p) =>
                                              ANNOTATION_SUB_IDS.includes(
                                                getPrivilegeId(p),
                                              ),
                                          );
                                          const annParent = privileges.find(
                                            (p) =>
                                              getPrivilegeId(p) ===
                                              ANNOTATION_PARENT_ID,
                                          );
                                          const showAnnotation =
                                            Number(module.ID) ===
                                              INTERACTION_MODULE_ID &&
                                            subPrivs.length > 0;
                                          return (
                                            <>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {mainPrivs.map((priv) => (
                                                  <PrivilegeChip
                                                    key={getPrivilegeId(priv)}
                                                    label={
                                                      getPrivilegeName(priv) ||
                                                      priv.privilege ||
                                                      priv.Privilege ||
                                                      priv.label ||
                                                      priv.title ||
                                                      ""
                                                    }
                                                    selected={priv.selected}
                                                    disabled={priv.disabled}
                                                    onChange={() =>
                                                      handlePrivilegeChange(
                                                        module.ID,
                                                        getPrivilegeId(priv),
                                                      )
                                                    }
                                                  />
                                                ))}
                                              </div>
                                              {/* Annotation Permissions — hidden (feature disabled in UI) */}
                                              {false && showAnnotation && (
                                                <div
                                                  className={`mt-3 rounded-xl border bg-white overflow-hidden transition-opacity duration-150 ${annParent?.selected ? "border-[var(--brand-primary)]/20 opacity-100" : "border-gray-200 opacity-40 pointer-events-none"}`}
                                                >
                                                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)]/5 border-b border-[var(--brand-primary)]/10">
                                                    <span
                                                      className="text-[10px] font-semibold uppercase tracking-wider"
                                                      style={{
                                                        color:
                                                          "var(--brand-primary)",
                                                      }}
                                                    >
                                                      Annotation Permissions
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3">
                                                    {subPrivs.map((priv) => (
                                                      <PrivilegeChip
                                                        key={getPrivilegeId(
                                                          priv,
                                                        )}
                                                        label={
                                                          getPrivilegeName(
                                                            priv,
                                                          ) ||
                                                          priv.privilege ||
                                                          priv.Privilege ||
                                                          priv.label ||
                                                          priv.title ||
                                                          ""
                                                        }
                                                        selected={priv.selected}
                                                        disabled={
                                                          priv.disabled ||
                                                          !annParent?.selected
                                                        }
                                                        onChange={() =>
                                                          handlePrivilegeChange(
                                                            module.ID,
                                                            getPrivilegeId(
                                                              priv,
                                                            ),
                                                          )
                                                        }
                                                      />
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}

                                      {isIntegrationModule(
                                        module.ModuleName,
                                      ) && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                            Sources
                                          </p>
                                          {sourceState.loading ? (
                                            <p className="text-[11px] text-gray-400">
                                              Loading sources...
                                            </p>
                                          ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                              {sourceState.sources.map(
                                                (source) => {
                                                  const noneOn = (
                                                    modulePrivileges[
                                                      module.ID
                                                    ] || []
                                                  ).find(
                                                    (p) =>
                                                      getPrivilegeId(p) ===
                                                      NONE_PRIVILEGE_ID,
                                                  )?.selected;
                                                  return (
                                                    <PrivilegeChip
                                                      key={source.id}
                                                      label={source.label}
                                                      selected={source.selected}
                                                      disabled={!!noneOn}
                                                      onChange={() =>
                                                        handleSourceToggle(
                                                          module.ID,
                                                          source.id,
                                                        )
                                                      }
                                                    />
                                                  );
                                                },
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Loading overlay */}
            {showOverlay && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-900/5 backdrop-blur-[3px] transition-all duration-300">
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/45 bg-white/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur-md max-w-sm text-center">
                  <div className="relative flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full animate-spin"
                      style={{
                        border: "2.5px solid #E2E8F0",
                        borderTopColor: "var(--brand-primary)",
                      }}
                    />
                    <div className="absolute w-12 h-12 rounded-full border border-[var(--brand-primary)]/20 animate-ping opacity-75" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-gray-800 tracking-tight">
                      {overlayTitle}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                      {overlayMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
