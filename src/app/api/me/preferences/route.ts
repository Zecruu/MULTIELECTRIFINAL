import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAccess, assertCsrf } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try { await assertCsrf(); } catch { return Response.json({ error: "CSRF" }, { status: 400 }); }
  const t = (await cookies()).get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(()=>({}));
  const updates: Partial<CustomerDoc> = {};
  if (body.language && (body.language === "es" || body.language === "en")) updates.language = body.language;
  if (body.notifications && typeof body.notifications === "object") updates.notifications = body.notifications;

  const col = await getCollection<CustomerDoc>("customers");
  await col.updateOne({ email: payload.email }, { $set: { ...updates, updatedAt: new Date().toISOString() } });
  return Response.json({ ok: true });
}

