import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession(adminUsername);
  const cookie = setSessionCookie(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set(cookie);
  return response;
}
