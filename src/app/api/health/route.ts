import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? "set" : "MISSING";
  checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? "set" : "MISSING";
  checks.JWT_SECRET = process.env.JWT_SECRET ? "set" : "MISSING";
  checks.ADMIN_USERNAME = process.env.ADMIN_USERNAME || "MISSING";
  checks.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? "set" : "MISSING";

  // Check DB connection
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    const result = await client.execute("SELECT count(*) as count FROM products");
    checks.DB_CONNECTION = "ok";
    checks.PRODUCT_COUNT = String(result.rows[0]?.count || 0);
  } catch (err: unknown) {
    checks.DB_CONNECTION = "FAILED: " + (err instanceof Error ? err.message : "unknown");
  }

  const allOk = Object.values(checks).every((v) => v !== "MISSING" && !v.startsWith("FAILED"));

  return NextResponse.json({ status: allOk ? "healthy" : "degraded", checks });
}
