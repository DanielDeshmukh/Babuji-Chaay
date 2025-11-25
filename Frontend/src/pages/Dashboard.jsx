"use client";

import React, { useState, useEffect, useMemo, forwardRef } from "react";
import { TrendingUp, Users, DollarSign, ShoppingCart, Receipt } from "lucide-react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

const VISIBLE_POINTS = 7;

const NoKeyboardInput = forwardRef(({ value, onClick, placeholder, className }, ref) => (
  <input
    ref={ref}
    value={value || ""}
    onClick={(e) => {
      e.preventDefault();
      onClick?.(e);
    }}
    onFocus={(e) => e.target.blur()}
    readOnly
    data-no-keyboard
    placeholder={placeholder}
    className={className}
  />
));

const formatCurrency = (v) =>
  typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : v;

function Dashboard() {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [hasData, setHasData] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showTransactionOptions, setShowTransactionOptions] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [specificDate, setSpecificDate] = useState(null);

  const datePickerClassName =
    "px-3 py-2 rounded-md bg-card text-card-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300";

  // Helper
  const formatLocalDate = (date) => date.toLocaleDateString("en-CA"); // YYYY-MM-DD

  // Fetch chart data
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data: rows, error } = await supabase
          .from("daily_sales_summary")
          .select("sales_date, total_sales, total_loss, total_dump")
          .order("sales_date", { ascending: true });

        if (error) throw error;
        if (!rows?.length) {
          setHasData(false);
          return;
        }

        const formatted = rows.map((r) => ({
          date: new Date(r.sales_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
          sales: r.total_sales,
          loss: r.total_loss,
          dump: r.total_dump,
        }));

        setData(formatted);
        setHasData(true);
      } catch (err) {
        console.error("Error fetching summary:", err);
        setHasData(false);
      }
    };

    fetchSummary();
  }, []);

  // Fetch live KPI metrics
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const today = new Date();
        const start = startDate ? formatLocalDate(startDate) : formatLocalDate(today);
        const end = endDate ? formatLocalDate(endDate) : formatLocalDate(today);

        // Fetch daily summary totals
        const { data: summaryData, error: summaryErr } = await supabase
          .from("daily_sales_summary")
          .select("total_sales, total_loss, total_dump, sales_date")
          .gte("sales_date", start)
          .lte("sales_date", end);

        if (summaryErr) throw summaryErr;

        const totalIncome = summaryData.reduce(
          (sum, r) => sum + Number(r.total_sales || 0),
          0
        );
        const totalExpenses = summaryData.reduce(
          (sum, r) => sum + Number(r.total_loss || 0) + Number(r.total_dump || 0),
          0
        );

        // Fetch total orders (transactions)
        const { data: txData, error: txErr } = await supabase
          .from("transactions")
          .select("id", { count: "exact" })
          .gte("created_at", `${start}T00:00:00+05:30`)
          .lte("created_at", `${end}T23:59:59+05:30`);

        if (txErr) throw txErr;
        const totalOrders = txData?.length || 0;

        // Fetch previous day's data for growth comparison
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const { data: prevData } = await supabase
          .from("daily_sales_summary")
          .select("total_sales")
          .eq("sales_date", formatLocalDate(yesterday))
          .single();

        const growth =
          prevData && prevData.total_sales
            ? (((totalIncome - prevData.total_sales) / prevData.total_sales) * 100).toFixed(1)
            : "0.0";

        setKpis([
          {
            title: "Income",
            value: totalIncome,
            delta: growth + "%",
            icon: DollarSign,
            color: "var(--accent)",
          },
          {
            title: "Orders",
            value: totalOrders,
            delta: "+",
            icon: ShoppingCart,
            color: "var(--secondary)",
          },
          {
            title: "Expenses",
            value: totalExpenses,
            delta: "-",
            icon: Users,
            color: "var(--secondary-foreground)",
          },
          {
            title: "Growth",
            value: growth + "%",
            delta: growth >= 0 ? "↑" : "↓",
            icon: TrendingUp,
            color: "var(--primary)",
          },
        ]);
      } catch (err) {
        console.error("Error fetching KPIs:", err);
      }
    };

    fetchKPIs();
  }, [startDate, endDate]);

  const downloadReport = async (type) => {
    try {
      setLoadingReport(true);
      let query = "";
      if (type === "range" && startDate && endDate) {
        query = `?start=${formatLocalDate(startDate)}&end=${formatLocalDate(endDate)}`;
      } else if (type === "specific" && specificDate) {
        const d = formatLocalDate(specificDate);
        query = `?start=${d}&end=${d}`;
      } else if (type === "daily") {
        const today = formatLocalDate(new Date());
        query = `?start=${today}&end=${today}`;
      }

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/reports/generate${query}`;
      window.open(url, "_blank");
      setShowReportOptions(false);
    } catch (err) {
      console.error("Report open failed:", err);
      alert("Failed to open report.");
    } finally {
      setLoadingReport(false);
    }
  };

const viewTransactions = async (type) => {
  try {
    setLoadingReport(true);
    let url = "";

    if (type === "range" && startDate && endDate) {
      const start = formatLocalDate(startDate);
      const end = formatLocalDate(endDate);
      url = `${import.meta.env.VITE_BACKEND_URL}/api/transactions?start=${start}&end=${end}`;
    } else if (type === "specific" && specificDate) {
      const d = formatLocalDate(specificDate);
      url = `${import.meta.env.VITE_BACKEND_URL}/api/transactions?start=${d}&end=${d}`;
    } else if (type === "daily") {
      const today = formatLocalDate(new Date());
      url = `${import.meta.env.VITE_BACKEND_URL}/api/transactions?start=${today}&end=${today}`;
    } else if (type === "invoice" && selectedDailyBillNo) {
      url = `${import.meta.env.VITE_BACKEND_URL}/api/transactions/daily/${selectedDailyBillNo}/invoice`;
    } else {
      url = `${import.meta.env.VITE_BACKEND_URL}/api/transactions`;
    }

    window.open(url, "_blank");

    setShowTransactionOptions(false);
  } catch (err) {
    console.error("Transaction view failed:", err);
    alert("Failed to view transactions.");
  } finally {
    setLoadingReport(false);
  }
};



  const visibleData = data.length
    ? data.slice(-VISIBLE_POINTS)
    : Array.from({ length: VISIBLE_POINTS }).map((_, i) => ({
        date: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7],
        sales: Math.round(200 + Math.sin(i / 2) * 40 + i * 10),
        loss: Math.round(80 + Math.cos(i / 3) * 20),
        dump: Math.round(30 + (i % 3) * 10),
      }));

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="px-3 py-1 rounded-md text-sm bg-muted text-muted-foreground">
              Overview
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.title}
                className="rounded-xl p-4 bg-card border border-border shadow-xl transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{kpi.title}</div>
                    <div className="mt-1 text-2xl font-bold text-card-foreground">
                      {formatCurrency(kpi.value)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {kpi.delta} vs last period
                    </div>
                  </div>
                  <Icon className="h-6 w-6" style={{ color: kpi.color }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl bg-card border border-border shadow-xl">
              <CardHeader>
                <CardTitle>Earnings</CardTitle>
                <CardDescription>This week vs last week</CardDescription>
              </CardHeader>

              <CardContent>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleData}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: `1px solid var(--border)`,
                        }}
                        itemStyle={{ color: "var(--foreground)" }}
                      />
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--primary)"
                        strokeWidth={1.5}
                        fill="url(#salesGradient)"
                        activeDot={{
                          r: 5,
                          stroke: "var(--foreground)",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>

              <CardFooter className="text-sm text-muted-foreground">
                Trending up by {kpis[3]?.value || "0%"} this period
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl bg-card border border-border shadow-xl p-4">
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Reports</CardTitle>
                <CardDescription>Export PDFs</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {!showReportOptions ? (
                  <button
                    className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    onClick={() => setShowReportOptions(true)}
                    disabled={loadingReport}
                  >
                    {loadingReport ? "Generating..." : "View Report"}
                  </button>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="px-3 py-2 rounded-md bg-card border border-border"
                        onClick={() => downloadReport("daily")}
                      >
                        Daily
                      </button>
                      <DatePicker
                        selected={specificDate}
                        onChange={setSpecificDate}
                        placeholderText="Specific Day"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-primary text-primary-foreground"
                        onClick={() => downloadReport("specific")}
                        disabled={!specificDate}
                      >
                        Specific
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        placeholderText="Start"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <DatePicker
                        selected={endDate}
                        onChange={setEndDate}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        placeholderText="End"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
                        onClick={() => downloadReport("range")}
                        disabled={!startDate || !endDate}
                      >
                        Range
                      </button>
                    </div>

                    <button
                      className="px-3 py-2 rounded-md bg-muted text-muted-foreground"
                      onClick={() => setShowReportOptions(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-card border border-border shadow-xl p-4">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Transactions
                </CardTitle>
                <CardDescription>View or Export</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {!showTransactionOptions ? (
                  <button
                    className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    onClick={() => setShowTransactionOptions(true)}
                    disabled={loadingReport}
                  >
                    {loadingReport ? "Loading..." : "View Transactions"}
                  </button>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="px-3 py-2 rounded-md bg-card border border-border"
                        onClick={() => viewTransactions("daily")}
                      >
                        Daily
                      </button>
                      <DatePicker
                        selected={specificDate}
                        onChange={setSpecificDate}
                        placeholderText="Specific Day"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-primary text-primary-foreground"
                        onClick={() => viewTransactions("specific")}
                        disabled={!specificDate}
                      >
                        Specific
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        placeholderText="Start"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <DatePicker
                        selected={endDate}
                        onChange={setEndDate}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        placeholderText="End"
                        customInput={<NoKeyboardInput className={datePickerClassName} />}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
                        onClick={() => viewTransactions("range")}
                        disabled={!startDate || !endDate}
                      >
                        Range
                      </button>
                    </div>

                    <button
                      className="px-3 py-2 rounded-md bg-muted text-muted-foreground"
                      onClick={() => setShowTransactionOptions(false)}
                    >
                      Cancel
                    </button>
                  </>
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

export default Dashboard
