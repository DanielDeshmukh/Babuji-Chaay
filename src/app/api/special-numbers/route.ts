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
    const result = await client.execute("SELECT * FROM special_numbers ORDER BY id DESC LIMIT 30");
    return NextResponse.json({ special_numbers: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { number, date } = body;
    const client = getClient();

    const now = new Date();
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const today = date || istDate.toISOString().split("T")[0];
    await client.execute({ sql: "DELETE FROM special_numbers WHERE date = ?", args: [today] });

    await client.execute({
      sql: "INSERT INTO special_numbers (number, date, user_id) VALUES (?, ?, ?)",
      args: [number, today, "admin"],
    });

    return NextResponse.json({ special_number: { number, date: today } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
