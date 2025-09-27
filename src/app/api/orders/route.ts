import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { publishOrderEvent } from "@/lib/sse";
import { listOrders, updateOrderStatus, type DbOrderStatus, getOrderDetail } from "@/lib/db";

export const runtime = "nodejs";

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
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const order = await getOrderDetail(String(id));
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ order });
  }
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const orders = await listOrders({ status: (status as DbOrderStatus | null), q });
  return Response.json({ orders });
}

export async function PATCH(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = String(url.searchParams.get("id"));
  type Body = { status: DbOrderStatus };
  const body = (await req.json().catch(() => ({ } as Body))) as Body;
  const status = body.status as DbOrderStatus;
  await updateOrderStatus(id, status);
  publishOrderEvent({ type: "order-updated", payload: { id, status } });
  return Response.json({ ok: true });
}

