"use client";
import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker"; // Import DatePicker
import "react-datepicker/dist/react-datepicker.css"; // Import DatePicker CSS
import "@/components/Styles/AvgScoreByAgent.css";
import { Line } from "react-chartjs-2"; // For line chart
import "chart.js/auto";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { BsGraphUp } from "react-icons/bs";
import { Tooltip } from "react-tooltip";
import { notFound, useSearchParams } from "next/navigation";
import CryptoJS from 'crypto-js';
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    topPerformance: null,
    bottomPerformance: null,
  });
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "evaluation"
  }`;
  const [filter, setFilter] = useState("Today"); // Default filter
  const [startDate, setStartDate] = useState(null); // Start date for custom filter
  const [endDate, setEndDate] = useState(null); // End date for custom filter
  const [graphData, setGraphData] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);


  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 10, 
            orgId: sessionStorage.getItem("selectedOrgId") || "", // Users module
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);

      } catch (err) {
        console.error("Error fetching privileges:", err);
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);
  // Ref for the graph container
  const graphRef = useRef(null);

  const toIST = (date) => {
    if (!date) return null;
    const istDate = new Date(date);
    istDate.setHours(istDate.getHours() + 5);
    istDate.setMinutes(istDate.getMinutes() + 30);
    return istDate.toISOString().split("T")[0]; // Keep only "YYYY-MM-DD"
  };

  useEffect(() => {
    const fetchData = async (agentid = null) => {
      setLoading(true);
      setGraphData([]); // Reset graph data when changing the filter or date
      setSelectedAgentId(null); // Reset selected agent ID
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }
      try {

        const StartDate = toIST(startDate);
        const EndDate = toIST(endDate);
        const body =
          filter === "Custom"
            ? { filter, StartDate, EndDate, agentid }
            : { filter, agentid };

        const response = await fetch("/api/reports/AvgScoreByAgent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            orgIds: getSelectedOrgIdsHeader(),
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        if (result.success) {
          setData(result.data);

          if (result.data[0] && result.data[1]) {
            setPerformanceData({
              topPerformance: result.data[0][0],
              bottomPerformance: result.data[1][0],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (filter !== "Custom" || (startDate && endDate)) {
      fetchData();
    }
  }, [filter, startDate, endDate]);

  // Fetch Graph Data on Row Click
  const fetchGraphData = async (agentId, AgentName) => {
    setSelectedAgentId(AgentName);
    const StartDate = toIST(startDate);
    const EndDate = toIST(endDate);
    try {
      const encryptedUserData = sessionStorage.getItem("user");
      let userId = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userId = user?.userId || null;
      }
      const response = await fetch("/api/reports/AvgScoreByAgent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          filter,
          StartDate,
          EndDate,
          agentId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setGraphData(result.data[3]); // Set graph data
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  const chartData = {
    labels: graphData.map((item) => item.FormName),
    datasets: [
      {
        label: "Total Score",
        data: graphData.map((item) => item.TotalScore), // Only show TotalScore
        borderColor: "#4CAF50",
        backgroundColor: "#4CAF50",
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "#ff6384",
      },
    ],
  };


  const options = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const data = graphData[tooltipItem.dataIndex];
            return `${data.TotalScore} / ${data.MaxScore}`; // Show TotalScore and MaxScore only
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true, // Start Y-axis at 0
        ticks: {
          stepSize: 10, // Increment Y-axis labels by 10
          callback: (value) => `${value}`, // Display labels as percentages
        },
      },
    },
  };

  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  return (
    <div className="reports-container">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={backHref} passHref>
            <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
        </div>
        <h1 className="font-semibold text-center flex-grow">
          Agent Performance Reports
        </h1>
      </div>


      {/* Flex container for filter and performance overview */}
      <div className="filter-performance-row">
        <div className="filter-section">
          <label className="filter-caption">Filter by Date</label>
          <select
            className="filter-dropdown"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="DayBeforeYesterday">Day Before Yesterday</option>
            <option value="ThisMonth">Current Month</option>
            <option value="Custom">Custom</option>
          </select>

          {filter === "Custom" && (
            <div className="custom-date-range">
              <label className="date-range-caption">Select Date Range:</label>
              <div className="date-range-picker">
                <DatePicker
                  selected={startDate || new Date()}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  // placeholderText="Start Date"
                  dateFormat="yyyy-MM-dd"
                  maxDate={new Date()}
                />
                <DatePicker
                  selected={endDate || new Date()}
                  onChange={(date) => {
                    if (startDate && date < startDate) {
                      alert("End date cannot be less than start date.");
                    } else {
                      setEndDate(date);
                    }
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  // placeholderText="End Date"
                  dateFormat="yyyy-MM-dd"
                  maxDate={new Date()}
                />
              </div>
            </div>
          )}
        </div>

        <div className="performance-card">
          <h3>Performance Overview</h3>
          <div className="performance-summary">
            <div className="top-performance">
              <div className="badge top-badge">Top Performer</div>
              {performanceData.topPerformance ? (
                <p className="performance-name">
                  {performanceData.topPerformance.AgentName}
                </p>
              ) : (
                <p>No top performance</p>
              )}
            </div>

            <div className="bottom-performance">
              <div className="badge bottom-badge">Bottom Performer</div>
              {performanceData.bottomPerformance ? (
                <p className="performance-name">
                  {performanceData.bottomPerformance.AgentName}
                </p>
              ) : (
                <p>No bottom performance</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="reports-table-container">
        {loading ? (
          <p className="loading-message">Loading...</p>
        ) : data.length > 0 ? (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Evaluated Forms</th>
                <th>Average Percent</th>
                <th>Action</th>{" "}
              </tr>
            </thead>
            <tbody>
              {data[2].map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                >
                  <td>{row.AgentName}</td>
                  <td>{row.EvaluatedForms}</td>
                  <td>{row.AveragePercent}%</td>
                  <td onClick={() => fetchGraphData(row.AgentID, row.AgentName)}>
                    <BsGraphUp data-tooltip-id="graph-tooltip" />
                    <Tooltip id="graph-tooltip" place="top" effect="solid">
                      Show Graph
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data-message">No data available</p>
        )}
      </div>
      {/* Line Chart */}
      {graphData.length > 0 && (
        <div ref={graphRef} className="graph-container">
          <h3 className="graphdata">
            Performance Graph for Agent: {selectedAgentId}
          </h3>
          <Line data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}


