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
    const result = await client.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: ["admin"],
    });
    return NextResponse.json({ profile: result.rows[0] || null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const client = getClient();

    const fullName = body.full_name ?? body.fullName ?? "";
    const avatarUrl = body.avatar_url ?? body.avatarUrl ?? null;
    const pin = body.pin ?? null;

    await client.execute({
      sql: "UPDATE profiles SET full_name = ?, avatar_url = ?, pin = ?, updated_at = datetime('now') WHERE id = ?",
      args: [fullName, avatarUrl, pin, "admin"],
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
