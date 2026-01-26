"use client";

import React, { useState, useEffect, forwardRef } from "react";
import { TrendingUp, Users, DollarSign, ShoppingCart, Receipt, FileText, Calendar } from "lucide-react";
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
const BACKEND_URL = import.meta.env.VITE_API_BASE;

/**
 * SECURE ACTION HELPER
 * Opens secured backend URLs by fetching with Auth headers first, then creating a blob URL.
 */
const openSecureLink = async (endpoint) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error("Unauthorized access to API");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("API Error:", err);
    alert("Session expired or unauthorized. Please log in again.");
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
  const [loadingReport, setLoadingReport] = useState(false);

  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showTransactionOptions, setShowTransactionOptions] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [specificDate, setSpecificDate] = useState(null);
  const [selectedDailyBillNo, setSelectedDailyBillNo] = useState("");

  const datePickerClassName =
    "px-3 py-2 rounded-md bg-card text-card-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300 w-full text-sm";

  const formatLocalDate = (date) => date.toLocaleDateString("en-CA");

  // 1) Session Sync to Backend
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
        }).catch(err => console.error("Sync failed", err));
      }
    };
    syncSession();
  }, []);

  // 2) Fetch Charts (Supabase Client handles JWT automatically)
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

  // 3) KPIs Fetch
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const todayStr = formatLocalDate(new Date());
        const start = startDate ? formatLocalDate(startDate) : todayStr;
        const end = endDate ? formatLocalDate(endDate) : todayStr;

        const { data: summaryData } = await supabase
          .from("daily_sales_summary")
          .select("total_sales, total_loss, total_dump")
          .gte("sales_date", start)
          .lte("sales_date", end);

        const totalIncome = summaryData?.reduce((sum, r) => sum + Number(r.total_sales || 0), 0) || 0;
        const totalExpenses = summaryData?.reduce((sum, r) => sum + Number(r.total_loss || 0) + Number(r.total_dump || 0), 0) || 0;

        const { count: totalOrders } = await supabase
          .from("transactions")
          .select("*", { count: 'exact', head: true })
          .gte("created_at", `${start}T00:00:00`)
          .lte("created_at", `${end}T23:59:59`);

        setKpis([
          { title: "Income", value: totalIncome, delta: "Current Period", icon: DollarSign, color: "var(--accent)" },
          { title: "Orders", value: totalOrders || 0, delta: "Transactions", icon: ShoppingCart, color: "var(--secondary)" },
          { title: "Expenses", value: totalExpenses, delta: "Loss/Dump", icon: Users, color: "var(--secondary-foreground)" },
          { title: "Growth", value: "Live", delta: "Active", icon: TrendingUp, color: "var(--primary)" },
        ]);
      } catch (err) { console.error(err); }
    };
    fetchKPIs();
  }, [startDate, endDate]);

  // 4) Report Generation (Authorized)
  const downloadReport = (type) => {
    let query = "";
    if (type === "range" && startDate && endDate) {
      query = `?start=${formatLocalDate(startDate)}&end=${formatLocalDate(endDate)}`;
    } else if (type === "specific" && specificDate) {
      const d = formatLocalDate(specificDate);
      query = `?start=${d}&end=${d}`;
    } else {
      const today = formatLocalDate(new Date());
      query = `?start=${today}&end=${today}`;
    }
    openSecureLink(`/api/reports/generate${query}`);
    setShowReportOptions(false);
  };

  // 5) Transactions View (Authorized)
  const viewTransactions = (type) => {
    let url = `/api/transactions`;
    if (type === "daily") {
      const today = formatLocalDate(new Date());
      url += `?start=${today}&end=${today}`;
    } else if (type === "specific" && specificDate) {
      const d = formatLocalDate(specificDate);
      url += `?start=${d}&end=${d}`;
    } else if (type === "range" && startDate && endDate) {
      url += `?start=${formatLocalDate(startDate)}&end=${formatLocalDate(endDate)}`;
    } else if (type === "invoice" && selectedDailyBillNo) {
      url = `/api/transactions/daily/${selectedDailyBillNo}/invoice`;
    }
    openSecureLink(url);
    setShowTransactionOptions(false);
  };

  const visibleData = data.length ? data.slice(-VISIBLE_POINTS) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="px-3 py-1 rounded-md text-sm bg-muted text-muted-foreground font-medium">
              Overview
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="rounded-xl shadow-sm border border-border">
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
          <Card className="lg:col-span-2 rounded-xl shadow-sm border border-border">
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Recent performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={visibleData}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={2} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Action Cards (Side Panel) */}
          <div className="space-y-6">
            {/* Reports Card */}
            <Card className="rounded-xl shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showReportOptions ? (
                  <button onClick={() => setShowReportOptions(true)} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">
                    Export Reports
                  </button>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => downloadReport("daily")} className="w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition">Daily Report</button>
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Specific Day or Range</p>
                      <DatePicker selected={specificDate} onChange={setSpecificDate} placeholderText="Pick a date" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                      <div className="grid grid-cols-2 gap-2">
                        <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                        <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End" customInput={<NoKeyboardInput className={datePickerClassName} />} />
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => downloadReport("specific")} disabled={!specificDate} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50">Day</button>
                         <button onClick={() => downloadReport("range")} disabled={!startDate || !endDate} className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold disabled:opacity-50">Range</button>
                      </div>
                    </div>
                    <button onClick={() => setShowReportOptions(false)} className="w-full py-2 text-xs text-muted-foreground font-medium underline">Back</button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transactions Card */}
            <Card className="rounded-xl shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showTransactionOptions ? (
                  <button onClick={() => setShowTransactionOptions(true)} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">
                    Browse Transactions
                  </button>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => viewTransactions("daily")} className="w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition">Current Day</button>
                    <div className="space-y-2 pt-2 border-t border-border">
                       <input 
                         type="number" 
                         placeholder="Bill No. (Invoice)" 
                         value={selectedDailyBillNo} 
                         onChange={(e) => setSelectedDailyBillNo(e.target.value)} 
                         className={datePickerClassName} 
                       />
                       <button 
                         onClick={() => viewTransactions("invoice")} 
                         disabled={!selectedDailyBillNo} 
                         className="w-full py-2 bg-accent text-accent-foreground rounded-lg text-xs font-bold disabled:opacity-50 transition"
                       >
                         Download Invoice
                       </button>
                    </div>
                    <button onClick={() => viewTransactions("range")} disabled={!startDate || !endDate} className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold disabled:opacity-50 transition">View Range Transactions</button>
                    <button onClick={() => setShowTransactionOptions(false)} className="w-full py-2 text-xs text-muted-foreground font-medium underline">Back</button>
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