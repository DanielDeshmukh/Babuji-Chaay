import { NextResponse } from "next/server";
import db from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { transaction_id, refund_items } = body;

    // Insert refund transaction items
    if (refund_items?.length) {
      const { transactionItems } = await import("@/lib/db/schema");
      await db.insert(transactionItems).values(
        refund_items.map((item: {
          product_id: number;
          quantity: number;
          unit_price: number;
          price: number;
        }) => ({
          transactionId: transaction_id,
          productId: item.product_id,
          userId: "admin",
          quantity: item.quantity,
          unitPrice: item.unit_price,
          price: item.price,
          itemType: "REFUND",
        }))
      );

      // Update original transaction with refund info
      await db.update(transactions).set({
        refund: JSON.stringify(refund_items.map((item: { product_id: number; quantity: number; price: number }) => ({
          product_id: item.product_id,
          qty: item.quantity,
          value: item.price,
        }))),
      }).where(eq(transactions.id, transaction_id));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
