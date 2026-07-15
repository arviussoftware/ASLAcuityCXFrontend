 "use client"
import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CryptoJS from "crypto-js";
import { BarChart } from "lucide-react";

const STATUS_COLORS = {
  Active:  'hsl(var(--primary))',   // Green
  Inactive: "#dc3545", // Red
};

const UserStatusChart = () => {
  const [data, setData] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [chartType, setChartType] = useState("donut");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  

  useEffect(() => {
    const fetchUserStatus = async () => {
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
        setMessage("User ID not found.");
        return;
      }
  
      try {
        const res = await fetch("/api/dashBoard1/usersM/userStatus", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
           
            loggedInUserId: userId,
          },
          cache: "no-store",
        });
  
        const result = await res.json();
  
        if (res.ok && result?.data) {
          const chartData = result.data.map((item) => ({
            name: item.Status,
            value: item.Count,
            color: STATUS_COLORS[item.Status] || "#333",
          }));
  
          setData(chartData);
          setTotalUsers(chartData.reduce((sum, entry) => sum + entry.value, 0));
          setMessage(result.message);
        } else {
          setMessage(result.message || "No chart data found.");
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setMessage("Something went wrong!");
      } finally {
        setLoading(false);
      }
    };
    fetchUserStatus();
  }, []);

  const calculatePercentage = (value) => {
    if (!totalUsers || totalUsers === 0) return 0;
    return ((value / totalUsers) * 100).toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg shadow-md border border-border w-full max-w-[400px] flex flex-col hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-primary" />
          User Status Overview
        </h2>
        <select
          className="border border-border px-3 py-1.5 rounded-lg text-sm bg-muted focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all hover:bg-muted"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          <option value="donut">Donut</option>
          <option value="pie">Pie</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10 animate-pulse">
          Loading chart...
        </div>
      ) : data.length > 0 ? (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <ResponsiveContainer width="100%" height={250} className="md:w-2/3">
            <PieChart>
              <Pie
                data={data}
                cx="40%"
                cy="40%"
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
                          <span className="font-medium text-foreground">{name}</span>
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
          </ResponsiveContainer>

          <div className="w-full md:w-1/3 flex flex-col gap-2 text-sm max-h-[200px] overflow-y-auto pr-1">
  {data.map((entry, index) => (
    <div
      key={index}
      className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded transition"
    >
      <span
        className="w-3 h-3 rounded-full inline-block flex-shrink-0"
        style={{ backgroundColor: entry.color }}
      ></span>
      <span className="text-foreground font-medium truncate w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
        {entry.name}
      </span>
      <span className="ml-auto text-muted-foreground flex-shrink-0">{entry.value}</span>
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

export default UserStatusChart;

