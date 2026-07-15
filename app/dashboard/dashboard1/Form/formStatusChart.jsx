"use client";
import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import CryptoJS from "crypto-js";
import { BarChart as BarChartIcon } from "lucide-react";

const STATUS_COLORS = {
  Published: "#28a745", // Green
  Draft: "#ffc107", // Yellow
  Hidden: "#6c757d", // Grey
  "Submitted Form": "#fd7e14", // Orange Key quoted
  Staged: "hsl(var(--primary))", // Blue
};

const FormStatusChart = () => {
  const [data, setData] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalForms, setTotalForms] = useState(0);
  const [chartType, setChartType] = useState("donut");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchFormStatus = async () => {
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

      if (!userRole) {
        console.warn("User ID missing");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashBoard1/Form/formStatus", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
          },
          cache: "no-store",
        });

        const result = await res.json();

        if (res.ok && result?.data) {
          const chartData = Object.entries(result.data).map(
            ([status, count]) => ({
              name: status,
              value: count,
              color: STATUS_COLORS[status] || "hsl(var(--foreground))",
            })
          );
          setData(chartData);
          setTotalForms(
            Object.values(result.data).reduce((sum, count) => sum + count, 0)
          );
        } else {
          setMessage(result.message || "No data available");
        }
      } catch (err) {
        setMessage("Something went wrong!");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculatePercentage = (value) => {
    if (!totalForms || totalForms === 0) return 0;
    return ((value / totalForms) * 100).toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border w-full h-full flex flex-col hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
          <BarChartIcon className="w-5 h-5 text-primary" />
          Form Status Overview
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
        <div className="flex-1 flex flex-col md:flex-row items-stretch justify-between gap-6 min-h-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="w-full h-[250px]"
          >
            {chartType === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

          <div className="w-full md:w-1/3 flex flex-col gap-3 text-sm overflow-y-auto pr-2">
            {data.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded transition"
              >
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-foreground font-medium">{entry.name}</span>
                <span className="ml-auto text-muted-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-red-500 font-medium">{message}</p>
      )}
    </div>
  );
};

export default FormStatusChart;

