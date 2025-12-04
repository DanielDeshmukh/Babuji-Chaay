// controllers/refundController.js
import dayjs from "dayjs";
import { supabase } from "../supabaseClient.js";
import puppeteer from "puppeteer";
import { pool } from "../db/neonClient.js";

/**
 * Helper: safe numeric parse
 */
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * POST /api/refund/record
 *
 * Body:
 *  {
 *    transaction_id: number,
 *    entries: [{ billing_item_id: number, refund_qty: number }, ...],
 *    mode?: string,
 *    reasons?: string[],
 *    other_reason?: string,
 *    refunded_by?: string|null
 *  }
 */
const recordRefund = async (req, res) => {
  try {
    const payload = req.body ?? {};
    const {
      transaction_id,
      entries,
      mode = "cash",
      reasons = [],
      other_reason = "",
      refunded_by = null,
    } = payload;

    // Basic validation
    if (!transaction_id || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "transaction_id and non-empty entries are required" });
    }

    // normalize entries
    const normalizedEntries = entries.map((e) => ({
      billing_item_id: toNumber(e.billing_item_id, null),
      refund_qty: Math.max(0, toNumber(e.refund_qty, 0)),
    }));

    if (normalizedEntries.some((e) => !e.billing_item_id || e.refund_qty <= 0)) {
      return res.status(400).json({ error: "Each entry must include billing_item_id and refund_qty > 0" });
    }

    // Fetch transaction
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", Number(transaction_id))
      .limit(1);

    if (txErr) {
      return res.status(500).json({ error: "Failed to fetch transaction" });
    }
    if (!Array.isArray(txRows) || txRows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const tx = txRows[0];

    // Fetch billing items referenced by entries
    const billingIds = normalizedEntries.map((e) => e.billing_item_id);
    const { data: billingRows, error: billingErr } = await supabase
      .from("billing_items")
      .select("id, transaction_id, menu_item_id, quantity, price")
      .in("id", billingIds);

    if (billingErr) {
      return res.status(500).json({ error: "Failed to fetch billing items" });
    }

    // Validate billing items belong to transaction and all referenced exist
    const billingMap = (billingRows || []).reduce((m, b) => {
      m[b.id] = b;
      return m;
    }, {});

    for (const e of normalizedEntries) {
      const br = billingMap[e.billing_item_id];
      if (!br) {
        return res.status(400).json({ error: `Billing item ${e.billing_item_id} not found` });
      }
      if (Number(br.transaction_id) !== Number(tx.id)) {
        return res.status(400).json({ error: `Billing item ${e.billing_item_id} does not belong to the transaction` });
      }
      if (toNumber(br.quantity, 0) <= 0) {
        return res.status(400).json({ error: `Billing item ${e.billing_item_id} has zero quantity` });
      }
      if (e.refund_qty > toNumber(br.quantity, 0)) {
        return res.status(400).json({ error: `Refund qty for billing item ${e.billing_item_id} exceeds purchased quantity` });
      }
    }

    // Fetch product details for menu_item_ids
    const menuIds = [...new Set(Object.values(billingMap).map((b) => b.menu_item_id))];
    let products = [];
    if (menuIds.length > 0) {
      const { data: prodRows, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price")
        .in("id", menuIds);

      if (prodErr) {
        return res.status(500).json({ error: "Failed to fetch product details" });
      }
      products = prodRows || [];
    }

    const prodMap = (products || []).reduce((m, p) => {
      m[p.id] = p;
      return m;
    }, {});

    // Process entries -> compute per unit and amounts
    let refundTotal = 0;
    const processedEntries = normalizedEntries.map((e) => {
      const br = billingMap[e.billing_item_id];
      const maxQty = toNumber(br.quantity, 0);
      // clamp qty again defensively
      const qty = Math.max(1, Math.min(maxQty, toNumber(e.refund_qty, 1)));
      const perUnit = maxQty > 0 ? toNumber(br.price, 0) / maxQty : 0;
      const amount = Number((perUnit * qty).toFixed(2));

      refundTotal += amount;

      return {
        billing_item_id: br.id,
        product_id: br.menu_item_id,
        product_name: prodMap[br.menu_item_id]?.name ?? `#${br.menu_item_id}`,
        refund_qty: qty,
        per_unit_price: perUnit,
        refund_amount: amount,
        refunded_at: new Date().toISOString(),
        refunded_by: refunded_by ?? null,
      };
    });

    // Compose new refund object
    const existingRefund = tx.refund ?? {};
    const newRefund = {
      ...(existingRefund || {}),
      last_refund_mode: mode,
      last_refund_reasons: Array.isArray(reasons) && reasons.length > 0 ? reasons.join(", ") : other_reason || "N/A",
      history: [...(existingRefund.history || []), ...processedEntries],
      last_refunded_at: new Date().toISOString(),
      last_refund_total: Number(refundTotal.toFixed(2)),
    };

    // Update transaction refund field
    const { error: updateTxErr } = await supabase
      .from("transactions")
      .update({ refund: newRefund })
      .eq("id", tx.id);

    if (updateTxErr) {
      return res.status(500).json({ error: "Failed to update transaction refund field" });
    }

    // Update billing_items: reduce quantity or delete if zero
    // Use Promise.all to parallelize DB ops
    const billingUpdates = processedEntries.map(async (entry) => {
      const { data: currentRow, error: selErr } = await supabase
        .from("billing_items")
        .select("id, quantity")
        .eq("id", entry.billing_item_id)
        .single();

      if (selErr || !currentRow) {
        // skip silently if row missing; operation is idempotent enough
        return null;
      }

      const remaining = toNumber(currentRow.quantity, 0) - toNumber(entry.refund_qty, 0);

      if (remaining > 0) {
        return supabase
          .from("billing_items")
          .update({ quantity: remaining })
          .eq("id", entry.billing_item_id);
      } else {
        return supabase
          .from("billing_items")
          .delete()
          .eq("id", entry.billing_item_id);
      }
    });

    // Await all updates
    await Promise.all(billingUpdates);

    return res.status(200).json({
      ok: true,
      transaction_id: tx.id,
      newRefund,
      refunded_amount: Number(refundTotal.toFixed(2)),
      entries: processedEntries,
    });
  } catch (err) {
    // avoid leaking internal error details in production response
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/refund/:transaction_id/receipt?format=pdf
 *
 * If format=pdf -> returns a PDF with proper headers and attachment disposition.
 * Otherwise returns HTML receipt.
 */
const getRefundReceipt = async (req, res) => {
  let browser;
  try {
    const transactionIdRaw = req.params?.transaction_id;
    const format = String(req.query?.format ?? "").toLowerCase();

    if (!transactionIdRaw) {
      return res.status(400).json({ error: "transaction_id required" });
    }

    const transaction_id = Number(transactionIdRaw);
    if (!Number.isFinite(transaction_id)) {
      return res.status(400).json({ error: "invalid transaction_id" });
    }

    // Fetch transaction
    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .limit(1);

    if (txErr) {
      return res.status(500).json({ error: "Failed to fetch transaction" });
    }
    if (!Array.isArray(txRows) || txRows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const tx = txRows[0];

    // Build original items (fallback to single total if products missing)
    let items = [];
    if (Array.isArray(tx.products) && tx.products.length > 0) {
      const productIds = tx.products.map((p) => p.product_id).filter((id) => id != null);

      let productDetails = [];
      if (productIds.length > 0) {
        const { data: productRows } = await supabase
          .from("products")
          .select("id, name, price")
          .in("id", productIds);

        productDetails = productRows || [];
      }

      const nameMap = new Map((productDetails || []).map((p) => [p.id, p.name]));
      const priceMap = new Map((productDetails || []).map((p) => [p.id, p.price]));

      items = tx.products.map((item, i) => {
        const price = priceMap.get(item.product_id) ?? item.price ?? 0;
        const qty = toNumber(item.quantity, 0);
        return {
          sn: i + 1,
          name: nameMap.get(item.product_id) || "Unknown Product",
          qty,
          price,
          amt: Number((qty * price).toFixed(2)),
        };
      });
    } else {
      items = [
        {
          sn: 1,
          name: "Total Transaction",
          qty: 1,
          price: toNumber(tx.total_amount, 0),
          amt: toNumber(tx.total_amount, 0),
        },
      ];
    }

    const subtotal = items.reduce((s, it) => s + toNumber(it.amt, 0), 0);

    const refundHistory = Array.isArray(tx.refund?.history) ? tx.refund.history : [];
    const refundedItems = refundHistory;
    const refundedTotal = refundedItems.reduce((s, r) => s + toNumber(r.refund_amount, 0), 0);

    // Invoice data used in template
    const invoiceData = {
      shopName: "Babuji Chaay",
      address: "Near Station Road, Thane West",
      phone: "+91 9876543210",
      billNo: tx.daily_bill_no ?? "",
      date: dayjs(tx.created_at).format("DD-MMM-YYYY HH:mm"),
      refundDate: dayjs().format("DD-MMM-YYYY HH:mm"),
      items: refundedItems.map((it, idx) => ({
        sn: idx + 1,
        name: it.product_name,
        qty: toNumber(it.refund_qty, 0),
        price: toNumber(it.per_unit_price, 0),
        amt: toNumber(it.refund_amount, 0),
      })),
      subtotal: Number(refundedTotal.toFixed(2)),
      discount: 0,
      appliedOffers: [],
      cashPaid: toNumber(tx.cash_paid, 0),
      upiPaid: toNumber(tx.upi_paid, 0),
      total: Number(refundedTotal.toFixed(2)),
    };

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Refund Receipt - ${invoiceData.billNo}</title>
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
    h1 { 
        font-size: 16px; 
        text-align: center; 
        margin: 5px 0 2px 0; 
        font-weight: bold; 
    }
    .header-info { 
        text-align: center; 
        font-size: 10px; 
        border-bottom: 1px dashed #999999; 
        padding-bottom: 5px; 
        margin-bottom: 5px;
    }
    .bill-meta { 
        font-size: 10px; 
        display: flex; 
        justify-content: space-between; 
        border-bottom: 1px dashed #999999; 
        padding-bottom: 5px; 
        margin-bottom: 5px;
    }
    table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 10px; 
        margin-bottom: 5px; 
    }
    th, td { 
        text-align: left; 
        padding: 2px 0; 
    }
    th { 
        border-bottom: 1px dashed #999999; 
        font-weight: bold; 
    }
    td:nth-child(2) { width: 45%; } 
    td:last-child { text-align: right; } 
    td:nth-child(4) { text-align: right; } 
    .totals { 
        font-size: 11px; 
        border-top: 1px dashed #999999; 
        padding-top: 5px; 
    }
    .totals div { 
        display: flex; 
        justify-content: space-between; 
        margin: 2px 0; 
    }
    .total { 
        font-weight: bold; 
        font-size: 12px; 
        border-top: 1px dashed #999999; 
        padding-top: 5px; 
        margin-top: 5px !important; 
    }
    footer { 
        text-align: center; 
        font-size: 10px; 
        margin-top: 10px; 
        font-weight: normal; 
        color: #000000; 
        border-top: 1px dashed #999999;
        padding-top: 5px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <h1>${invoiceData.shopName}</h1>
    <div class="header-info">
      ${invoiceData.address}<br>Ph: ${invoiceData.phone}
    </div>
    <div class="bill-meta">
      <span>Refund For Bill: ${invoiceData.billNo}</span>
      <span>Refund Date: ${invoiceData.refundDate}</span>
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
      <div><span>REFUND TOTAL</span><span>₹ ${invoiceData.total.toFixed(2)}</span></div>
    </div>

    <footer>
        *** Refund Processed Successfully ***
    </footer>
  </div>
</body>
</html>`;

    if (format === "pdf") {
      // Launch puppeteer and produce pdf buffer
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 300, height: 800 });
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        width: "80mm",
        printBackground: true,
      });

      // Send PDF with appropriate headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=refund_${transaction_id}.pdf`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
      return;
    }

    // default: return HTML
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors
      }
    }
  }
};

/**
 * GET /api/refund/list
 */
const listRefunds = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, refund, created_at, user_id
       FROM transactions
       WHERE refund IS NOT NULL AND refund <> '{}'::jsonb
       ORDER BY created_at DESC`
    );

    return res.status(200).json({ success: true, refunds: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export { recordRefund, getRefundReceipt, listRefunds };
