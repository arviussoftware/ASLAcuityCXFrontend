const DASHBOARD_MODULE_ID = 1;
const DASHBOARD_TAB_BY_PRIVILEGE = [
  { privilegeId: 23, moduleId: 6, path: "/dashboard/dashboard1?tab=interactions" },
  { privilegeId: 22, moduleId: 5, path: "/dashboard/dashboard1?tab=forms" },
  { privilegeId: 21, moduleId: 2, path: "/dashboard/dashboard1?tab=Users" },
];

const LEGACY_COMBINED_ROUTES = new Set([
  "/dashboard/Management_combined_page",
  "dashboard/Management_combined_page",
]);

export const MODULE_TAB_ROUTE_BY_ID = {
  2: "/dashboard/dashboard1?tab=Users",
  5: "/dashboard/dashboard1?tab=forms",
  6: "/dashboard/dashboard1?tab=interactions",
};

function getModuleNumber(module) {
  const candidates = [module?.id, module?.menuSequenceNo];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (!Number.isNaN(value)) return value;
  }
  return null;
}

export function buildLoginRedirectPath(modules = [], permissions = [], licensedModuleIds = []) {
  const licensedSet = new Set(
    (licensedModuleIds || []).map(Number).filter((value) => !Number.isNaN(value)),
  );

  const permissionModuleIds = new Set(
    permissions
      .map((perm) => Number(perm.moduleId))
      .filter((value) => !Number.isNaN(value)),
  );
  const restrictedModuleIds = new Set(
    permissions
      .filter((perm) => Number(perm.privilegeId) === 11)
      .map((perm) => Number(perm.moduleId))
      .filter((value) => !Number.isNaN(value)),
  );

  const allowedModules = (modules || []).filter((mod) => {
    const moduleId = Number(mod.id);
    const menuSequenceNo = Number(mod.menuSequenceNo);
    const matchesPermission =
      permissionModuleIds.has(moduleId) || permissionModuleIds.has(menuSequenceNo);
    const isLicensed =
      licensedSet.size === 0 ||
      licensedSet.has(moduleId) ||
      licensedSet.has(menuSequenceNo);
    const isRestricted =
      restrictedModuleIds.has(moduleId) || restrictedModuleIds.has(menuSequenceNo);

    return matchesPermission && isLicensed && !isRestricted;
  });

  const allowedIds = new Set();
  allowedModules.forEach((mod) => {
    const moduleId = Number(mod.id);
    const menuSequenceNo = Number(mod.menuSequenceNo);
    if (!Number.isNaN(moduleId)) allowedIds.add(moduleId);
    if (!Number.isNaN(menuSequenceNo)) allowedIds.add(menuSequenceNo);
  });

  const hasDashboardShellAccess = allowedIds.has(DASHBOARD_MODULE_ID);
  const allowedPrivilegeIds = new Set(
    permissions
      .map((perm) => Number(perm.privilegeId))
      .filter((value) => !Number.isNaN(value)),
  );

  if (hasDashboardShellAccess) {
    const dashboardTab = DASHBOARD_TAB_BY_PRIVILEGE.find(
      ({ privilegeId, moduleId }) =>
        allowedPrivilegeIds.has(privilegeId) && allowedIds.has(moduleId),
    );
    if (dashboardTab) return dashboardTab.path;
  }

  const resolveRedirectPath = (module) => {
    const moduleNumber = getModuleNumber(module);
    const directTabRoute =
      hasDashboardShellAccess && moduleNumber != null
        ? MODULE_TAB_ROUTE_BY_ID[moduleNumber]
        : null;

    if (directTabRoute) return directTabRoute;
    if (LEGACY_COMBINED_ROUTES.has(module?.redirectPath)) {
      return (
        DASHBOARD_TAB_BY_PRIVILEGE.find(({ privilegeId }) =>
          allowedPrivilegeIds.has(privilegeId),
        )?.path || null
      );
    }
    return module?.redirectPath || null;
  };

  const hasFormsAccess = allowedIds.has(5);
  const hasManagementAccess = allowedIds.has(2);

  const preferred = allowedModules.find((m) => {
    const path = resolveRedirectPath(m);
    return (
      path &&
      ![5, 9, 2, 7, 8].includes(Number(m.menuSequenceNo)) &&
      ![5, 9, 2, 7, 8].includes(Number(m.id))
    );
  });

  if (preferred) return resolveRedirectPath(preferred);
  if (hasDashboardShellAccess && hasFormsAccess) return "/dashboard/dashboard1?tab=forms";
  if (hasDashboardShellAccess && hasManagementAccess) return "/dashboard/dashboard1?tab=Users";

  return allowedModules.map(resolveRedirectPath).find(Boolean) || null;
}
