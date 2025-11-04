"use client"

import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js"

ChartJS.register(ArcElement, Tooltip)

/**
 * Internal GaugeChart component
 * This creates the actual speedometer-style gauge.
 */
function GaugeChart({ title, value, target, gradientColors }) {
  const data = {
    labels: ["Achieved", "Remaining"],
    datasets: [
      {
        data: [value, Math.max(target - value, 0)],
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return null
          }
          if (context.dataIndex === 0) {
            // Apply gradient to the "Achieved" segment
            const gradient = ctx.createLinearGradient(
              chartArea.left,
              0,
              chartArea.right,
              0
            )
            gradient.addColorStop(0, gradientColors[0])
            gradient.addColorStop(1, gradientColors[1])
            return gradient
          }
          // "Remaining" segment
          return "#374151" // A dark gray for the track
        },
        borderWidth: 0,
        borderRadius: 8, // Rounded ends for a modern look
      },
    ],
  }

  const options = {
    // --- Speedometer settings ---
    rotation: 180, // Start at 9 o'clock
    circumference: 180, // Make it a semi-circle
    // ----------------------------
    cutout: "80%", // Makes the gauge thinner
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // Hide the legend
      },
      tooltip: {
        enabled: false, // Disable tooltips on hover
      },
    },
  }

  // Format numbers with commas
  const formattedValue = new Intl.NumberFormat().format(value)
  const formattedTarget = new Intl.NumberFormat().format(target)

  return (
    <div className="relative w-full">
      <Doughnut data={data} options={options} />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center w-full">
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        <div
          className="font-mono text-2xl font-bold"
          style={{ color: gradientColors[0] }}
        >
          {formattedValue}
        </div>
        <div className="font-mono text-xs text-gray-500">
          Target: {formattedTarget}
        </div>
      </div>
    </div>
  )
}

/**
 * Main DoughnutMeter component
 * This now acts as a container to display two gauges side-by-side.
 */
export default function DoughnutMeter({
  daily,
  monthly,
  targetDaily,
  targetMonthly,
}) {
  return (
    // FIXED: Changed to flex-row to put gauges side-by-side
    // Added sm:flex-row for responsiveness (stacks on small mobile)
    <div className="flex flex-col sm:flex-row gap-6 w-full">
      {/* FIXED: Changed from w-full to flex-1 to share space */}
      <div className="flex-1">
        <GaugeChart
          title="Daily"
          value={daily}
          target={targetDaily}
          gradientColors={["#2ecc71", "#1abc9c"]} // Green gradient
        />
      </div>
      {/* FIXED: Changed from w-full to flex-1 to share space */}
      <div className="flex-1">
        <GaugeChart
          title="Monthly"
          value={monthly}
          target={targetMonthly}
          gradientColors={["#3498db", "#2980b9"]} // Blue gradient
        />
      </div>
    </div>
  )
}