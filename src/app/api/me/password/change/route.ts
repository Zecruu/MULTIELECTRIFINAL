import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAccess, assertCsrf } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try { await assertCsrf(); } catch { return Response.json({ error: "CSRF" }, { status: 400 }); }
  const t = (await cookies()).get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const { current, next, confirm } = await req.json().catch(()=>({}));
  if (!next || next !== confirm || typeof next !== "string" || next.length < 8) {
    return Response.json({ error: "Invalid password" }, { status: 400 });
  }
  const col = await getCollection<CustomerDoc>("customers");
  const u = await col.findOne({ email: payload.email });
  if (!u) return Response.json({ error: "Not found" }, { status: 404 });

  const ok = await bcrypt.compare(current || "", u.passwordHash||"");
  if (!ok) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const passwordHash = await bcrypt.hash(next, 10);
  await col.updateOne({ email: payload.email }, { $set: { passwordHash, lastPasswordChangeAt: new Date().toISOString() } });
  return Response.json({ ok: true });
}

