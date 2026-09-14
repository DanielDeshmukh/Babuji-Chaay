import { NextResponse } from "next/server";
import db from "@/lib/db";
import { offers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const rows = await db.query.offers.findMany({
      orderBy: [desc(offers.id)],
    });
    return NextResponse.json({ offers: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const result = await db.insert(offers).values({
      userId: "admin",
      name: body.name,
      description: body.description || "",
      productIds: JSON.stringify(body.product_ids || []),
      isActive: body.is_active ?? true,
      isRecurring: body.is_recurring ?? false,
      discountType: body.discount_type,
      discountValue: body.discount_value,
      dayOfWeek: body.is_recurring ? body.day_of_week : null,
      startDate: body.is_recurring ? null : body.start_date || null,
      endDate: body.is_recurring ? null : body.end_date || null,
    }).returning();

    return NextResponse.json({ offer: result[0] });
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

    await db.update(offers).set({
      name: fields.name,
      description: fields.description || "",
      productIds: JSON.stringify(fields.product_ids || []),
      isActive: fields.is_active ?? true,
      isRecurring: fields.is_recurring ?? false,
      discountType: fields.discount_type,
      discountValue: fields.discount_value,
      dayOfWeek: fields.is_recurring ? fields.day_of_week : null,
      startDate: fields.is_recurring ? null : fields.start_date || null,
      endDate: fields.is_recurring ? null : fields.end_date || null,
    }).where(eq(offers.id, id));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(offers).where(eq(offers.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
