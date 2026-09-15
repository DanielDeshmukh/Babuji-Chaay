import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const client = getClient();

    const startFixed = start ? start.replace("T", " ") : "";
    const endFixed = end ? end.replace("T", " ") : "";

    let txnResult;
    if (startFixed && endFixed) {
      txnResult = await client.execute({
        sql: "SELECT t.*, ti.product_id, ti.quantity, ti.unit_price, ti.price as item_price, p.name as product_name FROM transactions t LEFT JOIN transaction_items ti ON t.id = ti.transaction_id LEFT JOIN products p ON ti.product_id = p.id WHERE t.created_at >= ? AND t.created_at <= ? ORDER BY t.created_at DESC",
        args: [startFixed, endFixed],
      });
    } else {
      txnResult = await client.execute({
        sql: "SELECT t.*, ti.product_id, ti.quantity, ti.unit_price, ti.price as item_price, p.name as product_name FROM transactions t LEFT JOIN transaction_items ti ON t.id = ti.transaction_id LEFT JOIN products p ON ti.product_id = p.id ORDER BY t.created_at DESC",
        args: [],
      });
    }

    return NextResponse.json({ report: txnResult.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
