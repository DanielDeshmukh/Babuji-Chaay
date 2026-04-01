// controllers/transactionController.js
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

import { supabaseServer } from "../middleware/auth.js";
import { renderPdfFromHtml } from "../utils/PDFGenerator.js";

const PDF_REQUEST_TIMEOUT_MS = Number(process.env.PDF_REQUEST_TIMEOUT_MS || 30000);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function safeFileNameFragment(value = "invoice") {
  return String(value).replace(/[^a-zA-Z0-9-_]/g, "_");
}

/* =====================================================
    VIEW ALL TRANSACTIONS (LEDGER UI)
===================================================== */
export const viewTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const authHeader = req.headers.authorization;
    const headerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    const requestToken =
      headerToken || req.query.token || req.cookies?.["sb-access-token"] || "";
    // Extract date filters from query parameters
    const { start, end } = req.query;

    /* -------------------------------
        FETCH TRANSACTIONS
    -------------------------------- */
    let query = supabaseServer
      .from("transactions")
      .select("id, total_amount, discount, cash_paid, upi_paid, daily_bill_no, created_at, transaction_type")
      .eq("user_id", userId);

    // Apply strict date filtering if parameters exist
    if (start && end) {
      const startDate = dayjs(start).startOf('day').toISOString();
      const endDate = dayjs(end).endOf('day').toISOString();
      
      query = query
        .gte("created_at", startDate)
        .lte("created_at", endDate);
    }

    const { data: transactions, error: txErr } = await query.order("created_at", { ascending: false });

    if (txErr) throw txErr;

    /* -------------------------------
        FETCH TRANSACTION ITEMS
    -------------------------------- */
    const txIds = transactions?.map(t => t.id) || [];

    const { data: items, error: itemErr } = await supabaseServer
      .from("transaction_items")
      .select(`
        transaction_id,
        quantity,
        unit_price,
        price,
        item_type,
        products ( name )
      `)
      .in("transaction_id", txIds)
      .eq("user_id", userId);

    if (itemErr) throw itemErr;

    const itemsByTx = {};
    items?.forEach(i => {
      if (!itemsByTx[i.transaction_id]) itemsByTx[i.transaction_id] = [];
      itemsByTx[i.transaction_id].push(i);
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/x-icon" href="./assets/icon.png" />
<title>Transactions | Babuji Chaay</title>
<style>
  body { margin:0; font-family:system-ui; display:flex; height:100vh; overflow:hidden; background:#f4f4f4; }
  .sidebar { flex:1; border-right:1px solid #e2d8c8; overflow-y:auto; background:#fff; }
  .row { padding:18px 25px; border-bottom:1px solid #e2d8c8; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
  .row:hover { background:#fdf5e6; }
  .row.active { background:#143d2c; color:#fff; }
  .preview { width:500px; background:#051a11; display:flex; flex-direction:column; align-items:center; padding: 20px 0; overflow-y: auto; }
  .preview-actions { width: 300px; display: flex; justify-content: space-between; margin-bottom: 15px; }
  .btn { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; text-decoration: none; font-family: sans-serif; }
  .btn-print { background: #fff; color: #000; }
  .btn-pdf { background: #0077c8; color: #fff; }
  iframe { width: 300px; height: 620px; border: none; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
</style>
</head>
<body>
<div class="sidebar">
  ${transactions?.length > 0 
    ? transactions.map(tx => `
    <div class="row" id="row-${tx.daily_bill_no}" onclick="loadPreview(${tx.daily_bill_no})">
      <div>
        <b>BILL #${tx.daily_bill_no}</b> ${tx.transaction_type === 'REFUND' ? '<small>(REFUND)</small>' : ''}<br>
        <small>${dayjs(tx.created_at).format("DD MMM, hh:mm A")}</small>
      </div>
      <b>₹${(Number(tx.total_amount) || 0).toFixed(2)}</b>
    </div>
  `).join("")
    : `<div style="padding:20px; text-align:center; color:#666;">No transactions found for this date.</div>`
  }
</div>
<div class="preview">
  <div class="preview-actions">
    <button class="btn btn-print" onclick="window.frames['f'].print()">Print Receipt</button>
    <a id="download-link" disabled href="#" target="_blank" class="btn btn-pdf">Download PDF</a>
  </div>
  <iframe id="f" name="f"></iframe>
</div>
<script>
const transactions = ${JSON.stringify(transactions || [])};
const itemsByTx = ${JSON.stringify(itemsByTx || {})};
const authToken = ${JSON.stringify(requestToken)};

function loadPreview(billNo) {
  document.querySelectorAll('.row').forEach(r => r.classList.remove('active'));
  document.getElementById('row-'+billNo)?.classList.add('active');
  const tx = transactions.find(t => t.daily_bill_no === billNo);
  if(!tx) return;

  const items = itemsByTx[tx.id] || [];
  const tokenQuery = authToken ? ("&token=" + encodeURIComponent(authToken)) : "";
  const txIdQuery = tx?.id ? ("&txId=" + encodeURIComponent(tx.id)) : "";
  document.getElementById('download-link').href = "/api/transactions/daily/" + billNo + "/invoice?format=pdf" + txIdQuery + tokenQuery;

  let subtotal = 0;
  let itemHtml = '';
  items.forEach(i => {
    const isRefund = i.item_type === 'REFUND';
    const amt = Number(i.price) || 0;
    subtotal += amt;
    
    itemHtml += \`
      <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:11px;">
        <span style="width:10%">\${i.quantity}</span>
        <span style="width:50%">\${i.products?.name || 'Item'}\${isRefund ? ' (Ret)' : ''}</span>
        <span style="width:20%; text-align:right;">\${Number(i.unit_price).toFixed(2)}</span>
        <span style="width:20%; text-align:right;">\${amt.toFixed(2)}</span>
      </div>\`;
  });

  const receiptHtml = \`
    <html>
    <head>
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 12px; color: #000; margin:0; line-height:1.2; }
        .dashed-line { border-top: 1px dashed #000; margin: 6px 0; }
        .flex { display: flex; justify-content: space-between; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: 16px;">BABUJI CHAAY</div>
      <div class="center" style="font-size: 10px;">Shop no 5, K.D. Empire, Mira Road (E)<br>Ph: +91 8552084251</div>
      <div class="dashed-line"></div>
      <div class="flex" style="font-size: 10px;">
        <span>Bill No: \${tx.daily_bill_no}</span>
        <span>\${new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
      </div>
      <div class="dashed-line"></div>
      <div class="flex bold" style="font-size: 10px;">
        <span style="width:10%">Qty</span><span style="width:50%">Item</span><span style="width:20%; text-align:right;">Price</span><span style="width:20%; text-align:right;">Amt</span>
      </div>
      <div class="dashed-line"></div>
      \${itemHtml}
      <div class="dashed-line"></div>
      <div style="font-size: 11px;">
        <div class="flex"><span>SUBTOTAL</span><span>₹ \${subtotal.toFixed(2)}</span></div>
        \${tx.discount > 0 ? \`<div class="flex"><span>DISCOUNT</span><span>-₹ \${Number(tx.discount).toFixed(2)}</span></div>\` : ''}
        <div class="flex"><span>CASH PAID</span><span>₹ \${Number(tx.cash_paid || 0).toFixed(2)}</span></div>
        <div class="flex"><span>UPI PAID</span><span>₹ \${Number(tx.upi_paid || 0).toFixed(2)}</span></div>
        <div class="dashed-line"></div>
        <div class="flex bold" style="font-size: 14px;"><span>TOTAL</span><span>₹ \${Number(tx.total_amount).toFixed(2)}</span></div>
      </div>
      <div class="dashed-line"></div>
      <div class="center" style="margin-top:10px; font-size: 10px;">*** Thank You. Visit Again ***</div>
    </body>
    </html>\`;

  const doc = document.getElementById('f').contentWindow.document;
  doc.open(); doc.write(receiptHtml); doc.close();
}
if(transactions.length > 0) loadPreview(transactions[0].daily_bill_no);
</script>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ledger Error");
  }
};

/* =====================================================
    VIEW SINGLE TRANSACTION INVOICE (PDF)
===================================================== */
export const viewTransactionInvoice = async (req, res) => {
  try {
    const { billNo } = req.params;
    const { format = "pdf", txId } = req.query;
    const userId = req.userId;

    if (format !== "pdf") {
      return res.status(400).json({ message: "Unsupported format. Use format=pdf." });
    }

    let tx = null;

    if (txId) {
      const { data: txById, error: txIdErr } = await supabaseServer
        .from("transactions")
        .select("id, total_amount, discount, cash_paid, upi_paid, daily_bill_no, created_at")
        .eq("id", txId)
        .eq("user_id", userId)
        .maybeSingle();

      if (txIdErr) throw txIdErr;
      tx = txById;
    }

    if (!tx) {
      const { data: txRows, error: txErr } = await supabaseServer
        .from("transactions")
        .select("id, total_amount, discount, cash_paid, upi_paid, daily_bill_no, created_at")
        .eq("daily_bill_no", billNo)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (txErr) throw txErr;
      tx = txRows?.[0] || null;
    }

    if (!tx) return res.status(404).send("Bill not found");

    const { data: items, error: itemsErr } = await supabaseServer
      .from("transaction_items")
      .select("quantity, unit_price, price, item_type, products(name)")
      .eq("transaction_id", tx.id)
      .eq("user_id", userId);

    if (itemsErr) throw itemsErr;

    const itemRows = (items || [])
      .map((item) => {
        const productName = escapeHtml(item.products?.name || "Item");
        const itemTypeLabel = item.item_type === "REFUND" ? " (Return)" : "";

        return `
          <tr>
            <td>${Number(item.quantity) || 0}</td>
            <td>${productName}${itemTypeLabel}</td>
            <td class="text-right">${toMoney(item.unit_price)}</td>
            <td class="text-right">${toMoney(item.price)}</td>
          </tr>`;
      })
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  @page { size: 58mm auto; margin: 0; }
  body { margin: 0; padding: 0; font-family: "Courier New", Courier, monospace; color: #000; }
  .receipt { width: 58mm; padding: 4mm; box-sizing: border-box; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .dashed-line { border-top: 1px dashed #000; margin: 6px 0; }
  .flex-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .text-right { text-align: right; }
</style>
</head>
<body>
  <div class="receipt">
    <div class="center bold" style="font-size: 14px;">BABUJI CHAAY</div>
    <div class="center" style="font-size: 9px;">Mira Road (E), Thane</div>
    <div class="dashed-line"></div>
    <div class="flex-row"><span>Bill: #${escapeHtml(tx.daily_bill_no)}</span><span>${dayjs(tx.created_at).format("DD/MM/YY HH:mm")}</span></div>
    <div class="dashed-line"></div>
    <table>
      <thead><tr><th style="width:10%">Q</th><th style="width:50%">Item</th><th style="width:20%" class="text-right">P</th><th style="width:20%" class="text-right">A</th></tr></thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    <div class="dashed-line"></div>
    <div class="flex-row"><span>CASH</span><span>Rs. ${toMoney(tx.cash_paid)}</span></div>
    <div class="flex-row"><span>UPI</span><span>Rs. ${toMoney(tx.upi_paid)}</span></div>
    <div class="dashed-line"></div>
    <div class="flex-row bold" style="font-size: 12px;"><span>TOTAL</span><span>Rs. ${toMoney(tx.total_amount)}</span></div>
    <div class="dashed-line"></div>
  </div>
</body>
</html>`;

    const pdf = await renderPdfFromHtml(html, {
      timeoutMs: PDF_REQUEST_TIMEOUT_MS,
      waitUntil: "networkidle0",
      pdfOptions: {
        width: "58mm",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="invoice-${safeFileNameFragment(String(tx.daily_bill_no))}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    console.error("Invoice PDF generation failed", {
      message: err.message,
      stack: err.stack,
      billNo: req.params.billNo,
      userId: req.userId,
    });
    res.status(500).json({
      message:
        "Failed to generate invoice PDF within 30 seconds. Please retry. If this keeps happening, contact support.",
    });
  }
};
