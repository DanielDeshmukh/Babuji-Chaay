"use client";

import { useState } from "react";
import { FiDownloadCloud, FiCalendar, FiClock } from "react-icons/fi";

const EXPORT_TYPES = {
  MONTHLY: {
    key: "monthly",
    name: "Monthly Summary",
    description: "Aggregate sales data (Txn ID, Date, Item Count, Payments).",
  },
  DAILY: {
    key: "daily",
    name: "Daily Itemized",
    description: "Detailed per-item sales for a specific day.",
  },
};

const ExportData = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedType, setSelectedType] = useState(
    EXPORT_TYPES.MONTHLY.key
  );
  const [monthYear, setMonthYear] = useState("");
  const [singleDate, setSingleDate] = useState("");

  const handleExport = async () => {
    if (loading) return;

    setMessage("");
    setLoading(true);

    let params: Record<string, string> = { type: selectedType };
    let exportName = "";

    if (selectedType === EXPORT_TYPES.MONTHLY.key) {
      if (!monthYear) {
        setMessage("Please select a month.");
        setLoading(false);
        return;
      }
      const [year, month] = monthYear.split("-");
      params.dateRangeStart = `${year}-${month}-01`;
      params.dateRangeEnd = `${year}-${month}-${new Date(
        Number(year),
        Number(month),
        0
      ).getDate()}`;
      exportName = `Monthly_Sales_${monthYear}.xlsx`;
    } else {
      if (!singleDate) {
        setMessage("Please select a specific date.");
        setLoading(false);
        return;
      }
      params.singleDate = singleDate;
      exportName = `Daily_Itemized_${singleDate}.xlsx`;
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/exports/sales?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error (${response.status})`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`${exportName} downloaded successfully!`);
    } catch (error) {
      console.error("Export Error:", error);
      setMessage(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h3 className="text-xl font-semibold text-foreground flex items-center space-x-2">
          <FiDownloadCloud size={24} className="text-primary" />
          <span>Reports &amp; Exports</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Object.values(EXPORT_TYPES).map((type) => (
          <button
            key={type.key}
            disabled={loading}
            onClick={() => setSelectedType(type.key)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedType === type.key
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`font-bold ${selectedType === type.key ? "text-primary" : "text-foreground"}`}
              >
                {type.name}
              </span>
              {type.key === "daily" ? (
                <FiClock size={18} />
              ) : (
                <FiCalendar size={18} />
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {type.description}
            </p>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-accent/5 border border-dashed border-border">
        <label className="text-sm font-medium text-muted-foreground block mb-2 uppercase tracking-wider">
          {selectedType === "daily"
            ? "Choose Sales Date"
            : "Choose Sales Month"}
        </label>

        {selectedType === EXPORT_TYPES.MONTHLY.key ? (
          <input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="w-full p-3 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
            disabled={loading}
          />
        ) : (
          <input
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            className="w-full p-3 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer"
            disabled={loading}
          />
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating Excel...
          </span>
        ) : (
          <>
            <FiDownloadCloud size={20} />
            <span>Download Excel Report</span>
          </>
        )}
      </button>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium text-center animate-in fade-in slide-in-from-bottom-2 ${
            message.includes("failed") || message.includes("select")
              ? "bg-destructive/10 text-destructive"
              : "bg-green-500/10 text-green-600"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default ExportData;
