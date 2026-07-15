"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import "@/components/Styles/AnsAnalysisReport.css";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CryptoJS from 'crypto-js';
import { notFound, useSearchParams } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

function ReportsPage() {
  const searchParams = useSearchParams();
  const [forms, setForms] = useState([]); // List of forms
  const [loading, setLoading] = useState(false); // Loading state
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "evaluation"
  }`;


  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 10, 
            orgId: sessionStorage.getItem("selectedOrgId") || "", // Users module
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);

      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);

  useEffect(() => {
    if (privilegesLoaded && hasPrivilege(1)) {
      fetchForms();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privilegesLoaded]);
  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  const fetchForms = async () => {
    setLoading(true);
    try {
      // const loggedInUserId = sessionStorage.getItem("user")
      //   ? JSON.parse(sessionStorage.getItem("user")).userId
      //   : null;
      const encryptedUserData = sessionStorage.getItem("user");

      let loggedInUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          loggedInUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      const response = await fetch("/api/forminteractionmapping/reportddl", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId,
        },
        cache: "no-store",
      });

      const result = await response.json();
      if (response.ok) {
        setForms(result.formList || []);
      } else {
        console.error("Failed to fetch forms:", result.message);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
    }
  };
  function formatDateTime(isoDate) {
    const [date, time] = isoDate.split("T"); // Split date and time
    const [hours, minutes, seconds] = time.split(":"); // Extract time components
    return `${date} ${hours}:${minutes}:${seconds.split(".")[0]}`; // Remove milliseconds
  }

  return (
    <div className="containertx mx-auto px-4 py-6 text-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Link href={backHref} passHref>
            <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
        </div>
        <h2 className="font-semibold text-center flex-grow text-base -mt-10">
          Evaluated Form Reports
        </h2>
      </div>

      {loading ? (
        <p>Loading forms...</p>
      ) : forms.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-border">
          <thead className="bg-[linear-gradient(90deg,rgba(60,199,99,1)_0%,rgba(42,128,209,1)_100%)] text-white">
          <tr>
                <th className="border px-4 py-2">Form Name</th>
                <th className="border px-4 py-2">Form Version</th>
                <th className="border px-4 py-2">Created By</th>
                <th className="border px-4 py-2">Created Date</th>
                <th className="border px-4 py-2">Action</th>{" "}
                {/* Added Action column */}
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.formId} className="hover:bg-blue-100 transition">
                  <td className="border px-4 py-2 text-center">
                    {form.formName}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {form.FormVersion || "N/A"}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {form.CreatedBy || "N/A"}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {form.Creation_date
                      ? formatDateTime(form.Creation_date)
                      : "N/A"}
                  </td>
                  {/* Added Show button */}
                  <td className="border px-4 py-2 text-center">
                    <button
                      onClick={() =>
                        (window.location.href = `/dashboard/reports/ansAnalysisReport/${form.formId}`)
                      }
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      Show
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No forms available.</p>
      )}
    </div>
  );
}

export default ReportsPage;


