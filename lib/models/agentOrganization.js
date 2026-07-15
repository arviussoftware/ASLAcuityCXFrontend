class AgentOrganizationModule {
  constructor(
    id,
    agentId,
    org_id,
    organizationName,
    activeStatus,
    isActive,
    // organizationActiveStatus,
    uniqueId
  ) {
    this.id = id;
    this.agentId = agentId;
    this.org_id = org_id;
    this.organizationName = organizationName;
    this.activeStatus = activeStatus;
    this.isActive = isActive;
    // this.organizationActiveStatus = organizationActiveStatus;
    this.uniqueId = uniqueId;
  }
}

async function setAgentOrganizationModule(recordset) {
  const agentorganization = await recordset.map(
    (a) =>
      new AgentOrganizationModule(
        a.id,
        a.agentId,
        a.org_id,
        a.organizationName,
        a.activeStatus,
        a.isActive,
        // a.organizationActiveStatus,
        a.uniqueId
      )
  );
  return agentorganization;
}

export { setAgentOrganizationModule };
export default AgentOrganizationModule;
