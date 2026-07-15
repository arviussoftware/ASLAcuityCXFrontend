"use client";

import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";

const RoleAccess = () => {
  const [roleData, setRoleData] = useState([]);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  // Function to fetch role access data
  useEffect(() => {
    const fetchRoleAccess = async () => {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decrypted);
          userId = user?.userId || null;
        } catch (e) {
          setError("Decryption error. Unable to fetch user data.");
          console.error("Decryption error:", e);
        }
      }
      if (!userId) {
        setError("User ID missing.");
        return;
      }
      try {
        const response = await fetch(
          "/api/dashBoard1/usersM/getRoleModuleAccessTbl",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (response.ok) {
          setRoleData(result.data);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Error fetching data.");
        console.error(err);
      }
    };
    fetchRoleAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sorting function
  const handleSort = (field) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortField(field);
    setSortOrder(isAsc ? "desc" : "asc");

    const sortedData = [...roleData].sort((a, b) => {
      if (field === "RoleName") {
        return isAsc
          ? a.RoleName.localeCompare(b.RoleName)
          : b.RoleName.localeCompare(a.RoleName);
      } else if (field === "Modules") {
        return isAsc
          ? a.Modules.localeCompare(b.Modules)
          : b.Modules.localeCompare(a.Modules);
      }
      return 0;
    });
    setRoleData(sortedData);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white shadow-md rounded-lg p-4 border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <div className="flex items-center gap-1 mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1 widget-drag-handle cursor-move select-none flex-shrink-0">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Role-Wise Access
        </h2>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}
      {roleData.length > 0 ? (
        <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0 w-full">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-blue-100 text-blue-900 text-left sticky top-0 z-10">
                {[
                  { label: "#", key: "index" },
                  { label: "Role Name", key: "RoleName" },
                  { label: "Modules", key: "Modules" },
                ].map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={key !== "index" ? () => handleSort(key) : null}
                    className={`px-3 py-2 ${
                      key !== "index" ? "cursor-pointer hover:bg-blue-200" : ""
                    } whitespace-nowrap tracking-wider`}
                  >
                    <div className="flex items-center gap-0.5">
                      {label}
                      {sortField === key && key !== "index" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleData.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center py-3 text-muted-foreground text-sm"
                  >
                    No roles available.
                  </td>
                </tr>
              ) : (
                roleData.map((role, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      idx % 2 === 0 ? "bg-card" : "bg-muted"
                    } transition-all hover:bg-muted`}
                  >
                    <td className="px-3 py-2 text-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 text-foreground font-medium truncate max-w-[200px]">
                      {role.RoleName}
                    </td>
                    <td className="px-3 py-2 text-foreground">{role.Modules}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading role-wise access data...
        </div>
      )}
    </div>
  );
};

export default RoleAccess;

