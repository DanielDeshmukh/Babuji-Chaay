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
    const month = searchParams.get("month");
    const client = getClient();

    let txnResult;
    if (month) {
      txnResult = await client.execute({
        sql: "SELECT * FROM transactions WHERE created_at LIKE ? ORDER BY created_at DESC",
        args: [`${month}%`],
      });
    } else {
      txnResult = await client.execute("SELECT * FROM transactions ORDER BY created_at DESC");
    }

    return NextResponse.json({ sales: txnResult.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
