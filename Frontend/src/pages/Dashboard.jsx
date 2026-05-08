"use client";

import React, { useState, useEffect, forwardRef } from "react";
import { TrendingUp, Users, DollarSign, ShoppingCart, Receipt, FileText } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import Header from "../components/Header";
import Footer from "../components/Footer";
import supabase from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

const VISIBLE_POINTS = 7;
// Ensure this is exactly "http://localhost:3000" in your .env
const BACKEND_URL = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");

/**
 * SECURE ACTION HELPER
 * Navigates directly to the backend by appending the token to the URL.
 * This bypasses the "Blob" port 5173 / 3000 conflict.
 */
const openSecureLink = async (pathWithParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }

    // Combine Backend URL with the path
    const fullUrl = `${BACKEND_URL}${pathWithParams}`;

    // Append token as a query parameter so middleware catches it
    const separator = fullUrl.includes("?") ? "&" : "?";
    const authenticatedUrl = `${fullUrl}${separator}token=${token}`;

    // Direct navigation - avoids the blob/fetch "Unauthorized" trap
    window.open(authenticatedUrl, "_blank");
  } catch (err) {
    console.error("Auth Link Error:", err);
    alert("Authentication failed.");
  }
};

const NoKeyboardInput = forwardRef(
  ({ value, onClick, placeholder, className }, ref) => (
    <input
      ref={ref}
      value={value || ""}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      onFocus={(e) => e.target.blur()}
      readOnly
      placeholder={placeholder}
      className={className}
    />
  )
);

const formatCurrency = (v) =>
  typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : v;

function Dashboard() {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [hasData, setHasData] = useState(true);

  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showTransactionOptions, setShowTransactionOptions] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [specificDate, setSpecificDate] = useState(null);
  const [selectedDailyBillNo, setSelectedDailyBillNo] = useState("");

  const datePickerClassName =
    "px-3 py-2 rounded-md bg-card text-card-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm";

  // Old version:
  // const formatLocalDate = (date) => date.toLocaleDateString("en-CA");

  // New fixed version:
  const formatLocalDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
  };
  // 1) Session Sync to Backend on Mount
  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${BACKEND_URL}/auth/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ access_token: session.access_token }),
        }).catch(err => console.error("Session Sync failed", err));
      }
    };
    syncSession();
  }, []);

  // 2) Fetch Chart Data
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data: rows, error } = await supabase
          .from("daily_sales_summary")
          .select("sales_date, total_sales, total_loss, total_dump")
          .order("sales_date", { ascending: true });

        if (error) throw error;
        if (!rows?.length) return setHasData(false);

        setData(rows.map((r) => ({
          date: new Date(r.sales_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          sales: r.total_sales,
          loss: r.total_loss,
          dump: r.total_dump,
        })));
        setHasData(true);
      } catch (err) {
        console.error("Summary error:", err);
        setHasData(false);
      }
    };
    fetchSummary();
  }, []);

// 3) KPIs Fetch - FIXED FOR TIMEZONES & DYNAMICS
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const todayStr = formatLocalDate(new Date());
        const start = startDate ? formatLocalDate(startDate) : todayStr;
        const end = endDate ? formatLocalDate(endDate) : todayStr;

        // 1. Fetch Summary Data (Income & Expenses)
        const { data: summaryData } = await supabase
          .from("daily_sales_summary")
          .select("total_sales, total_loss, total_dump")
          .gte("sales_date", start)
          .lte("sales_date", end);

        const totalIncome = summaryData?.reduce((sum, r) => sum + Number(r.total_sales || 0), 0) || 0;
        // Check if these columns actually have data in your DB!
        const totalExpenses = summaryData?.reduce((sum, r) => sum + Number(r.total_loss || 0) + Number(r.total_dump || 0), 0) || 0;

        // 2. Fetch Orders - TIMEZONE ADJUSTED (+05:30)
        // We use the same ISO offset logic we used for the refund search
        const istStart = `${start}T00:00:00+05:30`;
        const istEnd = `${end}T23:59:59+05:30`;

        const { count: totalOrders, error: countErr } = await supabase
          .from("transactions")
          .select("*", { count: 'exact', head: true })
          .gte("created_at", istStart)
          .lte("created_at", istEnd);

        if (countErr) console.error("Order Count Error:", countErr);

        setKpis([
          { title: "Income", value: totalIncome, delta: "Current Period", icon: DollarSign, color: "var(--accent)" },
          { title: "Orders", value: totalOrders || 0, delta: "Transactions", icon: ShoppingCart, color: "var(--secondary)" },
          { title: "Expenses", value: totalExpenses, delta: "Loss/Dump", icon: Users, color: "var(--secondary-foreground)" },
          { title: "Growth", value: "Live", delta: "Active", icon: TrendingUp, color: "var(--primary)" },
        ]);
      } catch (err) { 
        console.error("KPI Fetch Critical Failure:", err); 
      }
    };
    fetchKPIs();
  }, [startDate, endDate]);

