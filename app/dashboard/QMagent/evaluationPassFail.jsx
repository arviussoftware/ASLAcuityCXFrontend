// app/dashboard/QMagent/evaluationPassFail.jsx
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import CryptoJS from "crypto-js";

const COLORS = ["hsl(var(--primary))", "#dc3545"];

export default function EvaluationPassFailUI() {
  const [summary, setSummary] = useState({
    TotalEvaluations: 0,
    Passed: 0,
    Failed: 0,
  });
  const [details, setDetails] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  const AES_SECRET_KEY = process.env.NEXT_PUBLIC_AES_SECRET_KEY;

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    let userRole = null;
    const encryptedUserData = sessionStorage.getItem("user");

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(
          encryptedUserData,
          AES_SECRET_KEY || "",
        );
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

    try {
      const res = await fetch(
        "/api/dashBoard1/interactionS/getEvaluationPassFailDetails",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
          },
          cache: "no-store",
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch data");
      }

      const json = await res.json();
      setSummary(
        json.summary?.[0] || { TotalEvaluations: 0, Passed: 0, Failed: 0 },
      );
      setDetails(json.details || []);
    } catch (err) {
      setError(err.message || "Failed to fetch evaluation data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const pieChartData = useMemo(() => {
    return [
      { name: "Passed", value: summary.Passed, color: COLORS[0] },
      { name: "Failed", value: summary.Failed, color: COLORS[1] },
    ];
  }, [summary]);

  const totalPages = Math.ceil(details.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return details.slice(start, start + itemsPerPage);
  }, [details, currentPage]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-border w-full h-full flex flex-col gap-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-indigo-600 w-5 h-5" />
          <div>
            <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0 widget-drag-handle cursor-move select-none">
              Evaluation Summary
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pass/Fail analysis</p>
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
          whileTap={{ scale: 0.98 }}
          aria-label="Refresh data"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Refresh
        </motion.button>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Total",
            value: summary.TotalEvaluations,
            icon: Clock,
            color: "text-blue-700",
            bg: "bg-blue-100",
          },
          {
            label: "Passed",
            value: summary.Passed || 0,
            icon: CheckCircle,
            color: "text-green-700",
            bg: "bg-green-100",
          },
          {
            label: "Failed",
            value: summary.Failed || 0,
            icon: XCircle,
            color: "text-red-700",
            bg: "bg-red-100",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`p-2 rounded-lg border border-border ${bg}`}
          >
            <div className="flex items-center gap-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-xs text-foreground">{label}</span>
            </div>
            <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart and Table - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
        {" "}
        {/* Changed to 40-60 ratio */}
        {/* Pie Chart - 40% width */}
        <div className="lg:col-span-2 bg-muted rounded-lg border border-border flex flex-col min-h-0">
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3 h-3 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              Status
            </h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  innerRadius={50}
                  outerRadius={90}
                  // label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}`, "Count"]}
                  contentStyle={{
                    borderRadius: "6px",
                    fontSize: "12px",
                    padding: "4px 8px",
                  }}
                />
                <Legend
                  iconSize={12}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Table - 60% width */}
        <div className="lg:col-span-3 bg-muted rounded-lg p-2.5 border border-border overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-border bg-muted flex justify-between items-center">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <AlertTriangle className="w-3 h-3 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                Details
              </h3>
            </div>
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="min-w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left">Call ID</th>
                  <th className="px-2 py-1 text-left">Form</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted">
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {item.call_id}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                        {item.form_name}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs ${
                            item.EvaluationStatus === "Passed"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.EvaluationStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-4 text-center text-muted-foreground text-xs"
                    >
                      {isLoading ? (
                        "Loading..."
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-destructive font-medium text-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            No Activity found
                          </span>
                          <button
                            onClick={handleRefresh}
                            className="bg-blue-600 hover:bg-primary text-white px-2 py-1 text-xs rounded-md flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Error message - Compact */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 p-2 rounded-md border border-red-200 text-red-700 text-xs flex items-start gap-2"
        >
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p>{error}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

