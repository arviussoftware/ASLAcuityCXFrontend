class PermissionModel {
    constructor(id, roleId, moduleId, privilegeId) {
        this.id = id;
        this.roleId = roleId;
        this.moduleId = moduleId;
        this.privilegeId = privilegeId;
    }
}

async function setPermissionModel(recordset) {
    const permission = await recordset.map(
        (module) =>
            new PermissionModel(
                module.Id,
                module.RoleId,
                module.ModuleId,
                module.PrivilegeId
            )
    );
    return permission;
}
export { setPermissionModel };