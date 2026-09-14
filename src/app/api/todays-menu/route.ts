import { NextResponse } from "next/server";
import db from "@/lib/db";
import { todaysMenu, products } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.query.todaysMenu.findMany({
      orderBy: [asc(todaysMenu.name)],
    });
    return NextResponse.json({ todays_menu: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { product_id } = body;

    const product = await db.query.products.findFirst({
      where: eq(products.id, product_id),
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const result = await db.insert(todaysMenu).values({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.quantity,
      isAvailable: true,
    }).returning();

    return NextResponse.json({ menu_item: result[0] });
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

    await db.delete(todaysMenu).where(eq(todaysMenu.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
