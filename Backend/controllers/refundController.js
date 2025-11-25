// controllers/refundController.js
import dayjs from "dayjs";
import { supabase } from "../supabaseClient.js";
import puppeteer from "puppeteer";
import { pool } from "../db/neonClient.js";

/**
 * POST /api/refund/record
 */
const recordRefund = async (req, res) => {
  console.log("🔵 [recordRefund] STEP 1: Incoming Body:", JSON.stringify(req.body, null, 2));

  try {
    const {
      transaction_id,
      entries,
      mode = "cash",
      reasons = [],
      other_reason = "",
      refunded_by = null,
    } = req.body;

    if (!transaction_id || !Array.isArray(entries) || entries.length === 0) {
      console.log("❌ [recordRefund] Missing transaction_id or entries");
      return res.status(400).json({ error: "transaction_id and entries required" });
    }

    // STEP 2: Fetch transaction
    console.log("🔵 [recordRefund] STEP 2: Fetching transaction:", transaction_id);

    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .limit(1);

    console.log("🟡 [recordRefund] STEP 2 RESULT:", JSON.stringify({ txRows, txErr }, null, 2));

    if (txErr) throw txErr;
    if (!txRows?.length) return res.status(404).json({ error: "Transaction not found" });

    const tx = txRows[0];

    // STEP 3: Fetch billing items
    const billingIds = entries.map(e => e.billing_item_id);
    console.log("🔵 [recordRefund] STEP 3: Billing Item IDs:", JSON.stringify(billingIds));

    const { data: billingRows, error: billingErr } = await supabase
      .from("billing_items")
      .select("id, transaction_id, menu_item_id, quantity, price")
      .in("id", billingIds);

    console.log("🟡 [recordRefund] STEP 3 RESULT:", JSON.stringify({ billingRows, billingErr }, null, 2));

    if (billingErr) throw billingErr;

    // STEP 4: Fetch product names
    const menuIds = [...new Set((billingRows || []).map(b => b.menu_item_id))];
    console.log("🔵 [recordRefund] STEP 4: Fetching product names for IDs:", JSON.stringify(menuIds));

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price")
      .in("id", menuIds);

    console.log("🟡 [recordRefund] STEP 4 RESULT:", JSON.stringify({ products, prodErr }, null, 2));

    if (prodErr) throw prodErr;

    const prodMap = (products || []).reduce((m, p) => {
      m[p.id] = p;
      return m;
    }, {});

    console.log("🟣 [recordRefund] STEP 4 Mapped Product Dictionary:", JSON.stringify(prodMap, null, 2));

    // STEP 5: Process refund entries
    console.log("🔵 [recordRefund] STEP 5: Processing refund entries");

    let refundTotal = 0;
    const processedEntries = [];

    for (const e of entries) {
      console.log("   ➤ Processing entry:", JSON.stringify(e));

      const billingRow = billingRows.find(b => b.id === e.billing_item_id);
      console.log("     ⮞ Matched Billing Row:", JSON.stringify(billingRow));

      if (!billingRow) {
        return res.status(400).json({ error: `Billing item ${e.billing_item_id} not found` });
      }

      const maxQty = Number(billingRow.quantity);
      const qty = Math.max(1, Math.min(maxQty, Number(e.refund_qty || 1)));
      const perUnit = maxQty > 0 ? Number(billingRow.price) / maxQty : 0;
      const amount = Number((perUnit * qty).toFixed(2));

      refundTotal += amount;

      processedEntries.push({
        billing_item_id: billingRow.id,
        product_id: billingRow.menu_item_id,
        product_name: prodMap[billingRow.menu_item_id]?.name || `#${billingRow.menu_item_id}`,
        refund_qty: qty,
        per_unit_price: perUnit,
        refund_amount: amount,
        refunded_at: new Date().toISOString(),
        refunded_by: refunded_by || null,
      });

      console.log(
        "     ⮞ Calculated Refund Item:",
        JSON.stringify(processedEntries[processedEntries.length - 1], null, 2)
      );
    }

    console.log("🟢 [recordRefund] STEP 5 RESULT: Processed Entries:", JSON.stringify(processedEntries, null, 2));
    console.log("🟢 Total Refund Amount:", refundTotal);

    // STEP 6: Update refund object
    const existingRefund = tx.refund ?? {};

    const newRefund = {
      ...(existingRefund || {}),
      last_refund_mode: mode,
      last_refund_reasons: reasons.join(", ") || other_reason || "N/A",
      history: [...(existingRefund.history || []), ...processedEntries],
      last_refunded_at: new Date().toISOString(),
      last_refund_total: refundTotal,
    };

    console.log("🔵 [recordRefund] STEP 6: Updating Transaction Refund Field:", JSON.stringify(newRefund, null, 2));

    await supabase
      .from("transactions")
      .update({ refund: newRefund })
      .eq("id", tx.id);

    // STEP 7: Update billing_items
    console.log("🔵 [recordRefund] STEP 7: Updating Billing Items Quantities");

    for (const entry of processedEntries) {
      console.log("   ➤ Updating entry:", JSON.stringify(entry));

      const { data: row } = await supabase
        .from("billing_items")
        .select("id, quantity")
        .eq("id", entry.billing_item_id)
        .single();

      console.log("     ⮞ Current DB Row:", JSON.stringify(row));

      if (!row) continue;

      const remaining = Number(row.quantity) - Number(entry.refund_qty);
      console.log("     ⮞ Remaining Quantity:", remaining);

      if (remaining > 0) {
        await supabase.from("billing_items")
          .update({ quantity: remaining })
          .eq("id", entry.billing_item_id);

        console.log("     ⮞ Updated quantity to:", remaining);
      } else {
        await supabase.from("billing_items")
          .delete()
          .eq("id", entry.billing_item_id);

        console.log("     ⮞ Deleted billing item because quantity hit zero");
      }
    }

    console.log("🟢 [recordRefund] COMPLETED SUCCESSFULLY");

    return res.json({
      ok: true,
      transaction_id: tx.id,
      newRefund,
      refunded_amount: refundTotal,
      entries: processedEntries,
    });
  } catch (err) {
    console.error("❌ [recordRefund] error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/refund/:transaction_id/receipt?format=pdf
 */
const getRefundReceipt = async (req, res) => {
  console.log("🔵 [getRefundReceipt] Incoming Params:", req.params);

  try {
    const { transaction_id } = req.params;
    const { format } = req.query;

    if (!transaction_id) {
      return res.status(400).json({ error: "transaction_id required" });
    }

    console.log("🔵 Fetching Transaction for Receipt ID:", transaction_id);

    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", Number(transaction_id))
      .limit(1);

    console.log("🟡 Transaction Fetch Result:", JSON.stringify({ txRows, txErr }, null, 2));

    if (txErr) throw txErr;
    if (!txRows?.length) return res.status(404).json({ error: "Transaction not found" });

    const tx = txRows[0];

    // Build items
    let items = [];

    console.log("🔵 Building Receipt Items...");

    if (Array.isArray(tx.products) && tx.products.length > 0) {
      const productIds = tx.products.map(p => p.product_id);

      console.log("🔵 Fetch Product Details for:", JSON.stringify(productIds));

      const { data: productDetails } = await supabase
        .from("products")
        .select("id, name, price")
        .in("id", productIds);

      console.log("🟡 Product Details:", JSON.stringify(productDetails));

      const nameMap = new Map(productDetails.map(p => [p.id, p.name]));
      const priceMap = new Map(productDetails.map(p => [p.id, p.price]));

      items = tx.products.map((item, i) => ({
        sn: i + 1,
        name: nameMap.get(item.product_id) || "Unknown Product",
        qty: item.quantity,
        price: priceMap.get(item.product_id) ?? item.price,
        amt: Number(item.quantity) * Number(priceMap.get(item.product_id) ?? item.price),
      }));

      console.log("🟢 Final Mapped Receipt Items:", JSON.stringify(items, null, 2));
    } else {
      items = [{
        sn: 1,
        name: "Total Transaction",
        qty: 1,
        price: Number(tx.total_amount),
        amt: Number(tx.total_amount),
      }];

      console.log("🟡 No product array, using fallback:", JSON.stringify(items, null, 2));
    }

    const subtotal = items.reduce((s, it) => s + Number(it.amt), 0);

    const refundHistory = Array.isArray(tx.refund?.history) ? tx.refund.history : [];
    const refundedItems = refundHistory;
    const refundedTotal = refundedItems.reduce((s, r) => s + Number(r.refund_amount), 0);

    console.log("🔵 Refund History:", JSON.stringify(refundedItems, null, 2));

    const invoiceData = {
      billNo: tx.daily_bill_no,
      date: dayjs(tx.created_at).format("DD-MMM-YYYY HH:mm"),
      refundDate: dayjs().format("DD-MMM-YYYY HH:mm"),
      items,
      subtotal,
      total: Number(tx.total_amount),
      refundedTotal,
    };

    console.log("🟢 Final Invoice Data:", JSON.stringify(invoiceData, null, 2));

    // Render PDF
    if (format === "pdf") {
      console.log("🔵 Generating PDF...");

      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 300, height: 800 });
      await page.setContent("<html><body>Refund PDF</body></html>");

      const pdfBuffer = await page.pdf({
        width: "80mm",
        printBackground: true,
      });

      await browser.close();

      console.log("🟢 PDF Generated!");

      res.setHeader("Content-Type", "application/pdf");
      return res.send(pdfBuffer);
    }

    return res.send("<html><body>Refund Receipt</body></html>");

  } catch (err) {
    console.error("❌ [getRefundReceipt] error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/refund/list
 */
const listRefunds = async (req, res) => {
  try {
    console.log("🔵 [listRefunds] Fetching Refund List...");

    const result = await pool.query(
      `SELECT id, refund, created_at, user_id
       FROM transactions
       WHERE refund IS NOT NULL AND refund <> '{}'::jsonb
       ORDER BY created_at DESC`
    );

    console.log("🟡 [listRefunds] Query Result:", JSON.stringify(result.rows, null, 2));

    return res.json({ success: true, refunds: result.rows });
  } catch (err) {
    console.error("❌ listRefunds error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export { recordRefund, getRefundReceipt, listRefunds };
