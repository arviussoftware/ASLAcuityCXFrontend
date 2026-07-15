"use client";
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import CryptoJS from "crypto-js";
import { Clock, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

export default function EvaluationTimeAnalyzerPage() {
  const [distribution, setDistribution] = useState([]);
  const [allOutliers, setAllOutliers] = useState([]); // Store all outliers
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterType, setFilterType] = useState("<5 min");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    let userRole = null;
    const encryptedUserData = sessionStorage.getItem("user");

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userRole = user?.userId || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
        setError("Failed to authenticate user");
        setIsLoading(false);
        return;
      }
    }

    if (!userRole) {
      setError("User ID missing - please login again");
      setIsLoading(false);
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
      // Fetch all data without filter for chart, and filtered data for table
      const [allDataRes, filteredDataRes] = await Promise.all([
        // Full data for chart
        fetch(`/api/dashBoard1/interactionS/evaluationTimeAnalyzer`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
            timezone,
          },
          cache: "no-store",
        }),
        // Filtered data for table
        fetch(
          `/api/dashBoard1/interactionS/evaluationTimeAnalyzer?durationBucket=${filterType}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userRole,
              timezone,
            },
            cache: "no-store",
          }
        ),
      ]);

      if (!allDataRes.ok) {
        const err = await allDataRes.json();
        throw new Error(err.message || "Failed to fetch chart data");
      }
      if (!filteredDataRes.ok) {
        const err = await filteredDataRes.json();
        throw new Error(err.message || "Failed to fetch table data");
      }

      const allDataJson = await allDataRes.json();
      const filteredDataJson = await filteredDataRes.json();

      // Chart uses full distribution data
      setDistribution(allDataJson.data.distribution || []);
      // Table uses filtered outliers data
      setAllOutliers(filteredDataJson.data.outliers || []);
    } catch (err) {
      setError(err.message || "Failed to fetch evaluation data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch chart data only on refresh, table data on filter change
  useEffect(() => {
    if (refreshKey === 0) {
      // First load - fetch both
      fetchData();
    } else {
      // Refresh button clicked - fetch both
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Fetch only table data when filter changes
  useEffect(() => {
    if (refreshKey > 0) {
      // Skip on first load
      fetchTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const fetchTableData = async () => {
    let userRole = null;
    const encryptedUserData = sessionStorage.getItem("user");

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userRole = user?.userId || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
        return;
      }
    }

    if (!userRole) return;

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
      const res = await fetch(
        `/api/dashBoard1/interactionS/evaluationTimeAnalyzer?durationBucket=${filterType}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
            timezone,
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch table data");
      }
      const json = await res.json();
      setAllOutliers(json.data.outliers || []);
    } catch (err) {
      console.error("Error fetching table data:", err);
    }
  };

  // Use filtered data from API for table
  const filteredOutliers = allOutliers;

  const chartData = {
    labels: distribution.map((item) => item.DurationBucket),
    datasets: [
      {
        label: "Evaluation Count",
        data: distribution.map((item) => item.EvaluationCount),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} evaluations`,
        },
      },
      title: {
        display: true,
        text: "Evaluation Duration Distribution",
        font: { size: 16 },
        padding: { bottom: 20 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Evaluations",
          font: { weight: "bold" },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: "Duration Buckets (minutes)",
          font: { weight: "bold" },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col h-full hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0 widget-drag-handle cursor-move select-none">
              Evaluation Time Analyzer
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analyze evaluation durations and outliers
            </p>
          </div>
        </div>
        <motion.button
          onClick={handleRefresh}
          disabled={isLoading}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            isLoading
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-primary"
          }`}
          whileHover={{ scale: isLoading ? 1 : 1.05 }}
          whileTap={{ scale: isLoading ? 1 : 0.95 }}
          aria-label="Refresh data"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </motion.button>
      </div>
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
      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row  gap-4">
        {/* Chart */}
        <div className="bg-muted rounded-lg p-3 border border-border flex flex-col flex-1 min-h-0">
          <div className="relative flex-1 w-full h-full">
            {isLoading ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="sr-only">Loading chart...</span>
                <p className="text-xs text-muted-foreground mt-1">Loading chart...</p>
              </div>
            ) : distribution.length > 0 ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                No duration distribution data available
              </div>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="bg-muted rounded-lg p-2.5 border border-border flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <AlertTriangle
                className="w-4 h-4 text-amber-500"
                aria-hidden="true"
              />
              Evaluation Duration Detail
            </h3>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-border rounded-md px-2 py-1 text-xs bg-card text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="<5 min">Less Than 5 minutes</option>
              <option value="5-10 min">5 To 10 minutes</option>
              <option value="10-15 min">10 To 15 minutes</option>
              <option value="15-20 min">15 To 20 minutes</option>
              <option value="20-25 min">20 To 25 minutes</option>
              <option value="25-30 min">25 To 30 minutes</option>
              <option value=">30 min">More Than 30 minutes</option>
            </select>
          </div>
          {isLoading ? (
            <div
              className="p-2 flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="sr-only">Loading table...</span>
            </div>
          ) : filteredOutliers.length === 0 ? (
            <div className="p-2 text-center text-muted-foreground bg-muted text-xs rounded-md">
              No extreme long evaluations found for selected duration
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Interaction
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Agent
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Call
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Duration
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-muted divide-y divide-gray-200">
                  {filteredOutliers.map((item, index) => (
                    <tr key={index} className="hover:bg-muted">
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                        {item.interaction_id}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-muted-foreground">
                        {item.AgentName}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-muted-foreground">
                        {item.call_id}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-muted-foreground">
                        <span className="px-1 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                          {Math.round(item.duration_sec / 60)} min
                        </span>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(item.evaluation_date).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

