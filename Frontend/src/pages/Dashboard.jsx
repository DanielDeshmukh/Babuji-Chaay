"use client"

import { useEffect, useState, useMemo } from "react"
import { TrendingUp, Users, DollarSign, ShoppingCart } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import Header from "../components/Header"
import Footer from "../components/Footer"
import supabase from "../lib/supabaseClient"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"

const VISIBLE_POINTS = 7

function CircularMeter({ value = 76, label = "Task Progress", small = false }) {
  const size = small ? 120 : 160
  const stroke = small ? 10 : 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gradA" x1="0%" x2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradA)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          fill="transparent"
          style={{ filter: "url(#glow)" }}
        />
      </svg>

      <div className="flex flex-col items-center">
        <div className="text-lg font-semibold text-foreground">{value}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

const formatCurrency = (v) =>
  typeof v === "number" ? `₹${v.toLocaleString()}` : v

function Dashboard() {
  const [data, setData] = useState([])
  const [hasData, setHasData] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [showReportOptions, setShowReportOptions] = useState(false)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [specificDate, setSpecificDate] = useState(null)
  const [visibleSeries, setVisibleSeries] = useState({
    sales: true,
    loss: false,
    dump: false,
  })

  // Fetch daily summary from Supabase
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data: rows, error } = await supabase
          .from("daily_sales_summary")
          .select("sales_date, total_sales, total_loss, total_dump")
          .order("sales_date", { ascending: true })

        if (error) throw error
        if (!rows?.length) {
          setHasData(false)
          return
        }

        const formatted = rows.map((r) => ({
          date: new Date(r.sales_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
          sales: r.total_sales,
          loss: r.total_loss,
          dump: r.total_dump,
        }))

        setData(formatted)
        setHasData(true)
      } catch (err) {
        console.error("Error fetching summary:", err)
        setHasData(false)
      }
    }

    fetchSummary()
  }, [])

  // 🧾 Generate PDF report from Express backend
  const downloadReport = async (type) => {
    try {
      setLoadingReport(true)

      let query = ""
      if (type === "range" && startDate && endDate) {
        query = `?start=${startDate.toISOString().split("T")[0]}&end=${endDate
          .toISOString()
          .split("T")[0]}`
      } else if (type === "specific" && specificDate) {
        const d = specificDate.toISOString().split("T")[0]
        query = `?start=${d}&end=${d}`
      } else if (type === "daily") {
        const today = new Date().toISOString().split("T")[0]
        query = `?start=${today}&end=${today}`
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/generate${query}`
      )

      if (!response.ok) throw new Error("Failed to generate report")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales_report_${type}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      setShowReportOptions(false)
      setSpecificDate(null)
      setStartDate(null)
      setEndDate(null)
    } catch (err) {
      console.error("Report download failed:", err)
      alert("Failed to generate report.")
    } finally {
      setLoadingReport(false)
    }
  }

  const kpis = useMemo(
    () => [
      {
        title: "Income",
        value: 40000,
        delta: "15%",
        icon: DollarSign,
        color: "var(--accent)",
      },
      {
        title: "Orders",
        value: 20000,
        delta: "12%",
        icon: ShoppingCart,
        color: "var(--secondary)",
      },
      {
        title: "Expenses",
        value: 5000,
        delta: "-2%",
        icon: Users,
        color: "var(--secondary-foreground)",
      },
      {
        title: "Growth",
        value: "5.2%",
        delta: "↑",
        icon: TrendingUp,
        color: "var(--primary)",
      },
    ],
    []
  )

  const visibleData = data.length
    ? data.slice(-VISIBLE_POINTS)
    : Array.from({ length: VISIBLE_POINTS }).map((_, i) => ({
        date: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7],
        sales: Math.round(200 + Math.sin(i / 2) * 40 + i * 10),
        loss: Math.round(80 + Math.cos(i / 3) * 20),
        dump: Math.round(30 + (i % 3) * 10),
      }))

  const datePickerClassName =
    "px-3 py-2 rounded-md bg-card text-card-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300"

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <div className="px-3 py-1 rounded-md text-sm bg-muted text-muted-foreground">
              Overview
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Sales Reports</div>
            <button
              onClick={() => setShowReportOptions(!showReportOptions)}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              {showReportOptions ? "Close" : "Export"}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.title}
                className="relative rounded-xl p-4 bg-card border border-border shadow-xl transition-colors duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {kpi.title}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-card-foreground">
                      {formatCurrency(kpi.value)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {kpi.delta} vs last month
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-md h-10 w-10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chart + Reports section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl bg-card backdrop-blur-md border border-border shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-card-foreground">
                      Earnings
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      This week vs last week
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Last {VISIBLE_POINTS} days
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <div style={{ height: 320 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={visibleData}
                      margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
                    >
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
                          <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--primary)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      {visibleSeries.sales && (
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
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Trending up by 5.2% this month
                </div>
                <div className="text-xs text-muted-foreground">
                  Past {VISIBLE_POINTS} days
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Reports Section */}
          <div className="space-y-6">
            <Card className="rounded-2xl bg-card border border-border shadow-xl p-4">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-card-foreground text-base">
                    Reports
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Export PDFs
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {!showReportOptions ? (
                  <button
                    className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    onClick={() => setShowReportOptions(true)}
                    disabled={loadingReport}
                  >
                    {loadingReport ? "Generating..." : "Download Report"}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Daily and Specific */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="px-3 py-2 rounded-md bg-card text-card-foreground"
                        onClick={() => downloadReport("daily")}
                        disabled={loadingReport}
                      >
                        Daily Report
                      </button>
                      <DatePicker
                        selected={specificDate}
                        onChange={setSpecificDate}
                        placeholderText="Select Day"
                        className={datePickerClassName}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-primary text-primary-foreground"
                        onClick={() => downloadReport("specific")}
                        disabled={!specificDate || loadingReport}
                      >
                        Specific Day
                      </button>
                    </div>

                    {/* Range */}
                    <div className="flex gap-2 flex-wrap">
                      <DatePicker
                        selected={startDate}
                        onChange={setStartDate}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        placeholderText="Start Date"
                        className={datePickerClassName}
                      />
                      <DatePicker
                        selected={endDate}
                        onChange={setEndDate}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        placeholderText="End Date"
                        className={datePickerClassName}
                      />
                      <button
                        className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
                        onClick={() => downloadReport("range")}
                        disabled={!startDate || !endDate || loadingReport}
                      >
                        Range Report
                      </button>
                    </div>

                    <button
                      className="px-3 py-2 rounded-md bg-muted text-muted-foreground"
                      onClick={() => setShowReportOptions(false)}
                    >
                      Cancel
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
  )
}

export default Dashboard
