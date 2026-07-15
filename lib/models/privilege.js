// /lib/models/privilege.js

class Privilege {
    constructor(privilegeId, privilegeName) {
      this.privilegeId = privilegeId;
      this.privilegeName = privilegeName;
    }
  }
 
  async function setPrivileges(recordset) {
    return recordset.map(
      (record) => new Privilege(record.PrivilegeId, record.PrivilegeName)
    );
  }
  
  export { Privilege, setPrivileges };
  