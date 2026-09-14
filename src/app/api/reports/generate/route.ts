import { NextResponse } from "next/server";
import { requireSession } from "@/lib/admin";
import db from "@/lib/db";
import { transactions, transactionItems, products } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) return NextResponse.json({ error: "Missing date params" }, { status: 400 });

    const rows = await db.query.transactions.findMany({
      where: and(
        gte(transactions.createdAt, start),
        lte(transactions.createdAt, end),
        eq(transactions.transactionType, "SALE")
      ),
    });

    // Build report data
    const reportItems: Array<{
      bill_no: number;
      date: string;
      product: string;
      qty: number;
      unit_price: number;
      total: number;
      payment_method: string;
    }> = [];

    for (const txn of rows) {
      const items = await db.query.transactionItems.findMany({
        where: eq(transactionItems.transactionId, txn.id),
      });

      for (const item of items) {
        const product = await db.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        reportItems.push({
          bill_no: txn.dailyBillNo,
          date: txn.createdAt,
          product: product?.name || "Unknown",
          qty: item.quantity,
          unit_price: item.unitPrice,
          total: item.price || 0,
          payment_method: txn.upiPaid > 0 ? "UPI" : "CASH",
        });
      }
    }

    return NextResponse.json({ report: reportItems });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
