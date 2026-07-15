"use client";
import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import { StickyNote } from "lucide-react"; // Lucide icons
const FormLifecycle = () => {
  const [formLifecycleData, setFormLifecycleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const formsPerPage = 5;

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchFormLifecycle = async () => {
      const encryptedUserData = sessionStorage.getItem("user");
      let userRole = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userRole = user?.userId;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      let timezone = null;
      const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

      if (encryptedTimezone) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          timezone = JSON.parse(decryptedData);
        } catch (err) {
          console.error("Failed to decrypt timezone:", err);
        }
      }

      if (!userRole) {
        setError("User ID not found");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashBoard1/Form/formLifeCycle", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
            timezone,
          },
        });

        const data = await res.json();

        if (!res.ok || !data?.data) {
          throw new Error(
            data?.message || "Failed to fetch form lifecycle details"
          );
        }

        setFormLifecycleData(data.data);
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchFormLifecycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pagination logic
  const indexOfLastForm = currentPage * formsPerPage;
  const indexOfFirstForm = indexOfLastForm - formsPerPage;
  const currentForms = formLifecycleData.slice(
    indexOfFirstForm,
    indexOfLastForm
  );
  const totalPages = Math.ceil(formLifecycleData.length / formsPerPage);

  // Sorting logic
  const handleSort = (field) => {
    const updatedOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    const sorted = [...formLifecycleData].sort((a, b) => {
      const valA = a[field] || "";
      const valB = b[field] || "";
      return updatedOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    setFormLifecycleData(sorted);
    setSortField(field);
    setSortOrder(updatedOrder);
  };

  if (loading)
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
    );
  if (error)
    return (
      <div className="text-center py-4 text-destructive text-sm font-medium">
        Error: {error}
      </div>
    );

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white shadow-md rounded-lg p-4 border border-border hover:shadow-lg transition-all duration-300 ">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0">
          <StickyNote className="w-5 h-5 text-primary" />
          Incomplete Forms (Drafts)
        </h2>
        <span className="text-xs text-muted-foreground">
          Showing {formLifecycleData.length} Draft Form
          {formLifecycleData.length !== 1 && "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-100 text-blue-900 text-left">
              {[
                { label: "Form Name", key: "Form Name" },
                { label: "Created By", key: "Created By" },
                { label: "Modified By", key: "Modified By" },
                { label: "Days", key: "Time in Draft" },
                { label: "Status", key: "Form Status" },
              ].map(({ label, key }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-3 py-2 cursor-pointer whitespace-nowrap hover:bg-blue-200 transition-all"
                >
                  {label}
                  {sortField === key && (
                    <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentForms.map((form, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-card" : "bg-muted"}
              >
                <td className="px-3 py-2 text-foreground font-medium text-xs">
                  {form["Form Name"] || "N/A"}
                </td>
                <td className="px-3 py-2 text-foreground text-xs">
                  {form["Created By"] || "N/A"}
                </td>
                <td className="px-3 py-2 text-foreground text-xs">
                  {form["Modified By"] || "N/A"}
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {form["Time in Draft"] || "N/A"}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    {form["Form Status"] || "N/A"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formLifecycleData.length > formsPerPage && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-primary disabled:bg-gray-300 disabled:text-muted-foreground"
          >
            ← Prev
          </button>
          <span className="text-xs text-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-primary disabled:bg-gray-300 disabled:text-muted-foreground"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default FormLifecycle;

