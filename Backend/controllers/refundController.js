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
 * GET /api/refund/list
 * Lists refund transactions
 */
export const listRefunds = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, created_at, total_amount, parent_id")
      .eq("transaction_type", "REFUND")
      .eq("user_id", req.userId)
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
 * Records a refund against a SALE transaction
 */
export const recordRefund = async (req, res) => {
  try {
    const { transaction_id, entries } = req.body ?? {};
    const refunded_by = req.userId;

    if (!transaction_id || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Invalid refund request" });
    }

    /* -------------------------------------------------------
       1. Fetch SALE transaction
    ------------------------------------------------------- */
    const { data: sale, error: saleErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (saleErr || !sale) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (sale.transaction_type !== "SALE") {
      return res
        .status(400)
        .json({ error: "Cannot refund a refund transaction" });
    }

    /* -------------------------------------------------------
       2. Fetch SALE items (SOURCE OF TRUTH)
    ------------------------------------------------------- */
    const { data: saleItems, error: saleItemsErr } = await supabase
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", sale.id)
      .eq("item_type", "SALE");

    if (saleItemsErr || !saleItems.length) {
      return res.status(400).json({ error: "No sale items found" });
    }

    let refundTotal = 0;
    const refundItemsPayload = [];

    /* -------------------------------------------------------
       3. Validate refund entries
    ------------------------------------------------------- */
    for (const entry of entries) {
      const { product_id, refund_qty } = entry;

      if (!product_id || refund_qty <= 0) {
        return res.status(400).json({ error: "Invalid refund entry" });
      }

      const saleItem = saleItems.find(
        (i) => Number(i.product_id) === Number(product_id)
      );

      if (!saleItem) {
        return res.status(400).json({ error: "Product not found in sale" });
      }

      /* -----------------------------------------------
         Already refunded quantity check
         (NO parent_id — correct by schema)
      ----------------------------------------------- */
      const { data: refundedItems, error: refundedErr } = await supabase
        .from("transaction_items")
        .select("quantity")
        .eq("transaction_id", sale.id)
        .eq("product_id", product_id)
        .eq("item_type", "REFUND");

      if (refundedErr) {
        console.error(refundedErr);
        return res.status(500).json({ error: "Refund lookup failed" });
      }

      const alreadyRefundedQty =
        refundedItems?.reduce((sum, r) => sum + Number(r.quantity), 0) || 0;

      if (refund_qty + alreadyRefundedQty > saleItem.quantity) {
        return res
          .status(400)
          .json({ error: "Refund quantity exceeds sold quantity" });
      }

      const amount = refund_qty * Number(saleItem.unit_price);
      refundTotal += amount;

      refundItemsPayload.push({
        product_id,
        refund_qty,
        unit_price: saleItem.unit_price,
        amount,
      });
    }

    /* -------------------------------------------------------
       4. Create REFUND transaction
    ------------------------------------------------------- */
    const { data: refundTx, error: refundTxErr } = await supabase
      .from("transactions")
      .insert({
        transaction_type: "REFUND",
        parent_id: sale.id,
        user_id: sale.user_id,
        total_amount: refundTotal,
        refunded_by,
      })
      .select()
      .single();

    if (refundTxErr) {
      console.error(refundTxErr);
      return res
        .status(500)
        .json({ error: "Failed to create refund transaction" });
    }

    /* -------------------------------------------------------
       5. Insert REFUND line items
       (transaction_id = SALE ID — THIS IS CRITICAL)
    ------------------------------------------------------- */
    const refundItemsInsert = refundItemsPayload.map((i) => ({
      transaction_id: sale.id,
      product_id: i.product_id,
      quantity: i.refund_qty,
      unit_price: i.unit_price,
      item_type: "REFUND",
      user_id: refunded_by,
    }));

    const { error: refundItemsErr } = await supabase
      .from("transaction_items")
      .insert(refundItemsInsert);

    if (refundItemsErr) {
      console.error(refundItemsErr);
      return res.status(500).json({ error: "Failed to insert refund items" });
    }

    return res.status(200).json({
      ok: true,
      refund_transaction_id: refundTx.id,
    });
  } catch (err) {
    console.error("[recordRefund]", err);
    return res.status(500).json({ error: "Refund failed" });
  }
};


/**
 * GET /api/refund/:transaction_id/receipt
 * Generates receipt for ONE refund transaction
 */
export const getRefundReceipt = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    /* -------------------------------------------------------
       1. Fetch REFUND transaction
    ------------------------------------------------------- */
    const { data: refundTx, error: refundErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .eq("transaction_type", "REFUND")
      .single();

    if (refundErr || !refundTx) {
      return res.status(404).send("Refund not found");
    }

    /* -------------------------------------------------------
       2. Fetch REFUND items (via SALE transaction_id)
    ------------------------------------------------------- */
    const { data: refundItems, error: itemsErr } = await supabase
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", refundTx.parent_id)
      .eq("item_type", "REFUND");

    if (itemsErr || !refundItems.length) {
      return res.status(404).send("No refund items found");
    }

    /* -------------------------------------------------------
       3. Fetch product names
    ------------------------------------------------------- */
    const productIds = refundItems.map((i) => i.product_id);

    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const productMap = {};
    products?.forEach((p) => {
      productMap[p.id] = p.name;
    });

    /* -------------------------------------------------------
       4. Build receipt rows
    ------------------------------------------------------- */
    let total = 0;

    const rows = refundItems
      .map((item) => {
        const amount = Number(item.unit_price) * Number(item.quantity);
        total += amount;

        return `
<tr>
  <td>${productMap[item.product_id] || "Item"}</td>
  <td>${item.quantity}</td>
  <td>₹${amount.toFixed(2)}</td>
</tr>`;
      })
      .join("");

    /* -------------------------------------------------------
       5. HTML (58mm thermal)
    ------------------------------------------------------- */
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Refund Receipt</title>
<style>
body {
  width: 58mm;
  font-family: monospace;
  font-size: 12px;
}
.center { text-align: center; }
hr { border: none; border-top: 1px dashed #000; }
table { width: 100%; }
td { padding: 2px 0; }
.right { text-align: right; }
</style>
</head>
<body>

<div class="center">
  <strong>BABUJI CHAAY</strong><br/>
  Shop no. 7, K.D. Empire<br/>
  Mira Road (E), Thane - 401107<br/>
  +91 9076165666
</div>

<hr/>

<div class="center"><strong>REFUND RECEIPT</strong></div>

Refund ID: ${refundTx.id}<br/>
Date: ${dayjs(refundTx.created_at).format("DD-MMM-YYYY HH:mm")}

<hr/>

<table>
<tr>
  <td>Item</td>
  <td>Qty</td>
  <td class="right">Amt</td>
</tr>
${rows}
</table>

<hr/>

<div class="right">
Total Refund: ₹${total.toFixed(2)}
</div>

<hr/>

<div class="center">Thank you</div>

</body>
</html>
`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("[getRefundReceipt]", err);
    res.status(500).send("Failed to generate receipt");
  }
};
