// lib/models/users.js

class UsersModel {
  constructor(
    id,
    userLoginId,
    userEmail,
    userName,
    firstName,
    middleName,
    lastName, // ✅ 3 separate
    roleId,
    role,
    phone,
    userAddress,
    activeStatus,
    isActive,
    password,
    userUniqueId,
    organization,
  ) {
    this.userId = id;
    this.loginId = userLoginId;
    this.email = userEmail;
    this.userName = userName;
    this.firstName = firstName; // ✅
    this.middleName = middleName; // ✅
    this.lastName = lastName; // ✅
    this.roleId = roleId;
    this.roleName = role;
    this.phone = phone;
    this.userAddress = userAddress;
    this.activeStatus = activeStatus;
    this.isActive = isActive;
    this.password = password;
    this.userUniqueId = userUniqueId;
    this.organization = organization;
  }
}

async function setUsersModel(recordset) {
  return recordset.map(
    (user) =>
      new UsersModel(
        user.userId,
        user.loginId,
        user.email,
        user.userName,
        user.firstName, // ✅
        user.middleName, // ✅
        user.lastName, // ✅
        user.roleId,
        user.roleName,
        user.phone,
        user.userAddress,
        user.activeStatus,
        user.isActive,
        user.password,
        user.userUniqueId,
        user.organization,
      ),
  );
}

async function setUsersModelById(recordsets) {
  return recordsets[0].map(
    (user) =>
      new UsersModel(
        user.userId,
        user.loginId,
        user.email,
        user.userName,
        user.firstName, // ✅
        user.middleName, // ✅
        user.lastName, // ✅
        user.roleId,
        user.roleName,
        user.phone,
        user.userAddress,
        user.activeStatus,
        user.isActive,
        user.password,
        user.userUniqueId,
        user.organization,
      ),
  );
}

export { setUsersModel, setUsersModelById };
export default UsersModel;
