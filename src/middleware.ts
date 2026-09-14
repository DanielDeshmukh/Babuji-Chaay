import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/manifest.json", "/favicon.ico", "/icon.png", "/apple-touch-icon.png", "/sw.js"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname.endsWith(".png") || pathname.endsWith(".svg") || pathname.endsWith(".ico") || pathname.endsWith(".js") || pathname.endsWith(".webmanifest")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("babuji_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifySession(token);
  if (!session?.loggedIn) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set({ name: "babuji_session", value: "", maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
