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

    const txRows = await client.execute(
      "SELECT date(created_at) as sales_date, sum(case when transaction_type = 'SALE' then total_amount else 0 end) as total_sales FROM transactions GROUP BY date(created_at) ORDER BY date(created_at)"
    );

    const ldRows = await client.execute(
      "SELECT date(created_at) as log_date, sum(case when type = 'loss' then price_at_time * quantity else 0 end) as total_loss, sum(case when type = 'dump' then price_at_time * quantity else 0 end) as total_dump FROM loss_dump_logs GROUP BY date(created_at)"
    );

    const lossMap = new Map<string, { total_loss: number; total_dump: number }>();
    for (const ld of ldRows.rows) {
      lossMap.set(String(ld.log_date), { total_loss: Number(ld.total_loss) || 0, total_dump: Number(ld.total_dump) || 0 });
    }

    const merged = txRows.rows.map((r) => {
      const ld = lossMap.get(String(r.sales_date));
      return {
        sales_date: r.sales_date,
        total_sales: Number(r.total_sales) || 0,
        total_loss: ld?.total_loss || 0,
        total_dump: ld?.total_dump || 0,
      };
    });

    return NextResponse.json({ summary: merged });
  } catch (err: unknown) {
    console.error("Summary error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
