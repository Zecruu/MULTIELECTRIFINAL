import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const EMPLOYEE_PREFIX = "/employee";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(EMPLOYEE_PREFIX)) return NextResponse.next();

  const token = req.cookies.get("employee_token")?.value;
  if (!token) {
    const url = new URL("/employee/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change";
    await verifyToken(token, secret);
    return NextResponse.next();
  } catch {
    const url = new URL("/employee/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/employee/:path*"],
};

