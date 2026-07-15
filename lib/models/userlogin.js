class UserLoginModel {
  constructor(
    id,
    userLoginId,
    userEmail,
    fullName,
    roles,
    phone,
    organization
  ) {
    this.userId = id;
    this.loginId = userLoginId;
    this.email = userEmail;
    this.userFullName = fullName;
    this.userRoles = roles;
    this.phone = phone;
    this.organization = organization; // Single organization details
  }
}

async function setUsersLoginModel(recordset, recordsets) {
  let userRoles = [];
  let organization = [];

  // Extract roles
  if (recordsets.length > 1) {
    userRoles = recordsets[1].map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
    }));
  }

  // Extract organization details from the main user record
  if (recordset.length > 0) {
    organization = recordsets[2].map((org) => ({
      orgId: org.orgId,
      orgName: org.orgName,
    }));
  }

  // Map the user data to the model
  const loginUser = recordset.map(
    (user) =>
      new UserLoginModel(
        user.userId,
        user.user_login_id,
        user.email,
        user.user_full_name,
        userRoles,
        user.phone,
        organization
      )
  );

  return loginUser;
}

export { setUsersLoginModel };
export default UserLoginModel;
