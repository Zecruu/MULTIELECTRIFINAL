import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
  const results = [
    { type: "Order", id: "ME-2025-000101", title: "Order ME-2025-000101" },
    { type: "Client", id: "C1002", title: "John Smith" },
    { type: "Product", id: "P1005", title: "Copper Cable" },
  ].filter((r)=> r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
  return NextResponse.json({ results });
}

