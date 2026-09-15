import { NextResponse } from "next/server";
import db from "@/lib/db";
import { lossDumpLogs, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.query.lossDumpLogs.findMany({
      orderBy: [desc(lossDumpLogs.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ logs: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { product_id, quantity, type } = body;

    const product = await db.query.products.findFirst({
      where: eq(products.id, product_id),
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await db.insert(lossDumpLogs).values({
      productId: product_id,
      quantity,
      type,
      userId: "admin",
      priceAtTime: product.price,
    });

    // Optionally decrement product quantity
    if (product.quantity >= quantity) {
      await db.update(products).set({
        quantity: product.quantity - quantity,
      }).where(eq(products.id, product_id));
    }

    return NextResponse.json({ log: { product_id, quantity, type, priceAtTime: product.price } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
