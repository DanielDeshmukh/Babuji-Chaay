"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

function GaugeChart({
  title,
  value,
  target,
  gradientColors,
}: {
  title: string;
  value: number;
  target: number;
  gradientColors: [string, string];
}) {
  const data = {
    labels: ["Achieved", "Remaining"],
    datasets: [
      {
        data: [value, Math.max(target - value, 0)],
        backgroundColor: (context: { chart: ChartJS; dataIndex: number }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          if (context.dataIndex === 0) {
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, gradientColors[0]);
            gradient.addColorStop(1, gradientColors[1]);
            return gradient;
          }
          return "#374151";
        },
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    rotation: 180,
    circumference: 180,
    cutout: "80%",
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  const formattedValue = new Intl.NumberFormat().format(value);
  const formattedTarget = new Intl.NumberFormat().format(target);

  return (
    <div className="relative w-full">
      <Doughnut data={data as any} options={options} />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center w-full">
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        <div className="font-mono text-2xl font-bold" style={{ color: gradientColors[0] }}>
          {formattedValue}
        </div>
        <div className="font-mono text-xs text-gray-500">Target: {formattedTarget}</div>
      </div>
    </div>
  );
}

export default function DoughnutMeter({
  daily,
  monthly,
  targetDaily,
  targetMonthly,
}: {
  daily: number;
  monthly: number;
  targetDaily: number;
  targetMonthly: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 w-full">
      <div className="flex-1">
        <GaugeChart title="Daily" value={daily} target={targetDaily} gradientColors={["#2ecc71", "#1abc9c"]} />
      </div>
      <div className="flex-1">
        <GaugeChart title="Monthly" value={monthly} target={targetMonthly} gradientColors={["#3498db", "#2980b9"]} />
      </div>
    </div>
  );
}
