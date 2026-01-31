// controllers/reportController.js
import dayjs from "dayjs";
import { supabase } from "../supabaseClient.js";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

export const generateSalesReport = async (req, res) => {
  try {
    // Extract token from query to pass it forward to the PDF download link
    const { start, end, format, theme, token } = req.query;

    if (!start || !end) {
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
      return res.status(400).json({ error: "Missing date range parameters" });
    }

    // Fetch data
    const { data, error } = await supabase
      .from("daily_sales_summary")
      .select("*")
      .gte("sales_date", start)
      .lte("sales_date", end)
      .order("sales_date", { ascending: true });

    if (error) throw error;

    // Compute totals
    const totalSales = data.reduce((sum, r) => sum + Number(r.total_sales), 0);
    const totalLoss = data.reduce((sum, r) => sum + Number(r.total_loss), 0);
    const totalDump = data.reduce((sum, r) => sum + Number(r.total_dump), 0);
    const totalItems = data.reduce((sum, r) => sum + r.items_sold, 0);

    // Icon
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const iconPath = path.resolve(__dirname, "../assets/icon.png");
    const iconBase64 = fs.existsSync(iconPath)
      ? fs.readFileSync(iconPath, "base64")
      : "";

    // Body class for PDF only
    let bodyClass = "";
    if (format === "pdf") {
      bodyClass = theme === "dark" ? "dark" : "";
    }

    // HTML template
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" href="data:image/png;base64,${iconBase64}" />
      <title>Babuji Chaay Daily Sales Report</title>
      <style>
        :root {
          --background: hsl(40, 40%, 95%);
          --foreground: hsl(147, 44%, 15%);
          --card: hsl(40, 40%, 97%);
          --card-foreground: hsl(147, 44%, 15%);
          --primary: hsl(147, 44%, 21%);
          --primary-foreground: hsl(0, 0%, 100%);
          --secondary: hsl(45, 74%, 50%);
          --secondary-foreground: hsl(147, 44%, 15%);
          --accent: hsl(45, 74%, 50%);
          --accent-foreground: hsl(0, 0%, 100%);
          --muted: hsl(40, 25%, 85%);
          --muted-foreground: hsl(147, 10%, 35%);
          --border: hsl(40, 25%, 80%);
        }

        body.dark {
          --background: hsl(147, 44%, 10%);
          --foreground: hsl(40, 40%, 97%);
          --card: hsl(147, 44%, 15%);
          --card-foreground: hsl(40, 40%, 97%);
          --primary: hsl(45, 74%, 50%);
          --primary-foreground: hsl(147, 44%, 10%);
          --secondary: hsl(147, 20%, 25%);
          --secondary-foreground: hsl(45, 74%, 85%);
          --accent: hsl(45, 74%, 50%);
          --accent-foreground: hsl(147, 44%, 10%);
          --muted: hsl(147, 44%, 20%);
          --muted-foreground: hsl(40, 40%, 90%);
          --border: hsl(147, 44%, 25%);
        }

        body {
          font-family: "Inter", system-ui, sans-serif;
          background: var(--background);
          color: var(--foreground);
          margin: 0;
          padding: 2rem;
          transition: background 0.3s, color 0.3s;
        }

        header { text-align: center; margin-bottom: 2rem; }
        h1 { color: var(--accent); font-size: 1.8rem; margin-bottom: 0.25rem; }
        h2 { color: var(--secondary-foreground); font-size: 1rem; margin-bottom: 1.5rem; }

        .controls { text-align: center; margin-bottom: 1.5rem; }
        .theme-toggle {
          display: inline-flex; align-items: center; gap: 1rem;
          background: var(--card); border: 1px solid var(--border);
          border-radius: 8px; padding: 0.5rem 1rem;
        }

        .download-btn {
          display: inline-block; background-color: var(--primary);
          color: var(--primary-foreground); padding: 0.6rem 1rem;
          border: none; border-radius: 6px; font-weight: 500;
          text-decoration: none;
          cursor: pointer; margin-left: 1rem; transition: 0.2s;
        }
        .download-btn:hover { background-color: var(--accent); }

        table {
          width: 100%; border-collapse: collapse;
          background-color: var(--card); border: 1px solid var(--border);
          border-radius: 8px; overflow: hidden;
        }
        th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
        th { background-color: var(--secondary); color: var(--secondary-foreground); font-weight: 600; font-size: 0.9rem; }
        tr:nth-child(even) { background-color: var(--muted); }

        .summary {
          background-color: var(--card); border: 1px solid var(--border);
          border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem;
        }

        footer {
          text-align: center; color: var(--muted-foreground); font-size: 0.8rem;
          margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1rem;
        }

        @media print { .controls { display: none; } }
      </style>

      <script>
        document.addEventListener("DOMContentLoaded", () => {
          ${format !== "pdf" ? `
          const themeRadios = document.querySelectorAll("input[name='theme']");
          const downloadBtn = document.querySelector(".download-btn");

          themeRadios.forEach(radio => {
            radio.addEventListener("change", (e) => {
              document.body.classList.toggle("dark", e.target.value === "dark");
              const currentTheme = e.target.value;
              const url = new URL(downloadBtn.href, window.location.origin);
              url.searchParams.set("theme", currentTheme);
              downloadBtn.href = url.toString();
            });
          });
          ` : ""}
        });
      </script>
    </head>

    <body class="${bodyClass}">
      <header>
        <h1>☕ Babuji Chaay Daily Sales Report</h1>
        <h2>Report Period: ${start} → ${end}</h2>
      </header>

      ${format !== "pdf" ? `
      <div class="controls">
        <div class="theme-toggle">
          <label><input type="radio" name="theme" value="light" checked /> Light</label>
          <label><input type="radio" name="theme" value="dark" /> Dark</label>
          <a href="?start=${start}&end=${end}&format=pdf&theme=light${token ? `&token=${token}` : ''}" class="download-btn">⬇ Download PDF</a>
        </div>
      </div>
      ` : ""}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sales (₹)</th>
            <th>Loss (₹)</th>
            <th>Dump (₹)</th>
            <th>Items Sold</th>
            <th>Closing Items</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${dayjs(row.sales_date).format("DD MMM YYYY")}</td>
              <td>${Number(row.total_sales).toFixed(2)}</td>
              <td>${Number(row.total_loss).toFixed(2)}</td>
              <td>${Number(row.total_dump).toFixed(2)}</td>
              <td>${row.items_sold}</td>
              <td>${row.closing_items}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <section class="summary">
        <h3>Summary</h3>
        <p><strong>Total Sales:</strong> ₹${totalSales.toFixed(2)}</p>
        <p><strong>Total Loss:</strong> ₹${totalLoss.toFixed(2)}</p>
        <p><strong>Total Dump:</strong> ₹${totalDump.toFixed(2)}</p>
        <p><strong>Total Items Sold:</strong> ${totalItems}</p>
      </section>

      <footer>
        Generated automatically by <strong>Babuji Chaay Sales System</strong> • 
        © Saurabh Yadav & Daniel Deshmukh
      </footer>
    </body>
    </html>
    `;

    if (format === "pdf") {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" },
      });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Babuji_Chaay_Sales_Report_${start}_to_${end}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error(err);
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.status(500).json({ error: err.message });
  }
};