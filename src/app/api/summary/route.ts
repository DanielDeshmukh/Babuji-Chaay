import { NextResponse } from "next/server";
import db from "@/lib/db";
import { transactions, lossDumpLogs } from "@/lib/db/schema";
import { gte, lte, sql } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();

    // Get all transactions grouped by date
    const txRows = await db
      .select({
        sales_date: sql<string>`date(${transactions.createdAt})`,
        total_sales: sql<number>`sum(case when ${transactions.transactionType} = 'SALE' then ${transactions.totalAmount} else 0 end)`,
      })
      .from(transactions)
      .groupBy(sql`date(${transactions.createdAt})`)
      .orderBy(sql`date(${transactions.createdAt})`);

    // Get loss/dump logs grouped by date
    const ldRows = await db
      .select({
        log_date: sql<string>`date(${lossDumpLogs.createdAt})`,
        total_loss: sql<number>`sum(case when ${lossDumpLogs.type} = 'loss' then ${lossDumpLogs.priceAtTime} * ${lossDumpLogs.quantity} else 0 end)`,
        total_dump: sql<number>`sum(case when ${lossDumpLogs.type} = 'dump' then ${lossDumpLogs.priceAtTime} * ${lossDumpLogs.quantity} else 0 end)`,
      })
      .from(lossDumpLogs)
      .groupBy(sql`date(${lossDumpLogs.createdAt})`);

    // Merge loss/dump into sales data
    const lossMap = new Map<string, { total_loss: number; total_dump: number }>();
    for (const ld of ldRows) {
      lossMap.set(ld.log_date, { total_loss: ld.total_loss || 0, total_dump: ld.total_dump || 0 });
    }

    const merged = txRows.map((r) => {
      const ld = lossMap.get(r.sales_date);
      return {
        sales_date: r.sales_date,
        total_sales: r.total_sales || 0,
        total_loss: ld?.total_loss || 0,
        total_dump: ld?.total_dump || 0,
      };
    });

    return NextResponse.json({ summary: merged });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
