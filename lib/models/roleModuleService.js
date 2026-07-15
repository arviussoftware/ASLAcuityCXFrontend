import { executeStoredProcedure } from "./mssqldb";
import sql from "mssql";

export async function saveRoleModulePrivileges(tvpData) {
  try {
    // Prepare the TVP data
    const table = new sql.Table("RoleModulePrivilegeType");
    table.columns.add("RoleId", sql.Int);
    table.columns.add("ModuleId", sql.Int);
    table.columns.add("PrivilegeId", sql.Int);

    tvpData.forEach((item) => {
      table.rows.add(
        parseInt(item.RoleId),
        parseInt(item.ModuleId),
        parseInt(item.PrivilegeId)
      );
    });

    const inputParams = { RoleModulePrivileges: table };

    // Execute the stored procedure
    const result = await executeStoredProcedure(
      "usp_InsertRoleModulesWithPrivileges",
      inputParams
    );

    return result;
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    throw new Error("Failed to save role-module-privilege mappings.");
  }
}
