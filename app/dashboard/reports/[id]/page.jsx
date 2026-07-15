"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import CryptoJS from 'crypto-js';

export default function ReportsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all forms
  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      try {
        // const loggedInUserId = sessionStorage.getItem("user")
        //   ? JSON.parse(sessionStorage.getItem("user")).userId
        //   : null;
        const encryptedUserData = sessionStorage.getItem("user");
        // ✅ Clear interactionDateRange after user validation
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
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
            requestType: "formddlforassign",
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

    fetchForms();
  }, []);

  // Fetch answers for a specific formId and download Excel
  const fetchFormAnswersAndDownload = async (formId) => {
    try {
      const response = await fetch("/api/formanswers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          formId: formId,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.formAnswers) {
        const formattedData = generateFormattedData(result.formAnswers);

        if (formattedData) {
          // Generate Excel file
          const worksheet = XLSX.utils.json_to_sheet(formattedData.data);

          // Set headers range for Excel
          worksheet["!ref"] = formattedData.ref;

          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, `Form_${formId}`);
          XLSX.writeFile(workbook, `Form_${formId}_Answers.xlsx`);
        } else {
          console.warn("No data available to download.");
        }
      } else {
        console.error("Invalid API response structure:", result);
      }
    } catch (error) {
      console.error("Error fetching form answers:", error);
    }
  };

  // Format hierarchical data into column headers and rows
  const generateFormattedData = (formAnswers) => {
    if (!formAnswers || formAnswers.length === 0) {
      return null;
    }

    const headers = new Set();
    const rows = {};

    formAnswers.forEach((item) => {
      const interactionId = item.interactionId || "N/A";

      if (!rows[interactionId]) {
        rows[interactionId] = { InteractionId: interactionId };
      }

      const question = item.question || "Unnamed Question";
      headers.add(question);
      rows[interactionId][question] = item.answer || "No answer provided";
    });

    const data = Object.values(rows);
    const orderedHeaders = ["InteractionId", ...Array.from(headers)];

    // Prepare headers for Excel compatibility
    const ref = XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: orderedHeaders.length - 1, r: data.length },
    });

    return {
      data,
      ref,
    };
  };

  return (
    <div>
      {loading ? (
        <p>Loading forms...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div key={form.formId} className="border rounded-lg p-4 shadow-md">
              <h2 className="text-lg font-bold">{form.formName}</h2>
              <p>
                <strong>Form ID:</strong> {form.formId}
              </p>
              <button
                onClick={() => fetchFormAnswersAndDownload(form.formId)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Download Excel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

