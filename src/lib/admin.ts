import { getSession } from "./auth";
import { cookies } from "next/headers";
import db from "./db";
import { profiles } from "./db/schema";
import { eq } from "drizzle-orm";

const ADMIN_USER_ID = "admin";

export async function getAdminUserId(): Promise<string> {
  return ADMIN_USER_ID;
}

export async function getOrCreateAdminProfile() {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, ADMIN_USER_ID),
  });

  if (existing) return existing;

  await db.insert(profiles).values({
    id: ADMIN_USER_ID,
    fullName: "Admin",
    pin: "1234",
  });

  return db.query.profiles.findFirst({
    where: eq(profiles.id, ADMIN_USER_ID),
  });
}

export async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("babuji_session")?.value;
  if (!token) throw new Error("Unauthorized");
  const session = await getSession();
  if (!session?.loggedIn) throw new Error("Unauthorized");
  return session;
}
