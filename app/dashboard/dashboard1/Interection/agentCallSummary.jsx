"use client";
import { useState, useEffect, useMemo } from "react";
import CryptoJS from "crypto-js";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  List,
  SortAsc,
  SortDesc,
  User,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AgentCallSummary() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("chart");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedMetric, setSelectedMetric] = useState("Calls");
  const [currentPage, setCurrentPage] = useState(1);
  const agentsPerPage = 20;

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  const AES_SECRET_KEY = process.env.NEXT_PUBLIC_AES_SECRET_KEY;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--secondary))"];

  const fetchAgentCallSummary = async () => {
    setIsLoading(true);
    let userRole = null;
    const encryptedUserData = sessionStorage.getItem("user");

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(
          encryptedUserData,
          AES_SECRET_KEY || ""
        );
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userRole = user?.userId || null;
      } catch (error) {
        console.error("Error decrypting user data:", error);
        setError("Failed to authenticate user");
      }
    }

    if (!userRole) {
      setError("User ID missing - please login again");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/dashBoard1/interactionS/agentCallSummary`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();
      if (response.ok) {
        setData(result.data);
      } else {
        setError(result.message || "Failed to fetch data");
        console.error("Failed to fetch call metrics:", result.message);
      }
    } catch (err) {
      setError("Network error - failed to fetch data");
      console.error("Error fetching call metrics data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentCallSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedData = useMemo(
    () =>
      data
        ? [...data]
            .filter((agent) => agent.Calls > 0 || agent.Evaluated > 0)
            .sort((a, b) =>
              sortOrder === "desc"
                ? b[selectedMetric] - a[selectedMetric]
                : a[selectedMetric] - b[selectedMetric]
            )
        : [],
    [data, sortOrder, selectedMetric]
  );

  const totalPages = Math.ceil(sortedData.length / agentsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * agentsPerPage,
    currentPage * agentsPerPage
  );

  const chartData = {
    labels: paginatedData.map((agent) => agent.AgentName) || [],
    datasets: [
      {
        label: "Calls",
        data: paginatedData.map((agent) => agent.Calls) || [],
        backgroundColor: COLORS[0],
        borderColor: COLORS[0],
        borderWidth: 2,
        borderRadius: 3,
        barThickness: 10,
        hidden: selectedMetric !== "Calls" && selectedMetric !== "All",
      },
      {
        label: "Evaluated",
        data: paginatedData.map((agent) => agent.Evaluated) || [],
        backgroundColor: COLORS[1],
        borderColor: COLORS[1],
        borderWidth: 2,
        borderRadius: 3,
        barThickness: 15,
        hidden: selectedMetric !== "Evaluated" && selectedMetric !== "All",
      },
      {
        label: "Avg. Eval Time",
        data: paginatedData.map((agent) => agent["Avg. Eval Time"]) || [],
        backgroundColor: COLORS[2],
        borderColor: COLORS[2],
        borderWidth: 2,
        borderRadius: 3,
        barThickness: 15,
        hidden: selectedMetric !== "Avg. Eval Time" && selectedMetric !== "All",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: selectedMetric === "All" },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 12, family: "Inter, sans-serif" },
        bodyFont: { size: 11, family: "Inter, sans-serif" },
        padding: 8,
        cornerRadius: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, family: "Inter, sans-serif" },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          font: { size: 11, family: "Inter, sans-serif" },
          stepSize: selectedMetric === "Avg. Eval Time" ? 5 : 10,
        },
        title: {
          display: true,
          text: selectedMetric === "Avg. Eval Time" ? "Minutes" : "Count",
          font: { size: 12, family: "Inter, sans-serif" },
        },
      },
    },
  };

  const renderPagination = () => {
    const start = (currentPage - 1) * agentsPerPage + 1;
    const end = Math.min(currentPage * agentsPerPage, sortedData.length);
    const total = sortedData.length;

    // Show up to 5 page numbers centered around the current page
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return (
      <div className="flex items-center justify-between mt-3">
        {/* Showing Text (Left-Aligned) */}
        <span className="text-sm text-muted-foreground">
          Showing {start} to {end} of {total} agents
        </span>

        {/* Pagination Buttons (Right-Aligned) */}
        <div className="flex items-center space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            className="text-sm p-1 border rounded disabled:opacity-30 hover:bg-muted transition-all"
            aria-label="Go to first page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="text-sm p-1 border rounded disabled:opacity-30 hover:bg-muted transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {[...Array(endPage - startPage + 1)].map((_, idx) => {
            const pageNum = startPage + idx;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`text-sm px-2 py-1 border rounded ${
                  currentPage === pageNum
                    ? "bg-blue-500 text-white"
                    : "hover:bg-muted"
                } transition-all`}
                aria-label={`Go to page ${pageNum}`}
                aria-current={currentPage === pageNum ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="text-sm p-1 border rounded disabled:opacity-30 hover:bg-muted transition-all"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="text-sm p-1 border rounded disabled:opacity-30 hover:bg-muted transition-all"
            aria-label="Go to last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderChart = () => (
    <div className="flex flex-col h-full">
      {/* Chart Scroll Area */}
      <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div
          style={{
            width: `${paginatedData.length * 30}px`,
            minWidth: "100%",
            height: "230px",
            textAlign: "left",
          }}
        >
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Pagination always visible */}
      <div className="mt-3 shrink-0">{renderPagination()}</div>
    </div>
  );

  const renderList = () => (
    // <div className="space-y-2 max-h-[270px] overflow-y-auto pr-2">
    <div className="space-y-2 overflow-y-auto pr-2">
      {paginatedData.map((agent, idx) => (
        <motion.div
          key={idx}
          className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
        >
          <div className="flex items-center">
            <div
              className="w-2 h-2 rounded-full mr-3"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-foreground font-medium text-sm relative group">
              {agent.AgentName.length > 25
                ? `${agent.AgentName.slice(0, 25)}...`
                : agent.AgentName}
              {agent.AgentName.length > 25 && (
                <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 z-10 -top-8 left-0">
                  {agent.AgentName}
                </span>
              )}
            </span>
          </div>
          <span className="bg-blue-50 text-primary px-3 py-1 rounded-full text-sm font-semibold">
            {selectedMetric === "All"
              ? `${agent.Calls} Calls | ${agent.Evaluated} Evaluated`
              : selectedMetric === "Avg. Eval Time"
              ? `${agent["Avg. Eval Time"]} secs`
              : `${agent[selectedMetric]} ${
                  selectedMetric !== "All" ? "calls" : ""
                }`}
          </span>
        </motion.div>
      ))}
      {renderPagination()}
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return <Skeleton height={30} count={5} borderRadius={8} />;
    }
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          {error}
          {error.includes("Network error") && (
            <button
              onClick={fetchAgentCallSummary}
              className="ml-2 text-primary underline hover:text-blue-800"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    if (!data || data.length === 0 || sortedData.length === 0) {
      return (
        <div className="bg-muted border border-border text-muted-foreground p-4 rounded-lg text-sm text-center">
          No agents with calls or evaluations available
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {viewMode === "chart" ? renderChart() : renderList()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-2xl border border-border shadow-lg w-full h-full hover:shadow-xl transition-all flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-blue-50 p-2 rounded-lg mr-3">
            <User
              className="w-5 h-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
              Agent Call Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              Performance metrics by agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMetric}
            onChange={(e) => {
              setSelectedMetric(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Select metric to display"
            className="appearance-none bg-card border border-border rounded-lg px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          >
            <option value="All">All Metrics</option>
            <option value="Calls">Calls</option>
            <option value="Evaluated">Evaluated</option>
            <option value="Avg. Eval Time">Avg. Eval Time</option>
          </select>
          <div className="flex space-x-1 bg-muted px-1 py-1 rounded-md">
            <button
              onClick={() => setViewMode("chart")}
              className={`p-1 rounded-lg transition-all hover:scale-105 ${
                viewMode === "chart" ? "bg-card shadow-md" : "hover:bg-muted"
              }`}
              aria-label="Chart view"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all hover:scale-105 ${
                viewMode === "list" ? "bg-card shadow-md" : "hover:bg-muted"
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className="p-1 rounded-lg hover:bg-muted hover:scale-105 transition-all"
              aria-label="Sort order"
            >
              {sortOrder === "desc" ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 mt-2 overflow-auto pb-6">{renderContent()}</div>
    </motion.div>
  );
}

