// components/chart_report.jsx
"use client";
import React from "react";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import withAuth from "./withAuth";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// ✅ Explicitly register only what you use
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ChartReport = ({
  chartType = "bar",
  chartData,
  title = "Chart Report",
  tooltipCallback,
  height = "h-[320px]",
  // width = "w-[500px]",
  // width = "w-full max-w-[900px]",
  width = "w-full",
  footerNote = "Generated visualization based on selected filters.",
  xAxisLabel = "Category", // default fallback
  yAxisLabel = "Value", // default fallback
}) => {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        No chart data available
      </p>
    );
  }

  const ChartComponent = {
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut,
  }[chartType];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!title,
        text: title,
        font: { size: 14 },
      },
      legend: {
        position: "top",
        labels: { font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: tooltipCallback
            ? tooltipCallback
            : function (context) {
                const value = context.dataset.data[context.dataIndex];
                const label = context.label;
                return `${label}: ${value}`;
              },
        },
      },
    },
    ...(chartType === "bar" && {
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisLabel,
            font: { size: 12 },
          },
        },
        y: {
          title: {
            display: true,
            text: yAxisLabel,
            font: { size: 12 },
          },
          beginAtZero: true,
        },
      },
    }),
  };

  return (
    <div className={`bg-card p-4 rounded-lg shadow-md mx-auto w-full`}>
      <div className="overflow-x-auto">
        <div className={`${width} ${height} min-w-[600px]`}>
          <ChartComponent data={chartData} options={options} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">{footerNote}</p>
    </div>
  );
};

export default withAuth(ChartReport);

