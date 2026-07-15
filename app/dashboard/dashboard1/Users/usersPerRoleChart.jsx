"use client";
import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import CryptoJS from "crypto-js";
import { Loader2, BarChart as BarChartIcon } from "lucide-react";

const ROLE_COLORS = [
  "hsl(var(--primary))",
  "#28a745",
  "#ffc107",
  "#dc3545",
  "#6f42c1",
  "#20c997",
  "#fd7e14",
];

const UsersPerRoleChart = () => {
  const [data, setData] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [chartType, setChartType] = useState("donut");
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchChartData = async () => {
      let userId = null;
      const encryptedUserData = sessionStorage.getItem("user");
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/dashBoard1/usersM/getUsersPerRole", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userId,
          },
          cache: "no-store",
        });

        const result = await response.json();
        if (response.ok && result?.data?.length > 0) {
          const chartData = result.data.map((item, index) => ({
            name: item.Role,
            value: item.UserCount,
            color: ROLE_COLORS[index % ROLE_COLORS.length],
          }));
          setData(chartData);
          setTotalUsers(chartData.reduce((sum, entry) => sum + entry.value, 0));
          setMessage(result.message);
        } else {
          setMessage(result.message || "No data found, showing mock data.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setMessage("Error fetching chart data, showing mock data.");
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculatePercentage = (value) => {
    if (!totalUsers || totalUsers === 0) return 0;
    return ((value / totalUsers) * 100).toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border w-full h-full flex flex-col hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
          <BarChartIcon className="w-5 h-5 text-primary" />
          Users Per Role
        </h2>
        <select
          className="border border-border px-3 py-1.5 rounded-lg text-sm bg-muted focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all hover:bg-muted"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          <option value="donut">Donut</option>
          <option value="pie">Pie</option>
          <option value="bar">Bar</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10 animate-pulse">
          Loading chart...
        </div>
      ) : data.length > 0 ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {data.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === "donut" ? 60 : 0}
                    outerRadius={100}
                    dataKey="value"
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { name, value, color } = payload[0];
                        const percentage = calculatePercentage(value);
                        return (
                          <div className="bg-card p-2 rounded shadow-md">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ backgroundColor: color }}
                              ></span>
                              <span className="font-medium text-foreground">
                                {name}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {value} ({percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    wrapperStyle={{ outline: "none" }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend Section — Sirf Pie/Donut ke liye */}
          {chartType !== "bar" && (
            <div
              className="
  w-full 
  lg:w-64 
  lg:min-w-[240px] 
  flex flex-col 
  gap-2 
  overflow-y-auto 
  pr-2
"
            >
              {data.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 px-2 py-1.5 rounded hover:bg-muted transition group cursor-default"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span
                      className="text-sm text-foreground truncate font-medium"
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-red-500 font-medium">{message}</p>
      )}
    </div>
  );
};

export default UsersPerRoleChart;

