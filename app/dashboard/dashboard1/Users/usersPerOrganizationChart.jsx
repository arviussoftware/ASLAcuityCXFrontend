"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import CryptoJS from "crypto-js";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, BarChart2, List, SortAsc, SortDesc } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--secondary))"];

const UsersPerOrganizationChart = () => {
  const [orgData, setOrgData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("bar");
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchData = async () => {
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
        setError("User ID not found.");
        return;
      }

      try {
        const res = await fetch(
          "/api/dashBoard1/usersM/getUsersPerOrganization",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userId,
            },
            cache: "no-store",
          }
        );

        const result = await res.json();
        if (res.ok && result?.data) {
          const formatted = result.data.map((item) => ({
            organization:
              item.OrganizationName?.trim() || "Unknown Organization",
            userCount: item.UserCount || 0,
          }));
          setOrgData(formatted);
          setError(null);
        } else {
          setError(result.message || "Failed to fetch organization data.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Network error. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedOrgData = [...orgData].sort((a, b) =>
    sortOrder === "desc" ? b.userCount - a.userCount : a.userCount - b.userCount
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          className="bg-gray-900 text-white p-2 rounded-lg shadow-lg border border-gray-700 text-xs"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className="font-semibold">{label}</p>
          <p className="text-blue-300">{payload[0].value} users</p>
        </motion.div>
      );
    }
    return null;
  };

  const renderChart = () => (
    <ResponsiveContainer
      width="100%"
      height={Math.max(sortedOrgData.length * 25, 150)}
    >
      <BarChart
        data={sortedOrgData}
        layout="vertical"
        margin={{ top: 6, right: 20, left: 20, bottom: 6 }}
      >
        <XAxis type="number" hide axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="organization"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          tickFormatter={(val) =>
            val.length > 15 ? `${val.slice(0, 15)}...` : val
          }
          axisLine={false}
          tickLine={false}
          width={150}
          interval={0}
        />
        <RechartTooltip
          content={<CustomTooltip />}
          cursor={{ fill: "hsl(var(--border))" }}
        />
        <Bar
          dataKey="userCount"
          radius={[0, 6, 6, 0]}
          barSize={10}
          animationDuration={1000}
        >
          {sortedOrgData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              style={{
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateX(5px)";
                e.target.style.opacity = "0.9";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateX(0)";
                e.target.style.opacity = "1";
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderList = () => (
    <div className="space-y-2">
      {sortedOrgData.map((item, idx) => (
        <motion.div
          key={idx}
          className="flex justify-between items-center p-2 bg-muted rounded-lg border border-border shadow-sm hover:shadow-md transition-all"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.3 }}
        >
          <div className="flex items-center">
            <div
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-foreground font-medium text-xs">
              {item.organization.length > 25
                ? `${item.organization.slice(0, 25)}...`
                : item.organization}
            </span>
          </div>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
            {item.userCount} users
          </span>
        </motion.div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton height={25} count={5} borderRadius={6} />
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">
          {error}
        </div>
      );
    }

    if (sortedOrgData.length === 0) {
      return (
        <div className="bg-muted border border-border text-muted-foreground p-2 rounded-lg text-xs text-center">
          No organization data available
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
          {viewMode === "bar" ? renderChart() : renderList()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <motion.div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-border shadow-lg w-full h-full flex flex-col hover:shadow-xl transition-all">
      {/* Header Section - Fixed */}
      <div className="flex items-center justify-between mb-3 ">
        <div className="flex items-center">
          <div className="bg-blue-50 p-1.5 rounded-xl mr-2">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2 widget-drag-handle cursor-move select-none">
              Users per Organization
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribution across organizations
            </p>
          </div>
        </div>
        <div className="flex space-x-1 bg-muted px-1 py-1 rounded-md">
          <button
            onClick={() => setViewMode("bar")}
            className={`p-1 rounded-lg transition-all ${
              viewMode === "bar" ? "bg-card shadow-md" : "hover:bg-muted"
            }`}
            aria-label="Chart view"
          >
            <BarChart2
              className={`w-4 h-4 ${
                viewMode === "bar" ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1 rounded-lg transition-all ${
              viewMode === "list" ? "bg-card shadow-md" : "hover:bg-muted"
            }`}
            aria-label="List view"
          >
            <List
              className={`w-4 h-4 ${
                viewMode === "list" ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="p-1 rounded-lg hover:bg-muted transition-all"
            aria-label="Sort order"
          >
            {sortOrder === "desc" ? (
              <SortDesc className="w-4 h-4 text-muted-foreground" />
            ) : (
              <SortAsc className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default UsersPerOrganizationChart;

