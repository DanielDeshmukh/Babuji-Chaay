// controllers/reportController.js
import PDFDocument from "pdfkit"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient.js"

export const generateSalesReport = async (req, res) => {
  try {
    const { start, end } = req.query

    if (!start || !end) {
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

    // Create PDF
    const doc = new PDFDocument({ margin: 50 })
    const filename = `Daily_Sales_Report_${start}_to_${end}.pdf`

    res.setHeader("Content-disposition", `inline; filename="${filename}"`)
    res.setHeader("Content-type", "application/pdf")

    doc.pipe(res)

    // Header
    doc
      .fontSize(20)
      .text("☕ Babuji Chaay — Daily Sales Report", { align: "center" })
      .moveDown()
      .fontSize(12)
      .text(`Report Period: ${start} to ${end}`, { align: "center" })
      .moveDown(2)

    // Table headers
    doc
      .font("Helvetica-Bold")
      .text("Date", 50)
      .text("Sales", 120)
      .text("Loss", 190)
      .text("Dump", 260)
      .text("Items Sold", 330)
      .text("Closing Items", 420)
      .moveDown(0.5)

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    // Table rows
    doc.font("Helvetica")
    data.forEach((row) => {
      doc
        .text(dayjs(row.sales_date).format("DD MMM YYYY"), 50)
        .text(`₹${row.total_sales}`, 120)
        .text(`₹${row.total_loss}`, 190)
        .text(`₹${row.total_dump}`, 260)
        .text(`${row.items_sold}`, 330)
        .text(`${row.closing_items}`, 420)
      doc.moveDown(0.5)
    })

    // Summary section
    const totalSales = data.reduce((sum, r) => sum + Number(r.total_sales), 0)
    const totalLoss = data.reduce((sum, r) => sum + Number(r.total_loss), 0)
    const totalDump = data.reduce((sum, r) => sum + Number(r.total_dump), 0)
    const totalItems = data.reduce((sum, r) => sum + r.items_sold, 0)

    doc.moveDown(1.5)
    doc.font("Helvetica-Bold")
    doc.text("Summary", { underline: true }).moveDown(0.5)
    doc.font("Helvetica")
    doc.text(`Total Sales: ₹${totalSales.toFixed(2)}`)
    doc.text(`Total Loss: ₹${totalLoss.toFixed(2)}`)
    doc.text(`Total Dump: ₹${totalDump.toFixed(2)}`)
    doc.text(`Total Items Sold: ${totalItems}`)
    doc.moveDown(1)

    // Footer
    doc.moveDown(2)
    doc.fontSize(10).fillColor("gray")
    doc.text(
      "Generated automatically by Babuji Chaay Sales System • All rights reserved © Saurabh Yadav & Daniel Deshmukh",
      { align: "center" }
    )

    doc.end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
