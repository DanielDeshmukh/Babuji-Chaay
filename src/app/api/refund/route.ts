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
    const { original_transaction_id } = body;
    const client = getClient();

    const original = await client.execute({
      sql: "SELECT * FROM transactions WHERE id = ?",
      args: [original_transaction_id],
    });

    if (!original.rows.length) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    const orig = original.rows[0];

    const refundId = `${Date.now()}-refund-${Math.random().toString(36).slice(2, 10)}`;

    await client.execute({
      sql: "INSERT INTO transactions (id, user_id, transaction_type, daily_bill_no, total_amount, discount, cash_paid, upi_paid, parent_id, refunded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [refundId, "admin", "REFUND", orig.daily_bill_no, orig.total_amount, 0, 0, 0, original_transaction_id, "admin"],
    });

    await client.execute({
      sql: "UPDATE transactions SET refund = ? WHERE id = ?",
      args: [refundId, original_transaction_id],
    });

    return NextResponse.json({ refund: { id: refundId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
