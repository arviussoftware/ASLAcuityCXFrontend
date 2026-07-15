"use client";

import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { Bar } from "react-chartjs-2";
import { ChevronLeft } from "lucide-react";
import DatePicker from "react-datepicker"; // Import DatePicker
import "react-datepicker/dist/react-datepicker.css"; // Import DatePicker CSS
import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/components/Styles/AvgScoreByAgent.css";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  BarElement,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const OrgAgentReport = () => {
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Today"); // Default filter
  const [isFilterSelected, setIsFilterSelected] = useState(false); // Track if a filter is selected

  const [clickedOrgName, setClickedOrgName] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [agentReport, setAgentReport] = useState([]); // State for agent report
  const [formAssignments, setFormAssignments] = useState([]); // State for form assignments
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  // States for date filtering
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const backHref = `/dashboard/reports?tab=${
    searchParams?.get("tab") || "evaluation"
  }`;

  // Fetch organization data for the chart
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/reports/orgAgentReport", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
        });
        const data = await response.json();
        if (response.ok) {
          setReportData(data.reportData);
        } else {
          console.error("Error fetching organization data:", data.message);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch agents when an organization is clicked
  // Fetch agents when an organization is clicked
  const fetchAgents = async (orgId, orgName) => {
    // Clear previous data
    setAgents([]);
    setAgentReport([]);
    setFormAssignments([]);
    setMessage("");
    setMessageType("success");
    setSelectedAgentId(null);
    setShowDateFilter(false);

    // Set new organization details
    setLoading(true);
    setClickedOrgName(orgName);
    setSelectedOrgId(orgId);

    try {
      const response = await fetch(`/api/reports/orgAgentReport/${orgId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents || []);
        // setMessage(data.message || "Agents retrieved successfully.");
        setMessage(""); // Reset error message on successful fetch
        setMessageType("success");
      } else if (response.status === 404) {
        setMessageType("error");
        setMessage(`No agents found for this organization.`);
      } else {
        setMessage(data.message || "Failed to fetch agent details.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setMessage("An error occurred while fetching data.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when selected organization ID changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchAgents(selectedOrgId, clickedOrgName);
    }
  }, [selectedOrgId]); // Re-run this when selectedOrgId changes

  // Handle agent click and show date filter form
  const handleAgentClick = (agentId) => {
    agentId = agentId.split(":")[1];
    if (agentId) {
      setSelectedAgentId(agentId);

      // Reset date filter to "Today"
      setFilter("Today");
      setStartDate(null);
      setEndDate(null);

      setShowDateFilter(true); // Show date filter form
    } else {
      console.error("Invalid agent ID:", agentId);
    }
  };

  // Fetch agent report with selected filter
  const fetchAgentReportWithFilter = async () => {
    if (!selectedAgentId) {
      setError("Please select a valid agent.");
      setMessageType("error");
      return;
    }

    if (filter === "Custom" && (!startDate || !endDate)) {
      setMessage("Start Date and End Date must be provided for Custom filter.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      let queryParams = `DateFilter=${filter}`;

      if (filter === "Custom") {
        queryParams += `&StartDate=${
          startDate.toISOString().split("T")[0]
        }&EndDate=${endDate.toISOString().split("T")[0]}`;
      }

      const response = await fetch(
        `/api/reports/orgAgentDetails/${selectedAgentId}?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
        }
      );
      // Check if the response is ok (status 2xx)
      if (response.ok) {
        const data = await response.json();
        if (data.status === false) {
          // alert(data.message);
          setMessage(data.message);
          setMessageType("error");
        }

        setAgentReport(data.agentReport || []);
        setFormAssignments(data.formAssignments || []);
        setMessageType("success");
      } else {
        const errorText = await response.text(); // Get the raw response text
        console.error("Error response:", errorText);
        setMessage(`Failed to fetch agent report. Response: ${errorText}`);
        setAgentReport([]);
        setFormAssignments([]);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error fetching agent report:", error);
      setMessage(`Error: ${error.message || "Unknown error"}`);
      setAgentReport([]);
      setFormAssignments([]);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFilterSelected && (filter !== "Custom" || (startDate && endDate))) {
      fetchAgentReportWithFilter();
    }
  }, [filter, isFilterSelected, startDate, endDate]); // Add startDate and endDate dependencies

  const handleFilterChange = (e) => {
    const selectedFilter = e.target.value;
    setFilter(selectedFilter); // Update filter state
    setIsFilterSelected(true); // Set filter as selected
  };

  useEffect(() => {
    if (message) {
      setShowMessage(true);

      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 1500); // Hide message after 3 seconds

      // Cleanup the timer if the component unmounts or message changes
      return () => clearTimeout(timer);
    }
  }, [message]);

  const orgReportDetails = {
    average_percentage:
      agentReport.length > 0 ? agentReport[0].average_percentage : 0,
  };

  const chartData = {
    labels: reportData.map((item) => item.org_name),
    datasets: [
      {
        label: "Agent Count",
        data: reportData.map((item) => item.mapped_agent_count),
        borderColor: "hsl(var(--primary))",
        backgroundColor: "rgba(75, 192, 192, 0.5)", // For better visibility of points
        pointBorderColor: "rgba(255, 99, 132, 1)", // Bold border color
        pointBackgroundColor: "rgba(255, 255, 255, 1)", // White background for contrast
        pointBorderWidth: 3, // Thick border
        pointRadius: 6, // Initial point size
        pointHoverRadius: 8, // Enlarge on hover
        tension: 0.1, // Smooth curve
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (tooltipItem) =>
            `Click to view details of ${tooltipItem.label}`,
        },
      },
    },
    elements: {
      point: {
        borderWidth: 3, // Makes the point's border bold
      },
    },
    animations: {
      radius: {
        duration: 1000, // Duration of the animation
        easing: "easeInOutBounce", // Smooth easing for blinking
        loop: true, // Loop the animation
        from: 6, // Start radius
        to: 10, // Maximum radius
      },
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const chartElement = elements[0];
        const orgIndex = chartElement.index;
        const orgName = reportData[orgIndex].org_name;
        const orgId = reportData[orgIndex].org_id;
        fetchAgents(orgId, orgName);
      }
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} passHref>
            <Button variant="outline" size="icon" className="h-7 w-7 shadow-md">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
        </div>
        <h1 className="font-semibold text-center flex-grow">
          Organization Agent Report
        </h1>
      </div>

      {/* Message Section */}
      {showMessage && (
        <div
          className={`text-center p-4 mt-4 ${
            messageType === "error" ? "text-destructive" : "text-primary"
          }`}
        >
          {message}
        </div>
      )}

      {/* Chart Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-3/5">
          <Line data={chartData} options={chartOptions} />
        </div>

        {clickedOrgName && (
          <div className="lg:w-4/5">
            <h2 className="text-sm font-semibold mb-4">
              Agents of {clickedOrgName} Organization
            </h2>

            {loading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-sm font-medium text-muted-foreground">
                  Loading data...
                </p>
              </div>
            )}

            {!loading && agents.length > 0 && (
              <div className="flex gap-4">
                {/* Data Table */}
                <div className="overflow-y-auto max-h-64 w-[200px]">
                  <Table className="mt-4">
                    <TableBody>
                      {agents.map((agent, index) => (
                        <TableRow
                          key={index}
                          onClick={() => handleAgentClick(agent.user_login_id)}
                        >
                          <TableCell className="text-xs">
                            {agent.user_login_id.split(":")[0]}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Date Filter Next to Table */}
                {showDateFilter && (
                  <div className="filter-section ml-4 flex flex-col">
                    <label className="filter-caption">
                      Select a Date Filter
                    </label>
                    <select
                      className="filter-dropdown"
                      value={filter}
                      onChange={handleFilterChange}
                    >
                      <option value="" disabled>
                        Select a filter
                      </option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="DayBeforeYesterday">
                        Day Before Yesterday
                      </option>
                      <option value="ThisMonth">This Month</option>
                      <option value="Custom">Custom</option>
                    </select>

                    {filter === "Custom" && (
                      <div className="custom-date-range mt-2">
                        <DatePicker
                          selected={startDate}
                          onChange={(date) => setStartDate(date)}
                          selectsStart
                          startDate={startDate}
                          endDate={endDate}
                          placeholderText="Start Date"
                          dateFormat="yyyy-MM-dd"
                          maxDate={new Date()}
                          showYearDropdown
                          showMonthDropdown
                          dropdownMode="select" // Enables dropdowns for year and month
                        />
                        <DatePicker
                          selected={endDate}
                          onChange={(date) => {
                            if (startDate && date < startDate) {
                              alert(
                                "End date cannot be earlier than start date."
                              );
                            } else {
                              setEndDate(date);
                            }
                          }}
                          selectsEnd
                          startDate={startDate}
                          endDate={endDate}
                          placeholderText="End Date"
                          dateFormat="yyyy-MM-dd"
                          maxDate={new Date()}
                          showYearDropdown
                          showMonthDropdown
                          dropdownMode="select" // Enables dropdowns for year and month
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display agent report */}
      {agentReport && agentReport.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Agent Report</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Section - Score Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              {/* Total Interactions */}
              <div className="p-6 border rounded-lg shadow-md flex flex-col items-center">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">🔄</span> Total Interactions
                  to which forms are assigned
                </h4>
                <p className="text-lg font-bold text-blue-800 mt-4">
                  {agentReport[0].total_interactions}
                </p>
              </div>

              {/* Total Forms Assigned and Evaluated */}
              <div className="p-6 border rounded-lg shadow-md flex flex-col">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col items-center">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <span className="text-green-600">📄</span> Total Forms
                      Assigned
                    </h4>
                    <p className="text-lg font-bold text-green-800 mt-4">
                      {agentReport[0].total_forms_assigned}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <span className="text-green-600">✅</span> Total Evaluated
                      Forms
                    </h4>
                    <p className="text-lg font-bold text-green-800 mt-4">
                      {agentReport[0].total_evaluated}
                    </p>
                  </div>
                </div>
              </div>

              {/* Highest Score */}
              <div className="p-6 border rounded-lg shadow-md flex flex-col items-center">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-yellow-600">🌟</span> Highest Score
                </h4>
                <div
                  className="mt-4 w-full"
                  style={{ backgroundColor: "#e0e0e0", borderRadius: "4px" }}
                >
                  <div
                    style={{
                      width: `${agentReport[0].highest_percentage}%`,
                      backgroundColor: "#00e676", // Bright neon green
                      height: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        width: "100%",
                        textAlign: "center",
                        top: "2px",
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    >
                      {agentReport[0].highest_percentage}%
                    </span>
                  </div>
                </div>

                <p className="text-lg font-bold text-yellow-800 mt-4">
                  {agentReport[0].highest_percentage}
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  {agentReport[0].highest_percentage_form}
                </p>
              </div>

              {/* Lowest Score */}
              <div className="p-6 border rounded-lg shadow-md flex flex-col items-center">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-destructive">⬇️</span> Lowest Score
                </h4>
                <div
                  className="mt-4 w-full"
                  style={{ backgroundColor: "#e0e0e0", borderRadius: "4px" }}
                >
                  <div
                    style={{
                      width: `${agentReport[0].lowest_percentage}%`,
                      backgroundColor: "#f44336",
                      height: "16px",
                      borderRadius: "4px",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        width: "100%",
                        textAlign: "center",
                        top: "2px",
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    >
                      {agentReport[0].lowest_percentage}%
                    </span>
                  </div>
                </div>
                <p className="text-lg font-bold text-yellow-800 mt-4">
                  {agentReport[0].lowest_percentage}
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  {agentReport[0].lowest_percentage_form}
                </p>
              </div>
            </div>

            {/* Right Section - Average Score Chart */}
            <div className="lg:col-span-1">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-xl hover:scale-105 transform transition-all duration-300 ease-in-out">
                <Bar
                  data={{
                    labels: ["Average Score"],
                    datasets: [
                      {
                        label: "Average Score",
                        data: [orgReportDetails.average_percentage],
                        backgroundColor: "rgba(75, 192, 192, 0.2)",
                        borderColor: "rgb(106, 126, 126)",
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Display form assignments */}
      {formAssignments && formAssignments.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Form Assignments</h3>
          <table className="table-auto w-full border-collapse border border-border text-sm">
            <thead>
              <tr>
                <th className="border border-border px-2 py-1 text-left">
                  Interaction ID
                </th>
                <th className="border border-border px-2 py-1 text-left">
                  Form Name
                </th>
                <th className="border border-border px-2 py-1 text-left">
                  Max Score
                </th>
                <th className="border border-border px-2 py-1 text-left">
                  Score Achieved
                </th>
                <th className="border border-border px-2 py-1 text-left">
                  Percentage of Score
                </th>
              </tr>
            </thead>
            <tbody>
              {formAssignments
                .filter((assignment) => assignment.is_evaluated_status === true) // Filter evaluated forms only
                .map((assignment, index) => (
                  <tr key={index}>
                    <td className="border border-border px-2 py-1">
                      {assignment.interaction_id}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {assignment.form_name || "N/A"}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {assignment.max_score !== null
                        ? assignment.max_score
                        : "N/A"}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {assignment.score_provided !== null
                        ? assignment.score_provided
                        : "N/A"}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {assignment.percentage !== null
                        ? assignment.percentage
                        : "N/A"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrgAgentReport;