const getDateParams = (type) => {
  let startStr, endStr;

  if (type === "range" && startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be later than end date.");
      return null;
    }
    // Convert to IST window strings
    startStr = `${formatLocalDate(startDate)}T00:00:00+05:30`;
    endStr = `${formatLocalDate(endDate)}T23:59:59+05:30`;
  } else if (type === "specific" && specificDate) {
    const d = formatLocalDate(specificDate);
    startStr = `${d}T00:00:00+05:30`;
    endStr = `${d}T23:59:59+05:30`;
  } else {
    // Default/Daily fallback (Today IST)
    const today = formatLocalDate(new Date());
    startStr = `${today}T00:00:00+05:30`;
    endStr = `${today}T23:59:59+05:30`;
  }

  // Critical: Use encodeURIComponent so the '+' and ':' don't break the URL
  return `?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
};

  // 4) Report Logic
  const handleDownloadReport = (type) => {
    const params = getDateParams(type);
    if (!params) return; // Exit if validation failed

    const path = `/api/reports/generate${params}`;
    openSecureLink(path);
    setShowReportOptions(false);
  };

  // 5) Transaction Logic
 // 5) Transaction Logic - REFACTORED
  const handleViewTransactions = async (type) => {
    let path = `/api/transactions`;

    if (type === "invoice") {
      // Safety check: Don't proceed if no bill number is entered
      if (!selectedDailyBillNo) {
        alert("Please enter a Daily Bill Number first.");
        return;
      }
      
      // Explicitly append the format=pdf so the backend knows to trigger a download/PDF view
      path = `/api/transactions/daily/${selectedDailyBillNo}/invoice?format=pdf`;
    } else {
      const params = getDateParams(type);
      if (!params) return; // Exit if validation failed (from getDateParams)
      path += params;
    }

    // openSecureLink handles the Supabase session retrieval and 
    // appends the &token=... query param to bypass the "Unauthorized" error
    await openSecureLink(path);
    
    setShowTransactionOptions(false);
  };



  const visibleData = data.length ? data.slice(-VISIBLE_POINTS) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="px-3 py-1 rounded-md text-sm bg-muted text-muted-foreground">Overview</div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="rounded-xl border border-border">
                <CardContent className="p-5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(kpi.value)}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.delta}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 rounded-xl border border-border">
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Recent performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      opacity={0.5}
                    />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      dy={10}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                      }}
                      itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
                    />

                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--primary)"     /* 🟢 Green in Light / 🟡 Gold in Dark */
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#chartGradient)"  /* Uses the dynamic gradient defined above */
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Action Panels */}
          <div className="space-y-6">
            <Card className="rounded-xl border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showReportOptions ? (
                  <button onClick={() => setShowReportOptions(true)} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold">Export Reports</button>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => handleDownloadReport("daily")} className="w-full py-2 bg-muted rounded-lg text-sm">Daily Report</button>
                    <div className="space-y-2 pt-2 border-t border-border">
                      <DatePicker selected={specificDate} onChange={setSpecificDate} placeholderText="Specific Date" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                      <div className="grid grid-cols-2 gap-2">
                        <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                        <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDownloadReport("specific")} disabled={!specificDate} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs disabled:opacity-50">Day</button>
                        <button onClick={() => handleDownloadReport("range")} disabled={!startDate || !endDate} className="flex-1 py-2 bg-secondary text-white rounded-lg text-xs disabled:opacity-50">Range</button>
                      </div>
                    </div>
                    <button onClick={() => setShowReportOptions(false)} className="w-full py-1 text-xs underline">Back</button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showTransactionOptions ? (
                  <button
                    onClick={() => setShowTransactionOptions(true)}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold"
                  >
                    View Transactions
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Quick Actions */}
                    <button
                      onClick={() => handleViewTransactions("daily")}
                      className="w-full py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80"
                    >
                      Today's Ledger
                    </button>

                    {/* Date Range Selection */}
                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Select Range / Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate || ""}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={datePickerClassName}
                        />
                        <input
                          type="date"
                          value={endDate || ""}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={datePickerClassName}
                        />
                      </div>
                      <button
                        onClick={() => handleViewTransactions("range")}
                        disabled={!startDate || !endDate}
                        className="w-full py-2 bg-secondary text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        View Range Ledger
                      </button>
                    </div>

                    <button
                      onClick={() => setShowTransactionOptions(false)}
                      className="w-full py-1 text-xs underline text-muted-foreground hover:text-primary"
                    >
                      Back
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Dashboard;