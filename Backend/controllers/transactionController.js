import dayjs from "dayjs";
import { supabase } from "../supabaseClient.js";
import puppeteer from "puppeteer";

// --- Theme colors ---
const theme = {
  background: "#f9f9f9",
  foreground: "#222222",
  primary: "#0077c8",
  secondary: "#f3f3f3",
  accent: "#e0f0ff",
  invoiceBg: "#ffffff",
  border: "#ddd"
};

// --- View All Transactions (uses daily_bill_no) ---
export const viewTransactions = async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Babuji Chaay Transactions</title>
          <style>
            body { font-family:"Poppins", sans-serif; background:${theme.background}; padding:20px; color:${theme.foreground}; }
            h1 { text-align:center; color:${theme.primary}; margin-bottom:20px; }
            table { width:100%; border-collapse:collapse; background:${theme.invoiceBg}; border:1px solid ${theme.border}; border-radius:6px; overflow:hidden; }
            th, td { padding:10px; text-align:left; border-bottom:1px solid ${theme.border}; }
            th { background:${theme.primary}; color:#fff; }
            tr:nth-child(even) { background:${theme.secondary}; }
            tr:hover { background:${theme.accent}; cursor:pointer; }
          </style>
        </head>
        <body>
          <h1>☕ Babuji Chaay Transactions</h1>
          <table>
            <thead>
              <tr>
                <th>Bill No</th>
                <th>ID</th>
                <th>Date</th>
                <th>Total Amount (₹)</th>
                <th>Discount (₹)</th>
                <th>Cash Paid (₹)</th>
                <th>UPI Paid (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr onclick="window.open('/api/transactions/daily/${tx.daily_bill_no}/invoice', '_blank')">
                  <td>${tx.daily_bill_no ?? '-'}</td>
                  <td>${tx.id}</td>
                  <td>${dayjs(tx.created_at).format("DD MMM YYYY HH:mm")}</td>
                  <td>${tx.total_amount.toFixed(2)}</td>
                  <td>${(tx.discount || 0).toFixed(2)}</td>
                  <td>${(tx.cash_paid || 0).toFixed(2)}</td>
                  <td>${(tx.upi_paid || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch transactions" });
  }
};

// --- View Single Transaction Invoice (NOW uses daily_bill_no) ---
export const viewTransactionInvoice = async (req, res) => {
  try {
    // expect route param to be daily bill number, e.g. /api/transactions/daily/:billNo/invoice
    const { billNo } = req.params;
    const { format } = req.query;

    if (!billNo) throw new Error("Missing bill number parameter");

    // Fetch the most recent transaction matching this daily_bill_no (daily_bill_no is unique per date)
    const { data: txRows, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("daily_bill_no", billNo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!txRows || txRows.length === 0) throw new Error("Transaction not found for provided bill number");

    const txData = txRows[0];

    // --- NEW LOGIC TO BUILD ITEMS LIST ---
    let items = [];

    // Check if the 'products' JSONB array exists and is not empty
    if (txData.products && Array.isArray(txData.products) && txData.products.length > 0) {
      // 1. Get all product IDs from the transaction's JSONB
      const productIds = txData.products.map(p => p.product_id);

      // 2. Fetch all product details (just ID and name) from the 'products' table in one go
      const { data: productDetails, error: productError } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      if (productError) throw productError;

      // 3. Create a lookup map for product names (ID -> Name)
      const nameMap = new Map(productDetails.map(p => [p.id, p.name]));

      // 4. Map over the TRANSACTION's product list (txData.products)
      // This uses the correct historical quantity and price from the JSONB
      items = txData.products.map((item, index) => {
        const unitPrice = item.price;
        const quantity = item.quantity;
        return {
          sn: index + 1,
          name: nameMap.get(item.product_id) || "Unknown Product",
          qty: quantity,
          price: unitPrice,
          amt: unitPrice * quantity
        };
      });

    } else {
      // Fallback if 'products' JSONB is empty or missing
      // We calculate the subtotal from the total and discount
      const subtotal = Number(txData.total_amount) + Number(txData.discount || 0);
      items = [{
        sn: 1,
        name: "Total Transaction",
        qty: 1,
        price: subtotal,
        amt: subtotal
      }];
    }
    // --- END OF NEW LOGIC ---

    const subtotal = items.reduce((sum, i) => sum + Number(i.amt), 0);

    const invoiceData = {
      billNo: txData.daily_bill_no,
      date: dayjs(txData.created_at).format("DD-MMM-YYYY HH:mm"),
      shopName: "BABUJI CHAAY",
      address: "Babuji Chaay, shop no 5, ground floor,K.D. Empire, Mira Road (E), Thane - 401107",
      phone: "+91 8552084251",
      items,
      subtotal,
      discount: Number(txData.discount || 0),
      cashPaid: Number(txData.cash_paid || 0),
      upiPaid: Number(txData.upi_paid || 0),
      total: Number(txData.total_amount),
      status: "Paid"
    };

    // HTML invoice
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${invoiceData.billNo}</title>
          <style>
            body { font-family: "Poppins", sans-serif; background:${theme.background}; padding:20px; color:${theme.foreground}; }
            .invoice-container { max-width:420px; margin:auto; background:${theme.invoiceBg}; border:1px solid ${theme.border}; border-radius:6px; padding:15px; position:relative; }
            .ribbon { position:absolute; top:20px; left:-35px; background:${theme.primary}; color:white; transform:rotate(-45deg); width:130px; text-align:center; font-weight:bold; padding:4px 0; font-size:12px; }
            h1 { font-size:18px; text-align:center; margin:5px 0; font-weight:600; }
            .header-info { text-align:center; font-size:12px; line-height:1.5; }
            .bill-meta { font-size:12px; display:flex; justify-content:space-between; margin:10px 0; border-top:1px dashed #999; border-bottom:1px dashed #999; padding:5px 0; }
            table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
            th, td { text-align:left; padding:4px 6px; }
            th { border-bottom:1px dashed #aaa; font-weight:600; }
            td { border-bottom:1px dashed #ddd; }
            .totals { margin-top:8px; font-size:12px; border-top:1px dashed #999; padding-top:5px; }
            .totals div { display:flex; justify-content:space-between; margin:2px 0; }
            .total { font-weight:700; border-top:1px solid #000; padding-top:3px; }
            footer { text-align:center; font-size:11px; margin-top:12px; }
            .download-btn { display:block; text-align:center; margin-top:15px; }
            .download-btn a { background:${theme.primary}; color:#fff; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:14px; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="ribbon">${invoiceData.status}</div>
            <h1>${invoiceData.shopName}</h1>
            <div class="header-info">
              ${invoiceData.address}<br>
              PHONE: ${invoiceData.phone}
            </div>
            <div class="bill-meta">
              <span>Bill No: ${invoiceData.billNo}</span>
              <span>Date: ${invoiceData.date}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>SN</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Amt</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map(item => `
                  <tr>
                    <td>${item.sn}</td>
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.amt.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <div><span>Subtotal</span><span>₹ ${invoiceData.subtotal.toFixed(2)}</span></div>
              <div><span>Discount</span><span>₹ ${invoiceData.discount.toFixed(2)}</span></div>
              <div><span>Cash Paid</span><span>₹ ${invoiceData.cashPaid.toFixed(2)}</span></div>
              <div><span>UPI Paid</span><span>₹ ${invoiceData.upiPaid.toFixed(2)}</span></div>
              <div class="total"><span>TOTAL</span><span>₹ ${invoiceData.total.toFixed(2)}</span></div>
            </div>
            <div class="download-btn">
              <a href="/api/transactions/daily/${txData.daily_bill_no}/invoice?format=pdf" target="_blank">Download PDF</a>
            </div>
            <footer>Thank You</footer>
          </div>
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
        `attachment; filename="Invoice_TX-${txData.daily_bill_no}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate invoice" });
  }
};
