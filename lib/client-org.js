export function getSelectedOrgIdsHeader() {
  if (typeof window === "undefined") {
    return "";
  }

  const storedOrgIds = sessionStorage.getItem("selectedOrgIds");

  if (storedOrgIds) {
    try {
      const parsed = JSON.parse(storedOrgIds);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter(Boolean)
          .join(",");
      }
    } catch {
      return storedOrgIds;
    }

    return String(storedOrgIds).trim();
  }

  return sessionStorage.getItem("selectedOrgId") || "";
}

export function getSelectedOrgSyncKey() {
  if (typeof window === "undefined") {
    return "";
  }

  const selectedOrgId = sessionStorage.getItem("selectedOrgId") || "";
  const selectedOrgIds = sessionStorage.getItem("selectedOrgIds") || "";
  return `${selectedOrgId}::${selectedOrgIds}`;
}
