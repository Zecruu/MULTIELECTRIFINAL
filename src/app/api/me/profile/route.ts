import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAccess, assertCsrf } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  // CSRF check
  try { await assertCsrf(); } catch { return Response.json({ error: "CSRF" }, { status: 400 }); }

  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const { name, phone } = await req.json().catch(()=>({}));
  if (typeof name !== "string" || name.length < 2 || name.length > 80) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }
  if (phone && typeof phone !== "string") {
    return Response.json({ error: "Invalid phone" }, { status: 400 });
  }

  const col = await getCollection<CustomerDoc>("customers");
  await col.updateOne({ email: payload.email }, { $set: { name, phone, updatedAt: new Date().toISOString() } });
  return Response.json({ ok: true });
}

