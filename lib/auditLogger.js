// lib/auditLogger.js

import { executeStoredProcedure } from "@/lib/mssqldb";

export async function logAudit({
  userId,
  userName,
  actionType,
  interactionId = null,
  description = null,
}) {
  try {
    if (!userId) return;
    await executeStoredProcedure(
      "usp_InsertAuditTrail",
      {
        userId: parseInt(userId),
        userName: userName || "unknown",
        actionType,
        interactionId,
        description,
      },
      {},
    );
  } catch (err) {
    console.error(`[audit] ${actionType} failed: ${err.message}`);
  }
}

export async function getAuditUser(userId) {
  try {
    if (!userId) {
      return { userId: null, userName: "unknown" };
    }

    const result = await executeStoredProcedure(
      "usp_GetSingleUser",
      { userId: parseInt(userId) },
      {},
    );

    const user = result?.recordset?.[0];

    return {
      userId: parseInt(userId),
      userName: user?.userFullName || user?.loginId || "unknown",
    };
  } catch (err) {
    console.error("Audit user lookup failed:", err);
    return {
      userId: parseInt(userId),
      userName: "unknown",
    };
  }
}
