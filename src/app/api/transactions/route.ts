import { NextResponse } from "next/server";
import db from "@/lib/db";
import { transactions, transactionItems } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let rows;
    if (start && end) {
      rows = await db.query.transactions.findMany({
        where: and(
          gte(transactions.createdAt, start),
          lte(transactions.createdAt, end)
        ),
        orderBy: [desc(transactions.createdAt)],
      });
    } else {
      rows = await db.query.transactions.findMany({
        orderBy: [desc(transactions.createdAt)],
        limit: 100,
      });
    }

    return NextResponse.json({ transactions: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();

    // Get next daily bill number for today
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          gte(transactions.createdAt, todayStart),
          lte(transactions.createdAt, todayEnd),
          eq(transactions.transactionType, "SALE")
        )
      );

    const dailyBillNo = (countResult[0]?.count || 0) + 1;

    const transactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await db.insert(transactions).values({
      id: transactionId,
      userId: "admin",
      transactionType: "SALE",
      dailyBillNo,
      totalAmount: body.total_amount,
      discount: body.discount || 0,
      cashPaid: body.cash_paid || 0,
      upiPaid: body.upi_paid || 0,
    });

    // Insert transaction items
    if (body.items?.length) {
      await db.insert(transactionItems).values(
        body.items.map((item: { product_id: number; quantity: number; unit_price: number }) => ({
          transactionId,
          productId: item.product_id,
          userId: "admin",
          quantity: item.quantity,
          unitPrice: item.unit_price,
          price: item.unit_price * item.quantity,
          itemType: "SALE",
        }))
      );
    }

    return NextResponse.json({ sale: { id: transactionId, dailyBillNo } });
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

    await db.update(transactions).set(fields).where(eq(transactions.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
