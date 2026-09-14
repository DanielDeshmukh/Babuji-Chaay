import { NextResponse } from "next/server";
import db from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const billNo = searchParams.get("billNo");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (billNo && start && end) {
      const row = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.dailyBillNo, Number(billNo)),
          gte(transactions.createdAt, start),
          lte(transactions.createdAt, end)
        ),
      });
      return NextResponse.json({ transaction: row || null });
    }

    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
