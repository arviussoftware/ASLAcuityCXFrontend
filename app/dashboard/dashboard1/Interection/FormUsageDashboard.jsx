"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, BarChart,
  Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend
} from "recharts";
import CryptoJS from "crypto-js";

const COLORS = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777", "#0D9488", "#E11D48", "#9333EA", "hsl(var(--primary))"];

export default function FormUsageDashboard() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("donut");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'UsageCount', direction: 'desc' });
  const [summaryStats, setSummaryStats] = useState({
    totalCalls: 0,
    evaluatedCalls: 0,
    avgEvalTime: 0,
    avgEvalScore: 0,
  });
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchFormsData = async () => {
      const encryptedUserData = sessionStorage.getItem("user");
      let userRole = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userRole = user?.userId || null;
        } catch {
          setError("Failed to decrypt user data.");
        }
      }

      if (!userRole) {
        setError("User ID missing — please login again.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/dashBoard1/interactionS/formUsageStatus`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            loggedInUserId: userRole,
          },
          cache: "no-store",
        });

        const result = await res.json();
        if (res.ok) {
          const fetchedData = result.data || [];
          setData(fetchedData);

          const totalCalls = fetchedData.reduce((sum, item) => sum + (item.UsageCount || 0), 0);
          const evaluatedCalls = fetchedData.length;
          const avgEvalTime = fetchedData.length
            ? fetchedData.reduce((sum, item) => sum + (parseFloat(item.AvgEvalTime) || 0), 0) / fetchedData.length
            : 0;
          const avgEvalScore = fetchedData.length
            ? fetchedData.reduce((sum, item) => sum + (parseFloat(item.AvgEvalScore) || 0), 0) / fetchedData.length
            : 0;

          setSummaryStats({
            totalCalls: totalCalls.toLocaleString(),
            evaluatedCalls,
            avgEvalTime: avgEvalTime.toFixed(2),
            avgEvalScore: avgEvalScore.toFixed(2),
          });
        } else {
          setError(result.message || "Failed to fetch data.");
        }
      } catch {
        setError("Network error — try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTopFormsData = (data, topN = 8) => {
    if (!data || data.length === 0) return [];

    const sorted = [...data].sort((a, b) => b.UsageCount - a.UsageCount);
    const top = sorted.slice(0, topN);
    const others = sorted.slice(topN);
    const othersCount = others.reduce((acc, curr) => acc + curr.UsageCount, 0);
    if (othersCount > 0) top.push({ FormName: "Others", UsageCount: othersCount });
    return top;
  };

  const chartData = getTopFormsData(data);

  const sortedData = [...data].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-card rounded-lg shadow-sm p-3">
        <div className="flex items-center gap-2 text-destructive bg-red-50 px-3 py-2 rounded-md max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-3 px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-md border border-border flex flex-col hover:shadow-lg transition-all duration-300 h-[390px] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Form Usage Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Form interactions overview</p>
        </div>
        <div className="relative">
          <select
            className="appearance-none bg-card border border-border rounded-md pl-3 pr-8 px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="donut">Donut Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="table">Table View</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center text-muted-foreground py-10 animate-pulse">
          Loading chart...
        </div>
      ) : data.length > 0 ? (
      <div>
        {(chartType === "pie" || chartType === "donut") && (
          <div className="w-full h-[290px]">
            <ResponsiveContainer width="100%" height= "100%" >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="UsageCount"
                  nameKey="FormName"
                  cx="50%"
                  cy="50%"
                  innerRadius={chartType === "donut" ? 60 : 0}
                  outerRadius={100}
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [`${value} uses`, props.payload.FormName]}
                  contentStyle={{
                    background: "white",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    padding: "8px",
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "8px",
                  }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === "bar" && (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
                barSize={30}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="FormName"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  formatter={(value) => [`${value} uses`, 'Usage Count']}
                  contentStyle={{
                    background: "white",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    padding: "8px",
                  }}
                />
                <Bar
                  dataKey="UsageCount"
                  name="Usage Count"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
 {chartType === "table" && (
  <div className="flex-1 w-full">
    <div className="overflow-x-auto rounded-lg border border-border shadow-sm bg-card">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-card">
          <tr>
            {[
              { key: "FormName", label: "Form Name" },
              { key: "UsageCount", label: "Usage Count" },
              { key: "AvgEvalTime", label: "Avg Time" },
              { key: "EvaluatedBy", label: "Evaluator" },
            ].map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition"
                onClick={() => requestSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="text-muted-foreground">
                      {sortConfig.direction === "asc" ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-gray-200">
          {paginatedData.length > 0 ? (
            paginatedData.map((form, i) => (
              <tr key={i} className="hover:bg-muted transition">
                <td className="px-4 py-2 text-gray-900 font-medium">{form.FormName}</td>
                <td className="px-4 py-2 text-foreground">{form.UsageCount}</td>
                <td className="px-4 py-2 text-foreground">{form.AvgEvalTime || "N/A"}</td>
                <td className="px-4 py-2 text-foreground">{form.EvaluatedBy || "N/A"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-4 py-4 text-center text-muted-foreground">
                No form usage data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {sortedData.length > 0 && (
      <div className="flex flex-wrap justify-between items-center mt-4 px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} forms
          </span>
        </div>

        <div className="flex items-center gap-1 mt-2 sm:mt-0">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`p-1 rounded ${
              currentPage === 1 ? "text-muted-foreground cursor-not-allowed" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Numbers */}
          {[...Array(totalPages)].map((_, idx) => {
            const page = idx + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2 py-1 rounded ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`p-1 rounded ${
              currentPage === totalPages ? "text-muted-foreground cursor-not-allowed" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )}
  </div>
)}


      </div>
      ) : (
        <p className="text-center text-red-500 font-medium"></p>
      )}
    </div>
  );
}


 
