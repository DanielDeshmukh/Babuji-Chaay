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
    const result = await client.execute("SELECT * FROM products ORDER BY name ASC");
    return NextResponse.json({ products: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { name, category, quantity, price, description } = body;
    const client = getClient();

    await client.execute({
      sql: "INSERT INTO products (user_id, name, category, description, quantity, price) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["admin", name, category || "Uncategorized", description || "", quantity || 0, price || 0],
    });

    return NextResponse.json({ product: { name, category, price } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { id, name, category, quantity, price, description } = body;
    const client = getClient();

    await client.execute({
      sql: "UPDATE products SET name = ?, category = ?, quantity = ?, price = ?, description = ? WHERE id = ?",
      args: [name, category || "Uncategorized", quantity || 0, price || 0, description || "", id],
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const client = getClient();
    await client.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
