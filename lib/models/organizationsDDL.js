class OrganizationDDL {
  constructor(orgId, orgName, parentId) {
    this.orgId = orgId;
    this.orgName = orgName;
    this.parentId = parentId;
  }
}

async function setAllOrganizationsInDDL(recordset) {
  return recordset.map((organization) => ({
    orgId: organization.orgId,
    orgName: organization.org_name, // Ensure this maps to the correct field name from SQL
    parentId: organization.parentId,
  }));
}

export { setAllOrganizationsInDDL };
export default OrganizationDDL;
