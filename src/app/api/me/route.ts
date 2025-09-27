import { cookies } from "next/headers";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { verifyAccess } from "@/lib/auth-customer";

export const runtime = "nodejs";

export async function GET() {
  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload; try { payload = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const col = await getCollection<CustomerDoc>("customers");
  const u = await col.findOne({ email: payload.email });
  if (!u) {
    return Response.json({ me: { email: payload.email, name: payload.name || "", emailVerified: false, language: payload.lang || "es", notifications: { orderPlaced: true, readyForPickup: true, statusChange: true, marketing: false }, paymentMethods: [], sessions: [] } });
  }
  return Response.json({ me: {
    id: String(u._id),
    name: u.name || "",
    email: u.email,
    emailVerified: !!u.emailVerified,
    phone: u.phone || "",
    language: (u.language === "en" ? "en" : "es"),
    notifications: u.notifications || {},
    paymentMethods: u.paymentMethods || [],
    sessions: u.sessions || [],
    addresses: u.addresses || [],
  }});
}

