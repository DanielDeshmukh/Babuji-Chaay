"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Receipt,
  FileText,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const VISIBLE_POINTS = 7;

const formatCurrency = (v: number | string) =>
  typeof v === "number"
    ? `\u20B9${v.toLocaleString("en-IN")}`
    : String(v);

interface SummaryRow {
  sales_date: string;
  total_sales: number;
  total_loss: number;
  total_dump: number;
}

interface KpiItem {
  title: string;
  value: number | string;
  delta: string;
  icon: React.ElementType;
  color: string;
}

function Dashboard() {
  const [data, setData] = useState<
    Array<{ date: string; sales: number; loss: number; dump: number }>
  >([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [hasData, setHasData] = useState(true);

  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showTransactionOptions, setShowTransactionOptions] =
    useState(false);
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [selectedDailyBillNo, setSelectedDailyBillNo] = useState("");

  const formatLocalDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
  };

  // Fetch Chart Data
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/summary");
        const json = await res.json();
        const rows: SummaryRow[] = json.summary || [];

        if (!rows.length) {
          setHasData(false);
          return;
        }

        setData(
          rows.map((r) => ({
            date: new Date(r.sales_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            sales: r.total_sales,
            loss: r.total_loss,
            dump: r.total_dump,
          }))
        );
        setHasData(true);
      } catch (err) {
        console.error("Summary error:", err);
        setHasData(false);
      }
    };
    fetchSummary();
  }, []);

  // KPIs Fetch
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const now = new Date();
        const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = istDate.toISOString().split("T")[0];
        const start = startDate || todayStr;
        const end = endDate || todayStr;

        const res = await fetch("/api/summary");
        const json = await res.json();
        const rows: SummaryRow[] = json.summary || [];

        const filtered = rows.filter((r) => {
          const d = r.sales_date;
          return d >= start && d <= end;
        });

        const totalIncome = filtered.reduce(
          (sum, r) => sum + Number(r.total_sales || 0),
          0
        );
        const totalExpenses = filtered.reduce(
          (sum, r) =>
            sum + Number(r.total_loss || 0) + Number(r.total_dump || 0),
          0
        );

        // Count transactions
        const txnRes = await fetch(
          `/api/transactions?start=${encodeURIComponent(start + "T00:00:00")}&end=${encodeURIComponent(end + "T23:59:59")}`
        );
        const txnJson = await txnRes.json();
        const totalOrders = (txnJson.transactions || []).length;

        setKpis([
          {
            title: "Income",
            value: totalIncome,
            delta: "Current Period",
            icon: DollarSign,
            color: "var(--accent)",
          },
          {
            title: "Orders",
            value: totalOrders,
            delta: "Transactions",
            icon: ShoppingCart,
            color: "var(--secondary)",
          },
          {
            title: "Expenses",
            value: totalExpenses,
            delta: "Loss/Dump",
            icon: Users,
            color: "var(--secondary-foreground)",
          },
          {
            title: "Growth",
            value: "Live",
            delta: "Active",
            icon: TrendingUp,
            color: "var(--primary)",
          },
        ]);
      } catch (err) {
        console.error("KPI Fetch Critical Failure:", err);
      }
    };
    fetchKPIs();
  }, [startDate, endDate]);

  const getDateParams = (type: string) => {
    let startStr: string;
    let endStr: string;

    if (type === "range" && startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date cannot be later than end date.");
        return null;
      }
      startStr = `${startDate}T00:00:00`;
      endStr = `${endDate}T23:59:59`;
    } else if (type === "specific" && specificDate) {
      startStr = `${specificDate}T00:00:00`;
      endStr = `${specificDate}T23:59:59`;
    } else {
      const now = new Date();
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const today = istDate.toISOString().split("T")[0];
      startStr = `${today}T00:00:00`;
      endStr = `${today}T23:59:59`;
    }

    return `start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
  };

  const handleDownloadReport = (type: string) => {
    let url = "/api/exports/sales?";

    if (type === "daily") {
      const today = formatLocalDate(new Date().toISOString());
      url += `type=daily&singleDate=${today}`;
    } else if (type === "specific" && specificDate) {
      url += `type=daily&singleDate=${specificDate}`;
    } else if (type === "range" && startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date cannot be later than end date.");
        return;
      }
      url += `type=monthly&dateRangeStart=${startDate}&dateRangeEnd=${endDate}`;
    } else {
      return;
    }

    window.open(url, "_blank");
    setShowReportOptions(false);
  };

  const handleViewTransactions = async (type: string) => {
    let url = "/api/transactions";

    if (type === "invoice") {
      if (!selectedDailyBillNo) {
        alert("Please enter a Daily Bill Number first.");
        return;
      }
      url += `?billNo=${selectedDailyBillNo}`;
    } else {
      const params = getDateParams(type);
      if (!params) return;
      url += `?${params}`;
    }

    setTxnLoading(true);
    setShowTransactions(true);
    setShowTransactionOptions(false);

    try {
      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  };

  const visibleData = data.length ? data.slice(-VISIBLE_POINTS) : [];

  const datePickerClassName =
    "px-3 py-2 rounded-md bg-card text-card-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary w-full text-sm";

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Header />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="px-3 py-1 rounded-md text-sm bg-muted text-muted-foreground">
            Overview
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.title}
                className="rounded-xl border border-border"
              >
                <CardContent className="p-5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatCurrency(kpi.value)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.delta}
                    </p>
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
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--primary)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--primary)"
                          stopOpacity={0}
                        />
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
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 12,
                      }}
                      dy={10}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                      itemStyle={{
                        color: "var(--primary)",
                        fontWeight: "bold",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showReportOptions ? (
                  <button
                    onClick={() => setShowReportOptions(true)}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold"
                  >
                    Export Reports
                  </button>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => handleDownloadReport("daily")}
                      className="w-full py-2 bg-muted rounded-lg text-sm"
                    >
                      Daily Report
                    </button>
                    <div className="space-y-2 pt-2 border-t border-border">
                      <input
                        type="date"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className={datePickerClassName}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={datePickerClassName}
                          placeholder="Start"
                        />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={datePickerClassName}
                          placeholder="End"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleDownloadReport("specific")
                          }
                          disabled={!specificDate}
                          className="flex-1 py-2 bg-primary text-white rounded-lg text-xs disabled:opacity-50"
                        >
                          Day
                        </button>
                        <button
                          onClick={() =>
                            handleDownloadReport("range")
                          }
                          disabled={!startDate || !endDate}
                          className="flex-1 py-2 bg-secondary text-white rounded-lg text-xs disabled:opacity-50"
                        >
                          Range
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReportOptions(false)}
                      className="w-full py-1 text-xs underline"
                    >
                      Back
                    </button>
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
                    <button
                      onClick={() =>
                        handleViewTransactions("daily")
                      }
                      className="w-full py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80"
                    >
                      Today&apos;s Ledger
                    </button>

                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Select Range / Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) =>
                            setStartDate(e.target.value)
                          }
                          className={datePickerClassName}
                        />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) =>
                            setEndDate(e.target.value)
                          }
                          className={datePickerClassName}
                        />
                      </div>
                      <button
                        onClick={() =>
                          handleViewTransactions("range")
                        }
                        disabled={!startDate || !endDate}
                        className="w-full py-2 bg-secondary text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        View Range Ledger
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Invoice by Bill Number
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={selectedDailyBillNo}
                          onChange={(e) =>
                            setSelectedDailyBillNo(e.target.value)
                          }
                          placeholder="Bill #"
                          className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                        />
                        <button
                          onClick={() =>
                            handleViewTransactions("invoice")
                          }
                          disabled={!selectedDailyBillNo}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          Lookup
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setShowTransactionOptions(false)
                      }
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

      {/* Transaction Table Modal */}
      {showTransactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTransactions(false)}
          />
          <div className="relative z-10 w-full max-w-4xl max-h-[80vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">Transactions</h2>
              <button
                onClick={() => setShowTransactions(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {txnLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No transactions found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="p-3 text-left text-xs font-bold uppercase">Bill #</th>
                      <th className="p-3 text-left text-xs font-bold uppercase">Date</th>
                      <th className="p-3 text-right text-xs font-bold uppercase">Total</th>
                      <th className="p-3 text-right text-xs font-bold uppercase">Discount</th>
                      <th className="p-3 text-right text-xs font-bold uppercase">Cash</th>
                      <th className="p-3 text-right text-xs font-bold uppercase">UPI</th>
                      <th className="p-3 text-center text-xs font-bold uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((txn, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-bold">{String(txn.daily_bill_no || "-")}</td>
                        <td className="p-3 text-muted-foreground">{String(txn.created_at || "").slice(0, 16)}</td>
                        <td className="p-3 text-right font-bold">₹{Number(txn.total_amount || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-red-500">₹{Number(txn.discount || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">₹{Number(txn.cash_paid || 0).toFixed(2)}</td>
                        <td className="p-3 text-right">₹{Number(txn.upi_paid || 0).toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            txn.transaction_type === "REFUND"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {String(txn.transaction_type || "SALE")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Dashboard;
