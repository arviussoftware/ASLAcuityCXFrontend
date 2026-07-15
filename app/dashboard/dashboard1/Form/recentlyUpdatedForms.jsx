"use client";

import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { CalendarDays, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { subDays, parseISO } from "date-fns";

const RecentlyUpdatedFormsChart = () => {
  const [formsData, setFormsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  // Current date: May 14, 2025
  const currentDate = new Date(); // 04:36 PM IST

  const parseRelativeDate = (relativeDate) => {
    const match = relativeDate.match(/(\d+)\s+days\s+ago/);
    if (!match) return currentDate; // Fallback to current date if format doesn't match
    const daysAgo = parseInt(match[1], 10);
    return subDays(currentDate, daysAgo);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "--";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchForms = async () => {
      try {
        // Check if in browser before accessing sessionStorage
        if (typeof window === "undefined") return;

        const encryptedUserData = sessionStorage.getItem("user");
        if (!encryptedUserData) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        let userId = null;
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decrypted);
          userId = user?.userId || null;
        } catch (decryptionError) {
          console.error("Decryption error:", decryptionError);
          setError("Failed to decrypt user data.");
          setLoading(false);
          return;
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

        if (!userId) {
          setError("User ID missing.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/dashBoard1/Form/recentUpdatedForms", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userId,
            timezone,
          },
          cache: "no-store",
        });

        const result = await res.json();

        if (res.ok && result?.data) {
          // Convert relative dates to absolute dates and sort by Last Modified (newest first)
          const processedData = (result.data || [])
            .map((item) => ({
              ...item,
              AbsoluteLastModified: parseRelativeDate(item["Last Modified"]),
            }))
            .sort((a, b) => b.AbsoluteLastModified - a.AbsoluteLastModified);

          setFormsData(processedData);
          setError(null);
        } else {
          setError(result.message || "No data found.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Something went wrong!");
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col h-full hover:shadow-lg transition-all duration-300">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Recently Updated Forms
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recent updates to evaluation forms
          </p>
        </div>
        <motion.button
          onClick={handleRefresh}
          disabled={loading}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
            loading
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-primary"
          }`}
          whileHover={{ scale: loading ? 1 : 1.05 }}
          whileTap={{ scale: loading ? 1 : 0.95 }}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center py-6"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="sr-only">Loading...</span>
          <p className="text-xs text-muted-foreground mt-2">Loading forms...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded-md"
          role="alert"
        >
          <div className="flex items-center gap-1.5 text-red-700">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            <p className="text-xs font-medium">{error}</p>
          </div>
          <motion.button
            onClick={handleRefresh}
            className="mt-1.5 px-2 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Retry
          </motion.button>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && formsData.length === 0 && (
        <div className="p-3 text-center text-muted-foreground bg-muted text-xs rounded-md">
          No recent updates found
        </div>
      )}

      {/* Forms List */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!loading && !error && formsData.length > 0 && (
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {formsData.map((item, index) => {
              const currentDate = formatDate(item.AbsoluteLastModified);
              const prevDate =
                index > 0
                  ? formatDate(formsData[index - 1].AbsoluteLastModified)
                  : null;
              const showDateHeader = currentDate !== prevDate;

              return (
                <div key={index}>
                  {/* Date Header */}
                  {showDateHeader && (
                    <div className="flex items-center my-2">
                      <span className="px-2 py-0.5 text-xs font-medium text-muted-foreground bg-muted rounded-full">
                        {currentDate}
                      </span>
                    </div>
                  )}

                  {/* Form Item */}
                  <motion.div
                    className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <CalendarDays
                        className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <div className="w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {item["Form Name"] || "N/A"}
                          </h3>
                          {/* <p className="text-xs text-muted-foreground">{formatTime(item.AbsoluteLastModified)}</p> */}
                        </div>
                        <div className="mt-1.5 p-1.5 bg-blue-50 rounded-md">
                          <p className="text-xs text-foreground flex items-center gap-1">
                            <span>
                              Updated by{" "}
                              <span className="font-medium">
                                {item["Updated By"] || "N/A"}
                              </span>
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyUpdatedFormsChart;

