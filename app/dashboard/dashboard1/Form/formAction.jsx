"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";
import { PencilLine } from "lucide-react"; // Importing the PencilLine icon

export default function FormActionCenter(handlers) {
  const [forms, setForms] = useState([]);
  const [filter, setFilter] = useState("last7days");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  // const formsPerPage = 10;
  const [formsPerPage, setFormsPerPage] = useState(10);

  const router = useRouter();
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const updateRowsPerPage = () => {
      const widget = document.getElementById("form-action-center-widget");
      if (!widget) return;

      const height = widget.clientHeight;
      // Approximate row height ~36px (adjust if needed)
      const availableHeight = height - 180; // subtract header, filter, pagination
      const calculatedRows = Math.max(5, Math.floor(availableHeight / 36));

      setFormsPerPage(calculatedRows);
      setCurrentPage(1); // Reset to first page
    };

    updateRowsPerPage();
    window.addEventListener("resize", updateRowsPerPage);

    return () => window.removeEventListener("resize", updateRowsPerPage);
  }, []);

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      setError("");
      setMessage("");

      let userRole = null;

      try {
        const encryptedUserData = sessionStorage.getItem("user");
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userRole = user?.userId;
        }
      } catch (error) {
        console.error("Error decrypting user data:", error);
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
        const res = await fetch(
          `/api/dashBoard1/Form/formActionCente?filterType=${filter}&timezone=${encodeURIComponent(
            timezone || ""
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userRole,
            },
          }
        );

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.message || "Something went wrong");
          return;
        }

        const result = await res.json();
        setForms(result.data || []);
      } catch (err) {
        console.error("Error:", err);
        setMessage("Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const statusText = (status) => {
    switch (status) {
      case 0:
        return "Draft";
      case 1:
        return "Submitted Form";
      case 2:
        return "Hidden";
      case 3:
        return "Staged";
      case 5:
        return "Published";
      default:
        return "Unknown";
    }
  };

  const getStatusStyle = (status) => {
    const base =
      "inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold";
    switch (statusText(status)) {
      case "Draft":
        return `${base} bg-yellow-100 text-yellow-800`;
      case "Submitted Form":
        return `${base} bg-blue-100 text-blue-800`;
      case "Hidden":
        return `${base} bg-red-100 text-red-800`;
      case "Staged":
        return `${base} bg-purple-100 text-purple-800`;
      case "Published":
        return `${base} bg-green-100 text-green-800`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  // Pagination logic
  const indexOfLastForm = currentPage * formsPerPage;
  const indexOfFirstForm = indexOfLastForm - formsPerPage;
  const currentForms = forms.slice(indexOfFirstForm, indexOfLastForm);
  const totalPages = Math.ceil(forms.length / formsPerPage);

  // Sorting logic
  const handleSort = (field) => {
    const updatedOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    const sorted = [...forms].sort((a, b) => {
      const valA = a[field] || "";
      const valB = b[field] || "";
      return updatedOrder === "asc"
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
    setForms(sorted);
    setSortField(field);
    setSortOrder(updatedOrder);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white shadow-md rounded-lg p-4 border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0 widget-drag-handle cursor-move select-none">
          <PencilLine className="w-5 h-5 text-primary" />
          <span>Form Action Center</span>
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-xs text-muted-foreground w-full sm:w-36 transition-all hover:bg-muted"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="1900-01-01">All</option>
          </select>
          <span className="text-xs text-muted-foreground">
            Showing {forms.length} Form{forms.length !== 1 && "s"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
      ) : error ? (
        <div className="text-center py-4 text-destructive text-sm font-medium">
          Error: {error}
        </div>
      ) : (
        <>
          {message && (
            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-xs text-center shadow-sm mb-3">
              <p className="font-medium">{message}</p>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-100 text-blue-900 text-left">
                    {[
                      { label: "#", key: "index" },
                      { label: "Form Name", key: "form_name" },
                      { label: "Created By", key: "Created_by" },
                      { label: "Modify By", key: "Modify_by" },
                      { label: "Status", key: "Status" },
                      { label: "Created At", key: "Created_on" },
                      { label: "Modify At", key: "Modify_on" },
                      { label: "Preview", key: "preview" },
                      // { label: 'Action', key: 'Action' },
                    ].map(({ label, key }) => (
                      <th
                        key={key}
                        onClick={
                          key !== "index" && key !== "preview"
                            ? () => handleSort(key)
                            : null
                        }
                        className={`px-3 py-2 ${
                          key !== "index" && key !== "preview"
                            ? "cursor-pointer hover:bg-blue-200"
                            : ""
                        } whitespace-nowrap sticky top-0 bg-blue-100 z-10 transition-all`}
                      >
                        <div className="flex items-center gap-0.5">
                          {label}
                          {sortField === key &&
                            key !== "index" &&
                            key !== "preview" && (
                              <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                            )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentForms.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-3 text-muted-foreground text-sm"
                      >
                        No forms available
                      </td>
                    </tr>
                  ) : (
                    currentForms.map((form, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          idx % 2 === 0 ? "bg-card" : "bg-muted"
                        } transition-all hover:bg-muted`}
                      >
                        {/* Adjusted the order of columns */}
                        <td className="px-3 py-2 text-foreground">
                          {(currentPage - 1) * formsPerPage + idx + 1}
                        </td>
                        <td className="px-3 py-2 text-foreground font-medium truncate max-w-[200px]">
                          {form.form_name || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-foreground truncate max-w-[120px]">
                          {form.Created_by || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-foreground truncate max-w-[120px]">
                          {form.Modify_by || "N/A"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={getStatusStyle(form.Status)}>
                            {statusText(form.Status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">
                          {form.Created_on
                            ? new Date(form.Created_on).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">
                          {form.Modify_on
                            ? new Date(form.Modify_on).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "N/A"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() =>
                              router.push(`/dashboard/forms/${form.UniqueId}`)
                            }
                            className="text-primary hover:text-blue-800 hover:underline transition-all"
                          >
                            Preview
                          </button>
                        </td>
                        {/* <td className="px-3 py-2 text-muted-foreground italic"> 
            {form.Action || '--'}
        </td> */}
                        {/* <td className="px-2 py-1 text-muted-foreground flex gap-2 flex-wrap">
  {form.Action
    ? form.Action.split(',').map((action, index) => (
        <button
          key={index}
          className= "px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-primary disabled:bg-gray-300 disabled:text-muted-foreground"
        >
          {action.trim()}
        </button>
      ))
    : <span className="italic text-muted-foreground">--</span>}
</td> */}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {forms.length > formsPerPage && (
            <div className="flex justify-between items-center mt-3 text-sm border-t border-border pt-3 bg-card sticky bottom-0">
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
        </>
      )}
    </div>
  );
}

