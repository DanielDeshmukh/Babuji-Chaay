import { NextResponse } from "next/server";
import db from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/admin";

export async function GET() {
  try {
    await requireSession();
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, "admin"),
    });
    return NextResponse.json({ profile: profile || null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();

    await db.update(profiles).set({
      fullName: body.full_name,
      pin: body.pin || null,
      avatarUrl: body.avatar_url,
      updatedAt: new Date().toISOString(),
    }).where(eq(profiles.id, "admin"));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
