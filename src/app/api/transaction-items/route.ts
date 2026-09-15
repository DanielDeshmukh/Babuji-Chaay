import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId");
    if (!transactionId) return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });

    const client = getClient();
    const result = await client.execute({
      sql: "SELECT * FROM transaction_items WHERE transaction_id = ?",
      args: [transactionId],
    });

    return NextResponse.json({ items: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const client = getClient();

    for (const item of body.items) {
      await client.execute({
        sql: "INSERT INTO transaction_items (transaction_id, product_id, user_id, quantity, unit_price, price, item_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          item.transaction_id,
          item.product_id,
          "admin",
          item.quantity,
          item.unit_price,
          item.price || item.unit_price * item.quantity,
          item.item_type,
        ],
      });
    }

    return NextResponse.json({ items: body.items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
