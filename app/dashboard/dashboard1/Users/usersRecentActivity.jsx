"use client";

import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import {
  CalendarDays,
  Loader2,
  RefreshCw,
  AlertTriangle,
  User,
  Info,
  CheckCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const ActivityFeed = () => {
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const fixedDateString = dateString.replace("Z", "");
    const date = new Date(fixedDateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--";
    const fixedDateString = dateString.replace("Z", "");
    const date = new Date(fixedDateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getActivityIcon = (type = "") => {
    const key = type.toLowerCase();
    const base = "w-3.5 h-3.5 mt-0.5 flex-shrink-0";
    if (key.includes("login"))
      return <User className={`${base} text-primary`} />;
    if (key.includes("role"))
      return <Info className={`${base} text-purple-600`} />;
    if (key.includes("activation"))
      return <CheckCircle className={`${base} text-green-600`} />;
    if (key.includes("update"))
      return <AlertCircle className={`${base} text-orange-500`} />;
    return <UserCheck className={`${base} text-muted-foreground`} />;
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchActivityFeed = async () => {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decrypted);
          userId = user?.userId || null;
        } catch (e) {
          console.error("Decryption error:", e);
          setError("Failed to decrypt user data.");
          setLoading(false);
          return;
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

      if (!userId) {
        setError("Please sign in to view activity");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          "/api/dashBoard1/usersM/getUsersRecentActivity",
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

        const result = await res.json();

        if (res.ok && result?.data?.length > 0) {
          // Sort data by activity_time (newest first)
          const sortedData = (result.data || []).sort((a, b) => {
            const dateA = new Date(a.activity_time);
            const dateB = new Date(b.activity_time);
            return dateB - dateA;
          });
          setActivityFeed(sortedData);
          setError(null);
        } else {
          setError(result.message || "No recent activity");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load activity");
      } finally {
        setLoading(false);
      }
    };
    fetchActivityFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col hover:shadow-lg transition-all duration-300 h-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Recent Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recent user activities and updates
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
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="sr-only">Loading...</span>
          <p className="text-xs text-muted-foreground mt-2">Loading activities...</p>
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
      {!loading && !error && activityFeed.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="p-3 text-center text-muted-foreground bg-muted text-xs rounded-md">
            No recent activity found
          </div>
        </div>
      )}

      {/* Activities List */}
      {!loading && !error && activityFeed.length > 0 && (
        <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
          {activityFeed.map((item, index) => {
            const currentDate = formatDate(item.activity_time);
            const prevDate =
              index > 0
                ? formatDate(activityFeed[index - 1].activity_time)
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
                  <div
                    className="absolute left-0 top-0 h-full w-0.5 bg-blue-600 rounded-l-lg"
                    aria-hidden="true"
                  />
                  <div className="flex items-start gap-2">
                    {getActivityIcon(item.activity_type)}
                    <div className="w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">
                          {item.User_full_name || "System"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(item.activity_time)}
                        </p>
                      </div>
                      <div className="mt-1.5 p-1.5 bg-blue-50 rounded-md">
                        <p className="text-xs text-foreground flex items-center gap-1">
                          <span>{item.message || item.activity_type}</span>
                          {item.user_role && (
                            <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              {item.user_role}
                            </span>
                          )}
                          {item.role_description && (
                            <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              {item.role_description}
                            </span>
                          )}
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
  );
};

export default ActivityFeed;

