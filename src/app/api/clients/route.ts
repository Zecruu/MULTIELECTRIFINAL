import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const CLIENTS = Array.from({ length: 10 }).map((_, i) => ({
  id: `C${1000 + i}`,
  name: `Customer ${i + 1}`,
  email: `customer${i + 1}@example.com`,
  totalOrders: Math.floor(Math.random() * 10) + 1,
  lastOrder: new Date(Date.now() - i * 43200000).toISOString().slice(0, 10),
  status: i % 2 === 0 ? "Active" : "Inactive",
}));

import type { Me } from "@/lib/auth";
async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ clients: CLIENTS });
}

