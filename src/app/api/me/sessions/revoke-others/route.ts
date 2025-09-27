import { cookies } from "next/headers";
import { verifyAccess, assertCsrf } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";

export const runtime = "nodejs";

export async function POST() {
  try { await assertCsrf(); } catch { return Response.json({ error: "CSRF" }, { status: 400 }); }
  const t = (await cookies()).get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const col = await getCollection<CustomerDoc>("customers");
  // Keep only current session id if present
  await col.updateOne({ email: payload.email }, { $set: { sessions: (payload.sid ? [{ id: payload.sid }] : []) } });
  return Response.json({ ok: true });
}

