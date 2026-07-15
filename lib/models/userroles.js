class UserRoleModel {
  constructor(roleId, roleName) {
    this.roleId = roleId;
    this.roleName = roleName;
  }
}

async function setUsersRolesModel(recordset) {
  const users = await recordset.map(
    (user) => new UserRoleModel(user.roleId, user.roleName)
  );
  return users;
}

export { setUsersRolesModel };

export default UserRoleModel;
