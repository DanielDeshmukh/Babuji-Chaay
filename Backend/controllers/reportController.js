// controllers/reportController.js
import PDFDocument from "pdfkit"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient.js"

/** Tailwind-inspired theme system */
// const theme = {
//   background: "hsl(0, 0%, 100%)", // --background
//   foreground: "hsl(222.2, 84%, 4.9%)", // --foreground
//   primary: "hsl(221.2, 83.2%, 53.3%)", // --primary
//   primaryForeground: "hsl(210, 40%, 98%)", // --primary-foreground
//   secondary: "hsl(210, 40%, 96%)", // --secondary
//   secondaryForeground: "hsl(222.2, 47.4%, 11.2%)", // --secondary-foreground
//   muted: "hsl(210, 40%, 96%)", // --muted
//   border: "hsl(214.3, 31.8%, 91.4%)", // --border
//   accent: "hsl(210, 40%, 96%)", // --accent
//   accentForeground: "hsl(222.2, 47.4%, 11.2%)",
//   destructive: "hsl(0, 84.2%, 60.2%)",
//   destructiveForeground: "hsl(210, 40%, 98%)",
// }

const theme = {
  background: "hsl(0, 0%, 100%)", // --background
  foreground: "hsl(222.2, 84%, 4.9%)", // --foreground
  primary: "hsl(221.2, 83.2%, 53.3%)", // --primary
  primaryForeground: "hsl(210, 40%, 98%)", // --primary-foreground
  secondary: "hsl(210, 40%, 96%)", // --secondary
  secondaryForeground: "hsl(222.2, 47.4%, 11.2%)", // --secondary-foreground
  muted: "hsl(210, 40%, 96%)", // --muted
  border: "hsl(214.3, 31.8%, 91.4%)", // --border
  accent: "hsl(210, 40%, 96%)", // --accent
  accentForeground: "hsl(222.2, 47.4%, 11.2%)",
  destructive: "hsl(0, 84.2%, 60.2%)",
  destructiveForeground: "hsl(210, 40%, 98%)",
}

export const generateSalesReport = async (req, res) => {
  try {
    const { start, end } = req.query
    if (!start || !end) {
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
      return res.status(400).json({ error: "Missing date range parameters" })
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from("daily_sales_summary")
      .select("*")
      .gte("sales_date", start)
      .lte("sales_date", end)
      .order("sales_date", { ascending: true })

    if (error) throw error

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.setHeader("Access-Control-Allow-Credentials", "true")

    // PDF config
    const filename = `Daily_Sales_Report_${start}_to_${end}.pdf`
    res.setHeader("Content-disposition", `inline; filename="${filename}"`)
    res.setHeader("Content-type", "application/pdf")

    const doc = new PDFDocument({ margin: 50 })
    doc.pipe(res)

    // Helper: header & footer
    const addHeader = (title) => {
      doc
        .fillColor(theme.primary)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(title, { align: "center" })
      doc.moveDown(0.5)
      doc
        .fillColor(theme.foreground)
        .font("Helvetica")
        .fontSize(12)
        .text(`Report Period: ${start} → ${end}`, { align: "center" })
      doc.moveDown(1.5)

      // separator
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(theme.border).stroke()
      doc.moveDown(1)
    }

    const addFooter = () => {
      doc.moveTo(50, 760).lineTo(550, 760).strokeColor(theme.border).stroke()
      doc
        .fontSize(9)
        .fillColor(theme.muted)
        .text(
          "Generated automatically by Babuji Chaay Sales System • © Saurabh Yadav & Daniel Deshmukh",
          50,
          770,
          { align: "center" }
        )
    }

    // Add header
    addHeader("☕ Babuji Chaay — Daily Sales Report")

    // Table headers
    doc
      .fillColor(theme.secondaryForeground)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Date", 60)
      .text("Sales", 140)
      .text("Loss", 220)
      .text("Dump", 300)
      .text("Items Sold", 380)
      .text("Closing Items", 470)

    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(theme.border).stroke()
    doc.moveDown(0.5)

    // Table rows
    let rowAlternate = false
    doc.font("Helvetica").fontSize(10)

    data.forEach((row) => {
      const y = doc.y
      // alternate row background for UX
      if (rowAlternate) {
        doc
          .rect(50, y - 2, 500, 18)
          .fillColor(theme.accent)
          .fill()
      }
      rowAlternate = !rowAlternate

      doc
        .fillColor(theme.foreground)
        .text(dayjs(row.sales_date).format("DD MMM YYYY"), 60, y)
        .text(`₹${row.total_sales}`, 140, y)
        .text(`₹${row.total_loss}`, 220, y)
        .text(`₹${row.total_dump}`, 300, y)
        .text(`${row.items_sold}`, 380, y)
        .text(`${row.closing_items}`, 470, y)

      doc.moveDown(0.6)
    })

    doc.moveDown(1.5)

    // Summary section
    const totalSales = data.reduce((sum, r) => sum + Number(r.total_sales), 0)
    const totalLoss = data.reduce((sum, r) => sum + Number(r.total_loss), 0)
    const totalDump = data.reduce((sum, r) => sum + Number(r.total_dump), 0)
    const totalItems = data.reduce((sum, r) => sum + r.items_sold, 0)

    doc
      .fillColor(theme.primary)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Summary", { underline: true })
    doc.moveDown(0.5)
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(theme.foreground)
      .text(`Total Sales: ₹${totalSales.toFixed(2)}`)
      .text(`Total Loss: ₹${totalLoss.toFixed(2)}`)
      .text(`Total Dump: ₹${totalDump.toFixed(2)}`)
      .text(`Total Items Sold: ${totalItems}`)

    // Footer
    addFooter()

    doc.end()
  } catch (err) {
    console.error(err)
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
    res.status(500).json({ error: err.message })
  }
}
