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
    const result = await client.execute("SELECT * FROM todays_menu ORDER BY name ASC");
    return NextResponse.json({ todays_menu: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { product_id } = body;
    const client = getClient();

    const product = await client.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [product_id],
    });

    if (!product.rows.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const p = product.rows[0];

    await client.execute({
      sql: "INSERT INTO todays_menu (product_id, name, category, price, quantity, is_available) VALUES (?, ?, ?, ?, ?, ?)",
      args: [p.id, p.name, p.category, p.price, p.quantity, 1],
    });

    return NextResponse.json({ menu_item: { product_id: p.id, name: p.name } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const client = getClient();
    await client.execute({ sql: "DELETE FROM todays_menu WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
