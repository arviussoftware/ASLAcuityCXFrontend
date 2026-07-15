class OrganizationModel {
  constructor(id, Name, Description, parentId, children = [], isActive = true) {
    this.id = id;
    this.Name = Name;
    this.Description = Description;
    this.parentId = parentId;
    this.children = children; // Initialize children as an empty array by default
    this.isActive = isActive; // ✅ Add this line
  }
}

export default OrganizationModel;
