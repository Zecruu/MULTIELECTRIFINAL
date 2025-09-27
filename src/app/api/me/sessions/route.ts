import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";

export const runtime = "nodejs";

export async function GET() {
  const t = (await cookies()).get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const col = await getCollection<CustomerDoc>("customers");
  const u = await col.findOne({ email: payload.email }, { projection: { sessions: 1 } });
  return Response.json({ sessions: u?.sessions || [] });
}

