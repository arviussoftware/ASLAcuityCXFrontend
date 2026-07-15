"use client";
import React, { useEffect, useState } from "react";
import ApexCharts from "react-apexcharts";
import CryptoJS from "crypto-js";
import { LineChart } from "lucide-react";

const FormTrendChart = () => {
  const [dateFilterType, setDateFilterType] = useState("daily");
  const [chartData, setChartData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  useEffect(() => {
    const fetchTrendData = async (filter) => {
      setLoading(true);
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
        console.warn("User ID missing");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/dashBoard1/Form/formTrend?dateFilterType=${filter}`,
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

        if (res.ok && result.data?.length > 0) {
          const labels = result.data.map((entry) =>
            filter === "daily"
              ? entry.DateLabel
              : filter === "weekly"
              ? entry.WeekLabel
              : entry.MonthLabel
          );

          const data = result.data.map((entry) => entry.FormCount);

          setCategories(labels);
          setChartData(data);
        } else {
          setCategories([]);
          setChartData([]);
        }
      } catch (err) {
        console.error("Error fetching trend data:", err);
        setCategories([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData(dateFilterType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilterType]);

  const options = {
    chart: {
      type: "bar",
      height: 250, // Reduced height for a smaller chart
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 800 },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
        borderRadius: 4, // Slightly smaller radius
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: "10px",
        colors: ["hsl(var(--foreground))"],
        fontWeight: "600",
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: { fontSize: "10px", colors: "hsl(var(--muted-foreground))" },
        rotate: -45,
        formatter: function (val) {
          const date = new Date(val);
          if (isNaN(date)) return val;
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        },
      },
      axisTicks: { show: false },
      crosshairs: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "10px", colors: "hsl(var(--muted-foreground))" }, // Smaller font
        formatter: (val) => `${Math.floor(val)}`,
      },
      tickAmount: 3, // Fewer ticks for smaller chart
      title: {
        text: "Forms Created",
        style: { fontSize: "12px", color: "hsl(var(--foreground))", fontWeight: "600" },
      },
    },
    grid: {
      borderColor: "hsl(var(--border))",
      strokeDashArray: 4,
      padding: { top: 10, bottom: 10 }, // Reduced padding
    },
    colors: ["hsl(var(--primary))"],
    tooltip: {
      enabled: true,
      y: { formatter: (val) => `${val} forms` },
      style: { fontSize: "10px" }, // Smaller tooltip font
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 200 }, // Even smaller on mobile
          dataLabels: { style: { fontSize: "8px" } },
          xaxis: { labels: { style: { fontSize: "8px" } } },
          yaxis: { labels: { style: { fontSize: "8px" } } },
        },
      },
    ],
  };

  const series = [
    {
      name: "Forms Created",
      data: chartData,
    },
  ];

  return (
    // <div className="bg-card p-4 rounded-xl shadow-md border border-border w-full">
    // <div className="bg-card p-4 rounded-xl shadow-md border border-border w-full max-w-[500px] h-[350px]">
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border w-full max-w-[650px] flex flex-col hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary" />
          Forms Created Over Time
        </h3>
        <select
          className="border border-border px-3 py-1.5 rounded-lg text-sm bg-muted focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all hover:bg-muted"
          value={dateFilterType}
          onChange={(e) => setDateFilterType(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {loading ? (
        <div className="h-[250px] flex items-center justify-center">
          <div className="animate-pulse bg-secondary w-full h-full rounded-lg" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground text-base">
          No data available
        </div>
      ) : (
        <div className="w-full h-[250px]">
          <ApexCharts
            options={options}
            series={series}
            type="bar"
            height={250}
            width="100%"
          />
        </div>
      )}
    </div>
  );
};

export default FormTrendChart;

