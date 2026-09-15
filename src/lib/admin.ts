import { getSession } from "./auth";
import { cookies } from "next/headers";
import { createClient } from "@libsql/client";

const ADMIN_USER_ID = "admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function getAdminUserId(): Promise<string> {
  return ADMIN_USER_ID;
}

export async function getOrCreateAdminProfile() {
  const client = getClient();
  const existing = await client.execute({
    sql: "SELECT * FROM profiles WHERE id = ?",
    args: [ADMIN_USER_ID],
  });

  if (existing.rows.length > 0) return existing.rows[0];

  await client.execute({
    sql: "INSERT INTO profiles (id, full_name, pin) VALUES (?, ?, ?)",
    args: [ADMIN_USER_ID, "Admin", "1234"],
  });

  const result = await client.execute({
    sql: "SELECT * FROM profiles WHERE id = ?",
    args: [ADMIN_USER_ID],
  });
  return result.rows[0];
}

export async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("babuji_session")?.value;
  if (!token) throw new Error("Unauthorized");
  const session = await getSession();
  if (!session?.loggedIn) throw new Error("Unauthorized");
  return session;
}
