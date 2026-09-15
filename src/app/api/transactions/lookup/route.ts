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
    const billNo = searchParams.get("billNo");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (billNo && start && end) {
      const client = getClient();
      const startFixed = start.replace("T", " ");
      const endFixed = end.replace("T", " ");
      const result = await client.execute({
        sql: "SELECT * FROM transactions WHERE daily_bill_no = ? AND created_at >= ? AND created_at <= ?",
        args: [Number(billNo), startFixed, endFixed],
      });
      return NextResponse.json({ transaction: result.rows[0] || null });
    }

    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
