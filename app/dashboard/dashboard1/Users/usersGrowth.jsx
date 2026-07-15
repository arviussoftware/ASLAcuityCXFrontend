"use client";
import React, { useEffect, useState } from "react";
import { LineChart } from "lucide-react";
import ApexCharts from "react-apexcharts";
import CryptoJS from "crypto-js";

const UserGrowthChart = () => {
  const [dateFilterType, setDateFilterType] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    let isMounted = true;
    const fetchUserGrowthData = async (filter) => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
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
        if (isMounted) {
          setError("User ID missing. Please log in again.");
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/dashBoard1/usersM/getUserGrowth?dateFilterType=${filter}`,
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
        const result = await res.json();
        if (!isMounted) return;
        if (res.ok && result?.data?.length > 0) {
          const labels = result.data.map((entry) => entry.DateLabel);
          const data = result.data.map((entry) => entry.NewUserCount);

          setCategories(labels);
          setChartData(data);
          setHasData(true);
        } else {
          setCategories([]);
          setChartData([]);
          setHasData(false);
          setError("No data available for the selected filter.");
        }
      } catch (err) {
        if (isMounted) {
          setError(`Error fetching data: ${err.message}`);
          setHasData(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchUserGrowthData(dateFilterType);

    return () => {
      isMounted = false; // Cleanup function
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilterType]);

  const options = {
    chart: {
      type: "line",
      height: "100%",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        animateGradually: { enabled: true, delay: 150 },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => (val > 0 ? val : ""),
      style: {
        fontSize: "12px",
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: categories,
      labels: {
        rotate: -45,
        style: {
          fontSize: "12px",
          colors: Array(categories.length).fill("hsl(var(--muted-foreground))"),
          fontFamily: "Inter, sans-serif",
        },
        formatter: function (val) {
          const date = new Date(val);
          if (isNaN(date)) return val;
          if (dateFilterType === "weekly") {
            const startOfWeek = new Date(
              date.setDate(date.getDate() - date.getDay())
            );
            return startOfWeek.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          } else if (dateFilterType === "monthly") {
            return date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          }
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: "12px",
          colors: "hsl(var(--muted-foreground))",
          fontFamily: "Inter, sans-serif",
        },
      },
      title: {
        text: "New Users",
        style: {
          fontSize: "14px",
          color: "hsl(var(--foreground))",
          fontWeight: 600,
        },
      },
    },
    tooltip: {
      enabled: true,
      theme: "light",
      y: {
        formatter: (val) => `${val} new users`,
      },
    },
    colors: ["hsl(var(--primary))"],
    grid: {
      borderColor: "hsl(var(--border))",
      strokeDashArray: 4,
      padding: { top: 20, bottom: 20, left: 10, right: 10 },
    },

    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 220 },
          dataLabels: { style: { fontSize: "10px" } },
          xaxis: { labels: { style: { fontSize: "10px" } } },
          yaxis: { labels: { style: { fontSize: "10px" } } },
        },
      },
      {
        breakpoint: 1024, // tablets and below
        options: {
          chart: { height: 240 },
          dataLabels: { style: { fontSize: "11px" } },
          xaxis: { labels: { style: { fontSize: "11px" } } },
          yaxis: { labels: { style: { fontSize: "11px" } } },
        },
      },
      {
        breakpoint: 768, // mobile devices
        options: {
          chart: { height: 200 },
          dataLabels: { style: { fontSize: "10px" } },
          xaxis: { labels: { style: { fontSize: "10px", rotate: -35 } } },
          yaxis: { labels: { style: { fontSize: "10px" } } },
        },
      },
      {
        breakpoint: 480, // very small screens
        options: {
          chart: { height: 180 },
          dataLabels: { style: { fontSize: "9px" } },
          xaxis: { labels: { style: { fontSize: "9px", rotate: -45 } } },
          yaxis: { labels: { style: { fontSize: "9px" } } },
        },
      },
    ],
  };

  const series = [
    {
      name: "New Users",
      data: chartData,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border w-full h-full flex flex-col transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 flex-shrink-0">
        <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
          <LineChart className="w-5 h-5 text-primary" />
          User Growth OverTime
        </h3>
        <select
          className="border border-border px-3 py-1.5 rounded-lg text-xs bg-muted focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all hover:bg-muted"
          value={dateFilterType}
          onChange={(e) => setDateFilterType(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="flex-1 min-h-0 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse bg-secondary rounded-lg w-full h-full min-h-[200px]" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {error || "No data available for the selected period."}
          </div>
        ) : (
          <ApexCharts
            options={options}
            series={series}
            type="line"
            height="100%"
          />
        )}
      </div>
    </div>
  );
};

export default UserGrowthChart;

