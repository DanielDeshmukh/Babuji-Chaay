"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Receipt,
  FileText,
} from "lucide-react";
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
import { openAuthenticatedUrl, syncBackendSession } from "@/lib/apiClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const VISIBLE_POINTS = 7;

const openSecureLink = async (pathWithParams) => {
  try {
    await openAuthenticatedUrl(pathWithParams);
  } catch (err) {
    console.error("Auth Link Error:", err);
    alert(err.message || "Authentication failed.");
  }
};

const formatCurrency = (value) =>
  typeof value === "number" ? `Rs ${value.toLocaleString("en-IN")}` : value;

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
    "h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const formatLocalDate = (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-CA");
  };

  useEffect(() => {
    const syncSession = async () => {
      await syncBackendSession().catch((err) =>
        console.error("Session Sync failed", err)
      );
    };
    syncSession();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data: rows, error } = await supabase
          .from("daily_sales_summary")
          .select("sales_date, total_sales, total_loss, total_dump")
          .order("sales_date", { ascending: true });

        if (error) throw error;
        if (!rows?.length) return setHasData(false);

        setData(
          rows.map((row) => ({
            date: new Date(row.sales_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            sales: row.total_sales,
            loss: row.total_loss,
            dump: row.total_dump,
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

        const totalIncome =
          summaryData?.reduce(
            (sum, row) => sum + Number(row.total_sales || 0),
            0
          ) || 0;
        const totalExpenses =
          summaryData?.reduce(
            (sum, row) =>
              sum + Number(row.total_loss || 0) + Number(row.total_dump || 0),
            0
          ) || 0;

        const istStart = `${start}T00:00:00+05:30`;
        const istEnd = `${end}T23:59:59+05:30`;

        const { count: totalOrders, error: countErr } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .gte("created_at", istStart)
          .lte("created_at", istEnd);

        if (countErr) console.error("Order Count Error:", countErr);

        setKpis([
          {
            title: "Income",
            value: totalIncome,
            delta: "Current Period",
            icon: DollarSign,
            tone: "text-primary",
          },
          {
            title: "Orders",
            value: totalOrders || 0,
            delta: "Transactions",
            icon: ShoppingCart,
            tone: "text-foreground",
          },
          {
            title: "Expenses",
            value: totalExpenses,
            delta: "Loss and Dump",
            icon: Users,
            tone: "text-muted-foreground",
          },
          {
            title: "Growth",
            value: "Live",
            delta: "Active",
            icon: TrendingUp,
            tone: "text-primary",
          },
        ]);
      } catch (err) {
        console.error("KPI Fetch Critical Failure:", err);
      }
    };
    fetchKPIs();
  }, [startDate, endDate]);

  const getDateParams = (type) => {
    let startStr;
    let endStr;

    if (type === "range" && startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date cannot be later than end date.");
        return null;
      }
      startStr = `${formatLocalDate(startDate)}T00:00:00+05:30`;
      endStr = `${formatLocalDate(endDate)}T23:59:59+05:30`;
    } else if (type === "specific" && specificDate) {
      const dateValue = formatLocalDate(specificDate);
      startStr = `${dateValue}T00:00:00+05:30`;
      endStr = `${dateValue}T23:59:59+05:30`;
    } else {
      const today = formatLocalDate(new Date());
      startStr = `${today}T00:00:00+05:30`;
      endStr = `${today}T23:59:59+05:30`;
    }

    return `?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(
      endStr
    )}`;
  };

  const handleDownloadReport = (type) => {
    const params = getDateParams(type);
    if (!params) return;

    openSecureLink(`/api/reports/generate${params}`);
    setShowReportOptions(false);
  };

  const handleViewTransactions = async (type) => {
    let path = `/api/transactions`;

    if (type === "invoice") {
      if (!selectedDailyBillNo) {
        alert("Please enter a Daily Bill Number first.");
        return;
      }

      path = `/api/transactions/daily/${selectedDailyBillNo}/invoice?format=pdf`;
    } else {
      const params = getDateParams(type);
      if (!params) return;
      path += params;
    }

    await openSecureLink(path);
    setShowTransactionOptions(false);
  };

  const visibleData = data.length ? data.slice(-VISIBLE_POINTS) : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 lg:gap-6">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Overview of sales, reports, and transaction activity
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Overview
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.title} className="rounded-3xl border border-border">
                  <CardContent className="flex items-start justify-between p-5">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {kpi.title}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold">
                        {formatCurrency(kpi.value)}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {kpi.delta}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <Icon className={`h-5 w-5 ${kpi.tone}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            <Card className="w-full rounded-3xl border border-border lg:flex-1">
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  {hasData ? "Recent performance" : "No summary data available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
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
                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                        dy={10}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
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

            <div className="flex w-full flex-col gap-4 lg:basis-[34%]">
              <Card className="rounded-3xl border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showReportOptions ? (
                    <Button onClick={() => setShowReportOptions(true)}>
                      Export Reports
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleDownloadReport("daily")}
                      >
                        Daily Report
                      </Button>
                      <div className="space-y-2 border-t border-border pt-2">
                        <DatePicker
                          selected={specificDate}
                          onChange={setSpecificDate}
                          placeholderText="Specific Date"
                          customInput={<Input className={datePickerClassName} />}
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <DatePicker
                            selected={startDate}
                            onChange={setStartDate}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            placeholderText="Start"
                            customInput={<Input className={datePickerClassName} />}
                          />
                          <DatePicker
                            selected={endDate}
                            onChange={setEndDate}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            placeholderText="End"
                            customInput={<Input className={datePickerClassName} />}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Button
                            onClick={() => handleDownloadReport("specific")}
                            disabled={!specificDate}
                          >
                            Day
                          </Button>
                          <Button
                            onClick={() => handleDownloadReport("range")}
                            variant="secondary"
                            disabled={!startDate || !endDate}
                          >
                            Range
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowReportOptions(false)}
                      >
                        Back
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="h-5 w-5 text-primary" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showTransactionOptions ? (
                    <Button onClick={() => setShowTransactionOptions(true)}>
                      View Transactions
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleViewTransactions("daily")}
                      >
                        Today&apos;s Ledger
                      </Button>
                      <div className="space-y-2 border-t border-border pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Select Range / Date
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Input
                            type="date"
                            value={startDate || ""}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={datePickerClassName}
                          />
                          <Input
                            type="date"
                            value={endDate || ""}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={datePickerClassName}
                          />
                        </div>
                        <Input
                          type="text"
                          value={selectedDailyBillNo}
                          onChange={(e) => setSelectedDailyBillNo(e.target.value)}
                          placeholder="Daily Bill Number for invoice"
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Button
                            onClick={() => handleViewTransactions("range")}
                            disabled={!startDate || !endDate}
                          >
                            View Range Ledger
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleViewTransactions("invoice")}
                            disabled={!selectedDailyBillNo}
                          >
                            Invoice PDF
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTransactionOptions(false)}
                      >
                        Back
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Dashboard;
