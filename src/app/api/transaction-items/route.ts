import { NextResponse } from "next/server";
import db from "@/lib/db";
import { transactionItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });

    const rows = await db.query.transactionItems.findMany({
      where: eq(transactionItems.transactionId, transactionId),
    });

    return NextResponse.json({ items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();

    const result = await db.insert(transactionItems).values(
      body.items.map((item: {
        transaction_id: string;
        product_id: number;
        quantity: number;
        unit_price: number;
        price?: number;
        item_type: string;
      }) => ({
        transactionId: item.transaction_id,
        productId: item.product_id,
        userId: "admin",
        quantity: item.quantity,
        unitPrice: item.unit_price,
        price: item.price || item.unit_price * item.quantity,
        itemType: item.item_type,
      }))
    ).returning();

    return NextResponse.json({ items: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
