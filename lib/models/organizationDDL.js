// /lib/models/organizationDDL.js

export function setAllOrganizationsInDDL(organizations) {
  // Process organizations to fit the dropdown structure
  return organizations.map((org) => ({
    value: org.id,
    label: org.Name, // Name as the label for the dropdown
  }));
}

export function setAllOrganizationsWithSelectedInDDL(organizations) {
  // Process organizations with selected status, if applicable
  return organizations.map((org) => ({
    value: org.id,
    label: org.Name,
    selected: org.parentId !== null, // Example logic, modify as needed
  }));
}
