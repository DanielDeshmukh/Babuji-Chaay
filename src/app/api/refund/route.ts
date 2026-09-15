import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const transactionId = body.original_transaction_id || body.transaction_id;
    const refundItems = body.refund_items || [];
    const client = getClient();

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }

    const original = await client.execute({
      sql: "SELECT * FROM transactions WHERE id = ?",
      args: [transactionId],
    });

    if (!original.rows.length) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    const orig = original.rows[0];

    let refundTotal = Number(orig.total_amount);
    if (refundItems.length > 0) {
      refundTotal = refundItems.reduce(
        (sum: number, item: { price?: number; quantity?: number; unit_price?: number }) =>
          sum + (item.price || 0),
        0
      );
    }

    const refundId = `${Date.now()}-refund-${Math.random().toString(36).slice(2, 10)}`;

    await client.execute({
      sql: "INSERT INTO transactions (id, user_id, transaction_type, daily_bill_no, total_amount, discount, cash_paid, upi_paid, parent_id, refunded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [refundId, "admin", "REFUND", orig.daily_bill_no, refundTotal, 0, 0, 0, transactionId, "admin"],
    });

    for (const item of refundItems) {
      await client.execute({
        sql: "INSERT INTO transaction_items (transaction_id, product_id, user_id, quantity, unit_price, price, item_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [refundId, item.product_id, "admin", item.quantity, item.unit_price, item.price, "REFUND"],
      });

      await client.execute({
        sql: "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        args: [item.quantity, item.product_id],
      });

      await client.execute({
        sql: "UPDATE todays_menu SET quantity = quantity + ? WHERE product_id = ?",
        args: [item.quantity, item.product_id],
      });
    }

    await client.execute({
      sql: "UPDATE transactions SET refund = ? WHERE id = ?",
      args: [refundId, transactionId],
    });

    return NextResponse.json({ refund: { id: refundId, total: refundTotal } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
