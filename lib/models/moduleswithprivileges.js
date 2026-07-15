class ModulesWithPrivileges {
  constructor(RoleId, ModuleId, PrivilegeId, user_role) {
    this.RoleId = RoleId;
    this.ModuleId = ModuleId;
    this.PrivilegeId = PrivilegeId;
    this.user_role = user_role;
  }
}

async function setPrivilege(recordset) {
  const privileges = recordset.map(
    (e) =>
      new ModulesWithPrivileges(
        e.RoleId,
        e.ModuleId,
        e.PrivilegeId,
        e.user_role
      )
  );
  return privileges;
}

export { setPrivilege };
export default ModulesWithPrivileges;
