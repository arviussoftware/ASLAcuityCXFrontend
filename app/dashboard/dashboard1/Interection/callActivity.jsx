"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  User,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import CryptoJS from "crypto-js";

const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export default function CallActivityTimelinePage() {
  const [activityData, setActivityData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      let userId = null;
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId;
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
          setError("Please sign in to view activity");
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          "/api/dashBoard1/interactionS/getCallActivityTimeline",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
              timezone,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch data");
        }

        // Sort data by date (newest first)
        const sortedData = (result.data || []).sort((a, b) => {
          const dateA = new Date(a.EvaluatedAt || a.AssignedAt);
          const dateB = new Date(b.EvaluatedAt || b.AssignedAt);
          return dateB - dateA;
        });

        setActivityData(sortedData);
      } catch (error) {
        console.error("Error fetching call activity data:", error);
        setError(error.message || "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  const parseApiDate = (dateString) => {
    if (!dateString) return null;

    // Example input: "22/09/2025, 01:03 pm"
    const [datePart, timePart] = dateString.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);

    let [time, ampm] = timePart.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes);
  };

  const formatDate = (dateString) => {
    const date = parseApiDate(dateString);
    if (!date) return "--";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const formatTime = (dateString) => {
    const date = parseApiDate(dateString);
    if (!date) return "--";

    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;

    return `${String(formattedHours).padStart(2, "0")}:${minutes} ${ampm}`;
  };

  const getTimeDifference = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start.replace("Z", ""));
    const endDate = new Date(end.replace("Z", ""));
    const diffInSeconds = Math.floor((endDate - startDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes`;
    return `${Math.floor(diffInSeconds / 3600)} hours ${Math.floor(
      (diffInSeconds % 3600) / 60
    )} minutes`;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col h-full hover:shadow-lg transition-all duration-300">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
            <Clock className="w-5 h-5 text-indigo-600"></Clock>
            Call Activity Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recent call evaluations and assignments
          </p>
        </div>
        <motion.button
          onClick={handleRefresh}
          disabled={isLoading}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
            isLoading
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-primary"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div
          className="flex flex-col items-center justify-center py-6"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="sr-only">Loading...</span>
          <p className="text-xs text-muted-foreground mt-2">Loading timeline...</p>
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
            {/* <p className="text-xs font-medium">{error}</p> */}
            <p className="text-xs font-medium">No Activity found</p>
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
      {!isLoading && !error && activityData.length === 0 && (
        <div className="p-3 text-center text-muted-foreground bg-muted text-xs rounded-md">
          No call activity found
        </div>
      )}

      {/* Timeline */}
      {!isLoading && activityData.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
          {activityData.map((item, index) => {
            const currentDate = formatDate(item.EvaluatedAt || item.AssignedAt);
            const prevDate =
              index > 0
                ? formatDate(
                    activityData[index - 1].EvaluatedAt ||
                      activityData[index - 1].AssignedAt
                  )
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

                {/* Activity Item */}
                <motion.div
                  className="relative bg-muted rounded-lg p-2.5 border border-border shadow-sm hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  {/*<div className="absolute left-0 top-0 h-full w-0.5 bg-blue-600 rounded-l-lg" aria-hidden="true" />*/}
                  <div className="flex items-start gap-2">
                    <Phone
                      className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div className="w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-900">
                          {item.AgentName} → Interaction (ID:
                          {item.interaction_id})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(item.EvaluatedAt || item.AssignedAt)}
                        </p>
                      </div>

                      {/* Evaluation Details */}
                      {item.EvaluatorName && (
                        <div className="mt-1.5 p-1.5 bg-blue-50 rounded-md">
                          <p className="text-xs text-foreground flex items-center gap-1">
                            <User
                              className="w-3 h-3 flex-shrink-0"
                              aria-hidden="true"
                            />
                            {/* <span>
                                Evaluated by <span className="font-medium">{item.EvaluatorName}</span> • Time taken:{" "}
                                {item.TimeTakenSec || "--"}s • Total: {item.EvaluatedAt|| "--"}
                              </span> */}
                            <span>
                              Evaluated by{" "}
                              <span className="font-medium">
                                {item.EvaluatorName}
                              </span>{" "}
                              • Time taken: {item.TimeTakenSec || "--"}s
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Assignment Details */}
                      {item.AssignedByName && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <Clock
                            className="w-3 h-3 mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            Assigned by{" "}
                            <span className="font-medium">
                              {item.AssignedByName}
                            </span>{" "}
                            on {formatDate(item.AssignedAt)} at{" "}
                            {formatTime(item.AssignedAt)}
                            {!item.EvaluatorName && (
                              <span className="ml-1 text-orange-600">
                                • Pending
                              </span>
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

