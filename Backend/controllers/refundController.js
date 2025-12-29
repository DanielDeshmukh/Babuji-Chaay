import dayjs from "dayjs";
import puppeteer from "puppeteer";
import { supabase } from "../supabaseClient.js";

/**
 * Helper: safe numeric parse
 */
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * GET /api/refund
 * Lists transactions that contain refunds
 */
export const listRefunds = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, created_at, refund")
      .not("refund", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listRefunds]", error);
      return res.status(500).json({ error: "Failed to fetch refunds" });
    }

    return res.status(200).json({ refunds: data || [] });
  } catch (err) {
    console.error("[listRefunds]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/refund/record
 * Records a refund against a transaction
 */
export const recordRefund = async (req, res) => {
  try {
    const { transaction_id, entries, refunded_by = null } = req.body ?? {};

    if (!transaction_id || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Invalid refund request" });
    }

    /* -------------------------------------------------------
       Fetch original SALE transaction
    ------------------------------------------------------- */
    const { data: sale, error: saleErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (saleErr || !sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    /* -------------------------------------------------------
       Create REFUND transaction
    ------------------------------------------------------- */
    const { data: refundTx, error: refundTxErr } = await supabase
      .from("transactions")
      .insert({
        transaction_type: "REFUND",
        parent_id: sale.id,
        user_id: sale.user_id,
        refunded_by,
        total_amount: 0
      })
      .select()
      .single();

    if (refundTxErr || !refundTx) {
      console.error("[recordRefund] refundTxErr", refundTxErr);
      return res.status(500).json({ error: "Failed to create refund transaction" });
    }

    let refundTotal = 0;

    /* -------------------------------------------------------
       Insert refund items
    ------------------------------------------------------- */
    for (const entry of entries) {
      const { billing_item_id, refund_qty } = entry;

      if (!billing_item_id || refund_qty <= 0) {
        return res.status(400).json({ error: "Invalid refund entry" });
      }

      const { data: saleItem, error: itemErr } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("id", billing_item_id)
        .single();

      if (itemErr || !saleItem) {
        return res.status(400).json({ error: "Invalid sale item" });
      }

      if (refund_qty > saleItem.quantity) {
        return res.status(400).json({ error: "Refund quantity exceeds sold quantity" });
      }

      const unitPrice = toNumber(saleItem.price) / toNumber(saleItem.quantity, 1);
      const amount = refund_qty * unitPrice;

      refundTotal += amount;

      const { error: refundItemErr } = await supabase
        .from("transaction_items")
        .insert({
          transaction_id: refundTx.id,
          sale_item_id: saleItem.id,
          product_id: saleItem.product_id,
          quantity: refund_qty,
          price: amount
        });

      if (refundItemErr) {
        console.error("[recordRefund] refundItemErr", refundItemErr);
        return res.status(400).json({ error: refundItemErr.message });
      }
    }

    /* -------------------------------------------------------
       Update refund transaction total
    ------------------------------------------------------- */
    const { error: updateErr } = await supabase
      .from("transactions")
      .update({ total_amount: refundTotal })
      .eq("id", refundTx.id);

    if (updateErr) {
      console.error("[recordRefund] updateErr", updateErr);
      return res.status(500).json({ error: "Failed to finalize refund" });
    }

    return res.status(200).json({
      ok: true,
      refund_transaction_id: refundTx.id
    });

  } catch (err) {
    console.error("[recordRefund]", err);
    return res.status(500).json({ error: "Refund failed" });
  }
};

/**
 * GET /api/refund/:transaction_id/receipt
 * Generates PDF for ONE refund transaction only
 */
export const getRefundReceipt = async (req, res) => {
  let browser;

  try {
    const refundId = toNumber(req.params.transaction_id);

    if (!refundId) {
      return res.status(400).send("Invalid refund ID");
    }

    /* -------------------------------------------------------
       Fetch REFUND transaction
    ------------------------------------------------------- */
    const { data: refund, error: refundErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", refundId)
      .eq("transaction_type", "REFUND")
      .single();

    if (refundErr || !refund) {
      return res.status(404).send("Refund not found");
    }

    /* -------------------------------------------------------
       Fetch refund items
    ------------------------------------------------------- */
    const { data: items, error: itemsErr } = await supabase
      .from("transaction_items")
      .select(`
        quantity,
        price,
        products (
          name
        )
      `)
      .eq("transaction_id", refund.id);

    if (itemsErr || !items || items.length === 0) {
      return res.status(404).send("No refund items found");
    }

    /* -------------------------------------------------------
       Generate PDF
    ------------------------------------------------------- */
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const rows = items
      .map(i => `
        <tr>
          <td>${i.products?.name || "Item"}</td>
          <td>${i.quantity}</td>
          <td>₹${toNumber(i.price).toFixed(2)}</td>
        </tr>
      `)
      .join("");

    const html = `
      <html>
        <body style="font-family: monospace">
          <h2>BABUJI CHAAY</h2>
          <h3>REFUND RECEIPT</h3>

          <p>Refund ID: ${refund.id}</p>
          <p>Date: ${dayjs(refund.created_at).format("DD MMM YYYY HH:mm")}</p>

          <table width="100%" border="1" cellspacing="0" cellpadding="4">
            <thead>
              <tr>
                <th align="left">Item</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <h3>Total Refund: ₹${toNumber(refund.total_amount).toFixed(2)}</h3>

          <p>Thank you</p>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: "80mm",
      printBackground: true
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=refund-${refund.id}.pdf`
    });

    return res.send(pdf);

  } catch (err) {
    console.error("[getRefundReceipt]", err);
    return res.status(500).send("Failed to generate receipt");
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
