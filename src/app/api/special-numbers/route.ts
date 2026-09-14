import { NextResponse } from "next/server";
import db from "@/lib/db";
import { specialNumbers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.query.specialNumbers.findMany({
      orderBy: [desc(specialNumbers.id)],
      limit: 30,
    });
    return NextResponse.json({ special_numbers: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { number, date } = body;

    // Upsert: delete existing for this date+user, then insert
    const today = date || new Date().toISOString().split("T")[0];

    // Delete existing for today
    await db.delete(specialNumbers).where(
      eq(specialNumbers.date, today)
    );

    const result = await db.insert(specialNumbers).values({
      number,
      date: today,
      userId: "admin",
    }).returning();

    return NextResponse.json({ special_number: result[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
