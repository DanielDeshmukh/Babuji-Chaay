// controllers/transactionController.js
import dayjs from "dayjs";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

// -------------------------------------------------------------
// SUPABASE CLIENTS
// -------------------------------------------------------------
export const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service Role key for full backend access
);

export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// -------------------------------------------------------------
// THEME
// -------------------------------------------------------------
const theme = {
  background: "#ffffff",
  foreground: "#000000",
  border: "#999999",
};

// =====================================================
// VIEW ALL TRANSACTIONS
// =====================================================
export const viewTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("🔹 [viewTransactions] Checking session...");



    const { start, end } = req.query;


    let query = supabaseServer
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (start) query = query.gte("created_at", `${start}T00:00:00+05:30`);
    if (end) query = query.lte("created_at", `${end}T23:59:59+05:30`);

    const { data: transactions, error } = await query;

    if (error) throw error;

    console.log(`✅ Found ${transactions.length} transactions`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Babuji Chaay Transactions</title>
        <style>
          body { font-family: Helvetica; background:#f0f0f0; padding:20px; }
          h1 { text-align:center; margin-bottom:20px; }
          table { width:100%; border-collapse:collapse; background:white; border:1px solid ${theme.border}; }
          th, td { padding:10px; border-bottom:1px solid #eee; }
          th { background:#e8e8e8; }
          tr:nth-child(even) { background:#f9f9f9; }
          tr:hover { background:#f0f0f0; cursor:pointer; }
        </style>
      </head>
      <body>
        <h1>Your Transactions</h1>
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>ID</th>
              <th>Date</th>
              <th>Total (₹)</th>
              <th>Discount (₹)</th>
              <th>Cash (₹)</th>
              <th>UPI (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => `
              <tr onclick="window.open('/api/transactions/daily/${tx.daily_bill_no}/invoice', '_blank')">
                <td>${tx.daily_bill_no ?? "-"}</td>
                <td>${tx.id}</td>
                <td>${dayjs(tx.created_at).format("DD MMM YYYY HH:mm")}</td>
                <td>${tx.total_amount.toFixed(2)}</td>
                <td>${(tx.discount || 0).toFixed(2)}</td>
                <td>${(tx.cash_paid || 0).toFixed(2)}</td>
                <td>${(tx.upi_paid || 0).toFixed(2)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("❌ [viewTransactions] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =====================================================
// VIEW SINGLE TRANSACTION INVOICE
// =====================================================
export const viewTransactionInvoice = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }


    const { billNo } = req.params;
    const { format } = req.query;

    console.log(`🔹 Fetching invoice | Bill: ${billNo} | User: ${userId}`);

    const { data: txRows, error } = await supabaseServer
      .from("transactions")
      .select("*, applied_offer_ids")
      .eq("daily_bill_no", billNo)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!txRows?.length) throw new Error("Transaction not found for this user");

    const txData = txRows[0];

    // ---------------- APPLIED OFFERS ----------------
    let appliedOffers = [];
    if (txData.applied_offer_ids?.length) {
      const { data: offerData } = await supabaseServer
        .from("offers")
        .select("id, name")
        .in("id", txData.applied_offer_ids);
      appliedOffers = [...new Set(offerData?.map(o => o.name))];
    }

    // ---------------- ITEMS ----------------
    let items = [];
    if (Array.isArray(txData.products) && txData.products.length > 0) {
      const ids = txData.products.map(p => p.product_id);
      const { data: productDetails } = await supabaseServer
        .from("products")
        .select("id, name, price")
        .in("id", ids);

      const nameMap = new Map(productDetails.map(p => [p.id, p.name]));
      const priceMap = new Map(productDetails.map(p => [p.id, p.price]));

      items = txData.products.map((item, i) => {
        const name = nameMap.get(item.product_id) || "Unknown Product";
        const price = priceMap.get(item.product_id) ?? item.price;
        return { sn: i + 1, name, qty: item.quantity, price, amt: price * item.quantity };
      });
    } else {
      const subtotal = Number(txData.total_amount) + Number(txData.discount || 0);
      items = [{ sn: 1, name: "Total Transaction", qty: 1, price: subtotal, amt: subtotal }];
    }

    const subtotal = items.reduce((n, x) => n + x.amt, 0);

    const invoiceData = {
      billNo: txData.daily_bill_no,
      date: dayjs(txData.created_at).format("DD-MMM-YYYY HH:mm"),
      shopName: "BABUJI CHAAY",
      address: "Babuji Chaay, Shop no. 7, K.D. Empire, Mira Road (E), Thane - 401107",
      phone: "+91 9076165666",
      items,
      subtotal,
      discount: Number(txData.discount || 0),
      cashPaid: Number(txData.cash_paid || 0),
      upiPaid: Number(txData.upi_paid || 0),
      total: Number(txData.total_amount),
      appliedOffers,
    };

    const html = `
    <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <title>Invoice - ${invoiceData.billNo}</title>
              <style>
                body { 
                    font-family: monospace; 
                    padding: 0; 
                    margin: 0; 
                    color: #000000; 
                    background: #ffffff; 
                    max-width: 300px; 
                    margin-left: auto; 
                    margin-right: auto; 
                }
                .invoice-container { 
                    max-width: 300px; 
                    margin: auto; 
                    padding: 10px; 
                    line-height: 1.4;
                }
                h1 { font-size: 16px; text-align: center; margin: 5px 0 2px 0; font-weight: bold; }
                .header-info { text-align: center; font-size: 10px; border-bottom: 1px dashed #999999; padding-bottom: 5px; margin-bottom: 5px; }
                .bill-meta { font-size: 10px; display: flex; justify-content: space-between; border-bottom: 1px dashed #999999; padding-bottom: 5px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 5px; }
                th, td { text-align: left; padding: 2px 0; }
                th { border-bottom: 1px dashed #999999; font-weight: bold; }
                td:nth-child(2) { width: 45%; } 
                td:last-child { text-align: right; } 
                td:nth-child(4) { text-align: right; } 
                .totals { font-size: 11px; border-top: 1px dashed #999999; padding-top: 5px; }
                .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
                .discount-row { color: #000000; font-weight: normal; }
                .offers-list { font-size: 9px; margin-top: 2px; color: #000000; text-align: right; }
                .total { font-weight: bold; font-size: 12px; border-top: 1px dashed #999999; padding-top: 5px; margin-top: 5px !important; }
                footer { text-align: center; font-size: 10px; margin-top: 10px; font-weight: normal; color: #000000; border-top: 1px dashed #999999; padding-top: 5px; }
                .download-btn { display: ${format === 'pdf' ? 'none' : 'block'}; text-align: center; margin-top: 10px; }
                .download-btn a { color: #0077c8; text-decoration: none; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="invoice-container">
                <h1>${invoiceData.shopName}</h1>
                <div class="header-info">
                  ${invoiceData.address}<br>Ph: ${invoiceData.phone}
                </div>
                <div class="bill-meta">
                  <span>Bill No: ${invoiceData.billNo}</span>
                  <span>Date: ${invoiceData.date}</span>
                </div>
                <table>
                  <thead><tr><th>Qty</th><th>Item</th><th>Price</th><th>Amt</th></tr></thead>
                  <tbody>
                    ${invoiceData.items
        .map(
          (item) =>
            `<tr>
                                    <td>${item.qty}</td>
                                    <td>${item.name}</td>
                                    <td>${item.price.toFixed(2)}</td>
                                    <td>${item.amt.toFixed(2)}</td>
                                </tr>`
        )
        .join("")}
                  </tbody>
                </table>
                <div class="totals">
                  <div><span>SUBTOTAL</span><span>₹ ${invoiceData.subtotal.toFixed(2)}</span></div>
                    
                    ${invoiceData.discount > 0 ?
        `<div class="discount-row"><span>Discount Deducted</span><span>-₹ ${invoiceData.discount.toFixed(2)}</span></div>
                        <div class="offers-list">
                            Offers: ${invoiceData.appliedOffers.join(', ') || 'N/A'}
                        </div>`
        : ''}

                  <div><span>CASH</span><span>₹ ${invoiceData.cashPaid.toFixed(2)}</span></div>
                  <div><span>UPI</span><span>₹ ${invoiceData.upiPaid.toFixed(2)}</span></div>
                  <div class="total"><span>TOTAL PAID</span><span>₹ ${invoiceData.total.toFixed(2)}</span></div>
                </div>
                
                <div class="download-btn">
                    <a href="/api/transactions/daily/${txData.daily_bill_no}/invoice?format=pdf" target="_blank">Download PDF</a>
                </div>

                <footer>
                    *** Thank You. Visit Again ***
                </footer>
              </div>
            </body>
            </html>
    `;

    // ---------------- PDF MODE ----------------
    if (format === "pdf") {
      const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setViewport({ width: 300, height: 800 });
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({ width: "80mm", printBackground: true, margin: { top: "5mm", bottom: "5mm", left: "2mm", right: "2mm" } });

      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Invoice_TX-${txData.daily_bill_no}.pdf"`);
      return res.send(pdf);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("❌ [viewTransactionInvoice] Error:", err);
    res.status(500).json({ error: err.message });
  }
};
