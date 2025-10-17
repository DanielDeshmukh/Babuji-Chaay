import React, { useEffect, useRef, useState } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import supabase from "../lib/supabaseClient";

const DEFAULT_VISIBLE_BARS = 50;

// --- Simple cubic spline interpolation ---
function smoothData(data, segments = 4) {
  if (!data || data.length < 2) return data;

  const result = [];
  for (let i = 0; i < data.length - 1; i++) {
    const p0 = data[i];
    const p1 = data[i + 1];
    result.push(p0);
    for (let j = 1; j < segments; j++) {
      const t = j / segments;
      // sine-like easing
      const eased = Math.sin((t * Math.PI) / 2); 
      result.push({
        time: p0.time + eased * (p1.time - p0.time),
        value: p0.value + eased * (p1.value - p0.value),
      });
    }
  }
  result.push(data[data.length - 1]);
  return result;
}

const Dashboard = () => {
  const chartContainerRef = useRef();
  const toolTipRef = useRef();

  const [visibleSeries, setVisibleSeries] = useState({
    sales: true,
    loss: true,
    dump: true,
  });
  const [hasData, setHasData] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const [showReportOptions, setShowReportOptions] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [specificDate, setSpecificDate] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.offsetWidth || 800,
      height: 400,
      layout: {
        background: { type: "solid", color: "#1b2430" },
        textColor: "#e0e0e0",
      },
      grid: { vertLines: { color: "#2c3e50" }, horzLines: { color: "#2c3e50" } },
      rightPriceScale: { borderColor: "#34495e", scaleMargins: { top: 0.2, bottom: 0.2 } },
      timeScale: { borderColor: "#34495e" },
      crosshair: {
        horzLine: { color: "#555", labelBackgroundColor: "#222" },
        vertLine: { color: "#555", labelBackgroundColor: "#222" },
      },
    });

    // --- Series ---
    const salesSeries = chart.addSeries(LineSeries, { color: "#2ecc71", lineWidth: 2, visible: visibleSeries.sales });
    const lossSeries = chart.addSeries(LineSeries, { color: "#f1c40f", lineWidth: 2, visible: visibleSeries.loss });
    const dumpSeries = chart.addSeries(LineSeries, { color: "#e91e63", lineWidth: 2, visible: visibleSeries.dump });

    // --- Tooltip ---
    const toolTip = document.createElement("div");
    Object.assign(toolTip.style, {
      position: "absolute", display: "none", padding: "8px 12px", fontSize: "13px",
      textAlign: "left", zIndex: "1000", pointerEvents: "none", border: "1px solid #444",
      borderRadius: "6px", background: "#1E1E1E", color: "#FFF", boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
    });
    chartContainerRef.current.appendChild(toolTip);
    toolTipRef.current = toolTip;

    const fetchSummary = async () => {
      try {
        const { data, error } = await supabase
          .from("daily_sales_summary")
          .select("sales_date, total_sales, total_loss, total_dump")
          .order("sales_date", { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) { setHasData(false); return; }
        setHasData(true);

        const bars = data.length;
        const salesData = smoothData(data.map(r => ({ time: Math.floor(new Date(r.sales_date).getTime() / 1000), value: r.total_sales })));
        const lossData = smoothData(data.map(r => ({ time: Math.floor(new Date(r.sales_date).getTime() / 1000), value: r.total_loss })));
        const dumpData = smoothData(data.map(r => ({ time: Math.floor(new Date(r.sales_date).getTime() / 1000), value: r.total_dump })));

        salesSeries.setData(salesData);
        lossSeries.setData(lossData);
        dumpSeries.setData(dumpData);

        const timeScale = chart.timeScale();
        const adjustedFrom = Math.max(0, bars - DEFAULT_VISIBLE_BARS);
        const adjustedTo = bars - 1;
        timeScale.setVisibleLogicalRange({ from: adjustedFrom, to: adjustedTo });
      } catch (err) {
        console.error("Error fetching summary:", err);
        setHasData(false);
      }
    };

    fetchSummary();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { toolTip.style.display = "none"; return; }

      const dateStr = new Date(param.time * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const sales = param.seriesData.get(salesSeries)?.value ?? 0;
      const loss = param.seriesData.get(lossSeries)?.value ?? 0;
      const dump = param.seriesData.get(dumpSeries)?.value ?? 0;

      toolTip.style.display = "block";
      toolTip.innerHTML = `
        <div style="font-weight:bold; margin-bottom:4px;">${dateStr}</div>
        <div style="color:#2ecc71;">Sales: ₹${sales}</div>
        <div style="color:#f1c40f;">Loss: ₹${loss}</div>
        <div style="color:#e91e63;">Dump: ₹${dump}</div>
      `;

      const { clientWidth } = chartContainerRef.current;
      const tooltipWidth = 160;
      const margin = 15;
      let left = param.point.x + margin;
      if (left > clientWidth - tooltipWidth) left = param.point.x - margin - tooltipWidth;
      toolTip.style.left = `${left}px`;
      toolTip.style.top = `${param.point.y + margin}px`;
    });

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [visibleSeries]);

  const downloadReport = async (type) => {
    setLoadingReport(true);
    try {
      const body = { type };
      if (type === "range" && startDate && endDate) { body.startDate = startDate.toISOString(); body.endDate = endDate.toISOString(); }
      if (type === "specific" && specificDate) { body.date = specificDate.toISOString(); }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to fetch report");

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales_report_${type}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setShowReportOptions(false);
      setSpecificDate(null);
      setStartDate(null);
      setEndDate(null);
    } catch (err) {
      console.error("Failed to download report:", err);
      alert("Failed to generate report");
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1E4B2E]">
      <Header />

      <div className="flex justify-center gap-6 my-6 flex-wrap">
        {["sales", "loss", "dump"].map((series) => (
          <button
            key={series}
            className={`px-5 py-2 rounded-lg font-medium transition ${
              visibleSeries[series]
                ? series === "sales"
                  ? "bg-[#2ecc71] text-white"
                  : series === "loss"
                  ? "bg-[#f1c40f] text-black"
                  : "bg-[#e91e63] text-white"
                : "bg-gray-300"
            }`}
            onClick={() => setVisibleSeries((prev) => ({ ...prev, [series]: !prev[series] }))}
          >
            {series.charAt(0).toUpperCase() + series.slice(1)}
          </button>
        ))}
      </div>

      <div className="w-full flex justify-center mb-6">
        {hasData ? (
          <div ref={chartContainerRef} className="w-full rounded-lg shadow-lg relative mx-auto" style={{ minHeight: 400, maxWidth: "90%" }} />
        ) : (
          <div className="text-center text-gray-500 text-lg py-20 w-full max-w-3xl border border-dashed border-gray-300 rounded-lg">
            No sales data available yet.
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-4 mb-12 ml-6">
        {!showReportOptions ? (
          <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md" onClick={() => setShowReportOptions(true)}>
            {loadingReport ? "Generating..." : "Download Report"}
          </button>
        ) : (
          <div className="flex flex-col gap-4 items-start">
            <div className="flex gap-4 flex-wrap items-center">
              <button className="px-5 py-2 bg-blue-600 text-white rounded-lg" onClick={() => downloadReport("daily")} disabled={loadingReport}>Daily Report</button>
              <DatePicker selected={specificDate} onChange={setSpecificDate} placeholderText="Select Day" className="px-3 py-2 rounded-lg" />
              <button className="px-5 py-2 bg-green-600 text-white rounded-lg" onClick={() => downloadReport("specific")} disabled={!specificDate || loadingReport}>Specific Day</button>
            </div>

            <div className="flex gap-2 items-center flex-wrap mt-2">
              <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start Date" className="px-3 py-2 rounded-lg" />
              <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End Date" className="px-3 py-2 rounded-lg" />
              <button className="px-5 py-2 bg-purple-600 text-white rounded-lg" onClick={() => downloadReport("range")} disabled={!startDate || !endDate || loadingReport}>Range Report</button>
            </div>

            <button className="px-5 py-2 bg-gray-500 text-white rounded-lg mt-2" onClick={() => setShowReportOptions(false)}>Cancel</button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
