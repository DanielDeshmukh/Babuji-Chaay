import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET() {
  try {
    await requireSession();
    const client = getClient();
    const result = await client.execute("SELECT * FROM loss_dump_logs ORDER BY created_at DESC LIMIT 100");
    return NextResponse.json({ logs: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { product_id, quantity, type } = body;
    const client = getClient();

    const product = await client.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [product_id],
    });

    if (!product.rows.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const p = product.rows[0];

    await client.execute({
      sql: "INSERT INTO loss_dump_logs (product_id, quantity, type, user_id, price_at_time) VALUES (?, ?, ?, ?, ?)",
      args: [product_id, quantity, type, "admin", p.price],
    });

    if (Number(p.quantity) >= quantity) {
      await client.execute({
        sql: "UPDATE products SET quantity = ? WHERE id = ?",
        args: [Number(p.quantity) - quantity, product_id],
      });
    }

    return NextResponse.json({ log: { product_id, quantity, type } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
