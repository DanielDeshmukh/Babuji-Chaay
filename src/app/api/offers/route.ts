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
    const result = await client.execute("SELECT * FROM offers ORDER BY id DESC");
    return NextResponse.json({ offers: result.rows });
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

    await client.execute({
      sql: "INSERT INTO offers (user_id, name, description, product_ids, is_active, is_recurring, discount_type, discount_value, day_of_week, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        "admin",
        body.name,
        body.description || "",
        JSON.stringify(body.product_ids || []),
        body.is_active ? 1 : 0,
        body.is_recurring ? 1 : 0,
        body.discount_type,
        body.discount_value,
        body.is_recurring ? body.day_of_week : null,
        body.is_recurring ? null : body.start_date || null,
        body.is_recurring ? null : body.end_date || null,
      ],
    });

    return NextResponse.json({ offer: { name: body.name } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { id, ...fields } = body;
    const client = getClient();

    await client.execute({
      sql: "UPDATE offers SET name = ?, description = ?, product_ids = ?, is_active = ?, is_recurring = ?, discount_type = ?, discount_value = ?, day_of_week = ?, start_date = ?, end_date = ? WHERE id = ?",
      args: [
        fields.name,
        fields.description || "",
        JSON.stringify(fields.product_ids || []),
        fields.is_active ? 1 : 0,
        fields.is_recurring ? 1 : 0,
        fields.discount_type,
        fields.discount_value,
        fields.is_recurring ? fields.day_of_week : null,
        fields.is_recurring ? null : fields.start_date || null,
        fields.is_recurring ? null : fields.end_date || null,
        id,
      ],
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
    await client.execute({ sql: "DELETE FROM offers WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
