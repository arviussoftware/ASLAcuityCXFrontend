class NavbarModuleModel {
    constructor(id, moduleName, redirectPath, menuSequenceNo) {
      this.id = id;
      this.moduleName = moduleName;
      this.redirectPath = redirectPath;
      this.menuSequenceNo = menuSequenceNo;
    }
  }
  
  async function setNavbarModuleModel(recordset) {
    const navbarModules = await recordset.map(
      (module) =>
        new NavbarModuleModel(
          module.ID,              // ID column from the table
          module.ModuleName,      // ModuleName column from the table
          module.RedirectPath,    // RedirectPath column from the table
          module.MenuSequenceNo   // MenuSequenceNo column from the table
        )
    );
    return navbarModules;
  }
  
  export { setNavbarModuleModel };
  export default NavbarModuleModel;
  