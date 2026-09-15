import { NextResponse } from "next/server";
import db from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.query.products.findMany({
      orderBy: [asc(products.name)],
    });
    return NextResponse.json({ products: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { name, category, quantity, price } = body;

    const result = await db.insert(products).values({
      name,
      category: category || "Uncategorized",
      quantity: quantity || 0,
      price: price || 0,
      userId: "admin",
    });

    return NextResponse.json({ product: { name, category: category || "Uncategorized", quantity: quantity || 0, price: price || 0 } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { id, name, category, quantity, price } = body;

    await db.update(products).set({
      name,
      category: category || "Uncategorized",
      quantity: quantity || 0,
      price: price || 0,
    }).where(eq(products.id, id));

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

    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
