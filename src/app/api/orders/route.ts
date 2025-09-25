import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { publishOrderEvent } from "@/lib/sse";

export const runtime = "nodejs";

let ORDERS = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  number: `ME-${new Date().getFullYear()}-${String(1000 + i).padStart(6, "0")}`,
  clientName: `Client ${i + 1}`,
  email: `client${i + 1}@example.com`,
  products: `Item A x1, Item B x2`,
  total: 50 + i * 12,
  status: (i % 3 === 0 ? "Ready for Pickup" : "Pending") as
    | "Pending"
    | "Ready for Pickup"
    | "Fulfilled"
    | "Canceled",
  date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
  assigned: i % 2 === 0 ? "Maria" : "Jose",
}));

import type { Me } from "@/lib/auth";
async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    return me;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const orders = status ? ORDERS.filter((o) => o.status === status) : ORDERS;
  return Response.json({ orders });
}

export async function PATCH(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const { status } = await req.json().catch(() => ({}));
  ORDERS = ORDERS.map((o) => (o.id === id ? { ...o, status } : o));
  publishOrderEvent({ type: "order-updated", payload: { id, status } });
  return Response.json({ ok: true });
}

