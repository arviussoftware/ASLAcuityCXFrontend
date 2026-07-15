// app/dashboard/dashboard1/Interaction/CallVolumeTrends.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { LineChart } from "lucide-react";
import ApexCharts from "react-apexcharts";
import CryptoJS from "crypto-js";

const CallVolumeTrends = () => {
  const [filter, setFilter] = useState("Daily");
  const [chartData, setChartData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const [fromDate, setFromDate] = useState(
    () => threeMonthsAgo.toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(() => today.toISOString().split("T")[0]);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  const FILTERS = ["Today", "Daily", "Weekly", "Monthly", "Custom"];

  const fetchCallVolumeData = useCallback(async () => {
    setLoading(true);
    setError(null);

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

    if (!userRole) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    const today = new Date();
    let from = "",
      to = "",
      groupBy = "Daily";

    switch (filter) {
      case "Today":
        groupBy = "Today";
        break;
      case "Daily":
        groupBy = "Daily";
        break;
      case "Weekly":
        groupBy = "Weekly";
        break;
      case "Monthly":
        groupBy = "Monthly";
        break;
      case "Custom":
        if (!fromDate || !toDate) {
          setError("Please select both dates.");
          setLoading(false);
          return;
        }
        from = fromDate;
        to = toDate;
        groupBy = "Daily";
        break;
    }

    try {
      const res = await fetch(
        `/api/dashBoard1/interactionS/getCallVolumeTrends?fromDate=${from}&toDate=${to}&groupBy=${groupBy}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            timezone,
            loggedInUserId: userRole,
          },
          cache: "no-store",
        },
      );

      const result = await res.json();

      if (res.ok && result?.data?.length > 0) {
        const labels = result.data.map((entry) => entry.GroupedDate);
        const data = result.data.map((entry) => entry.CallCount);
        setCategories(labels);
        setChartData(data);
      } else {
        setCategories([]);
        setChartData([]);
        setError(result?.outputmsg || "No data available.");
      }
    } catch (err) {
      setError("No data available.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, fromDate, toDate]);

  useEffect(() => {
    fetchCallVolumeData();
  }, [fetchCallVolumeData]);

  const handleRetry = () => {
    setError(null);
    fetchCallVolumeData();
  };

  const options = {
    chart: {
      type: "line",
      height: 300,
      toolbar: { show: true, tools: { download: true, zoom: false } },
      animations: { enabled: true, easing: "easeinout", speed: 600 },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => (val > 0 ? val : ""),
      style: {
        fontSize: "10px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
      },
    },
    stroke: { curve: "smooth", width: 2.5 },
    xaxis: {
      categories: categories,
      labels: {
        rotate: -45,
        style: {
          fontSize: "11px",
          fontFamily: "Inter, sans-serif",
          colors: "hsl(var(--muted-foreground))",
        },
      },
      axisBorder: { show: true, color: "hsl(var(--border))" },
      axisTicks: { show: true, color: "hsl(var(--border))" },
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      labels: {
        style: {
          fontSize: "11px",
          fontFamily: "Inter, sans-serif",
          colors: "hsl(var(--muted-foreground))",
        },
        formatter: (val) => Math.round(val),
      },
      title: {
        text: "Call Count",
        style: {
          fontSize: "12px",
          fontFamily: "Inter, sans-serif",
          color: "hsl(var(--foreground))",
          fontWeight: 600,
        },
      },
    },
    tooltip: {
      theme: "light",
      y: { formatter: (val) => `${val} calls` },
      style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
    },
    colors: ["hsl(var(--primary))"],
    grid: {
      borderColor: "hsl(var(--muted))",
      strokeDashArray: 3,
      padding: { top: 10, bottom: 10, left: 15, right: 15 },
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 200 },
          dataLabels: { style: { fontSize: "9px" } },
          xaxis: { labels: { style: { fontSize: "9px" } } },
          yaxis: { labels: { style: { fontSize: "9px" } } },
        },
      },
    ],
  };

  const series = [{ name: "Call Count", data: chartData }];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-sm border border-border w-full h-full flex flex-col transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
            Call Volume Trends
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border border-border px-2 py-1 rounded-md text-sm focus:ring-1 focus:ring-ring focus:border-ring"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Select time period"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {filter === "Custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                className="border border-border px-2 py-1 rounded-md text-sm focus:ring-1 focus:ring-ring focus:border-ring"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
              />
              <input
                type="date"
                className="border border-border px-2 py-1 rounded-md text-sm focus:ring-1 focus:ring-ring focus:border-ring"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 text-center text-muted-foreground">
          <p className="text-xs mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-primary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
          No data available for the selected period.
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ApexCharts
            options={options}
            series={series}
            type="line"
            height="100%"
          />
        </div>
      )}
    </div>
  );
};

export default CallVolumeTrends;

