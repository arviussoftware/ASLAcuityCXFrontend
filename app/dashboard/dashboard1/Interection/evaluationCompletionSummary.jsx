"use client";

import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { motion } from "framer-motion";
import { BarChart2, RefreshCw } from "lucide-react";
import { Phone, CheckCircle, Clock } from "lucide-react";

export default function EvaluationCompletionSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overdueDays] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  // Dates
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const [fromDate, setFromDate] = useState(
    () => threeMonthsAgo.toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState(() => today.toISOString().split("T")[0]);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    const encryptedUserData = sessionStorage.getItem("user");
    let userId = null;

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decrypted);
        userId = user?.userId;
      } catch {
        setError("Failed to decrypt user data.");
        setLoading(false);
        return;
      }
    }
    if (!userId) {
      setError("Please log in again.");
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

    try {
      const query = new URLSearchParams({
        fromDate: fromDate || "",
        toDate: toDate || "",
        overdueDays: overdueDays.toString(),
      });

      const res = await fetch(
        `/api/dashBoard1/interactionS/getEvaluationSummary?${query.toString()}`,
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
        setSummary(result.data[0]);
      } else {
        setError(result?.message || "No data available.");
      }
    } catch {
      setError("Failed to fetch evaluation summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completion = Math.round(summary?.EvaluationCompletionPercent || 0);

  return (
    <motion.div
      className="bg-gradient-to-br from-blue-50 to-white p-4 border border-border shadow-md rounded-lg w-full max-w-xl mx-auto transition-all hover:shadow-lg space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-labelledby="evaluation-summary"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            Evaluation Summary
          </h2>
        </div>
        <motion.button
          onClick={() => setShowFilters((prev) => !prev)}
          className="text-sm text-primary hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-expanded={showFilters}
          aria-controls="filter-panel"
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </motion.button>
      </div>
      {showFilters && (
        <motion.div
          id="filter-panel"
          className="flex flex-col sm:flex-row items-center gap-2 bg-muted p-0"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative w-full sm:w-32">
            <svg
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              aria-label="Start date"
              required
            />
          </div>
          <div className="relative w-full sm:w-32">
            <svg
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              aria-label="End date"
              required
            />
          </div>
          <motion.button
            onClick={fetchSummary}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-primary"
            }`}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            aria-label="Apply date filters"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Apply"
            )}
          </motion.button>
        </motion.div>
      )}
      {loading && (
        <div className="flex justify-center items-center h-36">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 border-opacity-50" />
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-md px-4 py-3 text-center">
          {error}
          <div className="mt-2">
            <motion.button
              onClick={fetchSummary}
              className="bg-red-600 text-white px-3 py-1 text-xs rounded hover:bg-destructive"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
          </div>
        </div>
      )}
      {!loading && !error && summary && (
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-28 h-28">
            <CircularProgressbar
              value={completion}
              text={`${completion}%`}
              styles={buildStyles({
                textColor: "hsl(var(--foreground))",
                pathColor: "hsl(var(--primary))",
                trailColor: "hsl(var(--border))",
                textSize: "18px",
              })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-sm text-foreground">
            <motion.div
              className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.03 }}
              title="Total calls made in the selected period"
            >
              <Phone className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-medium">Total Calls</p>
                <p className="text-lg font-semibold">{summary.TotalCalls}</p>
              </div>
            </motion.div>
            <motion.div
              className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.03 }}
              title="Calls evaluated in the selected period"
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Evaluated</p>
                <p className="text-lg font-semibold">
                  {summary.EvaluatedCalls}
                </p>
              </div>
            </motion.div>
            <motion.div
              className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted transition-colors"
              whileHover={{ scale: 1.03 }}
              title="Calls overdue for evaluation"
            >
              <Clock className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium">Overdue</p>
                <p className="text-lg font-semibold">
                  {summary.OverdueUnevaluatedCalls}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

