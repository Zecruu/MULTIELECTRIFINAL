import { cookies } from "next/headers";
import { verifyRefresh, signAccess, setAuthCookies } from "@/lib/auth-customer";

export const runtime = "nodejs";

export async function POST() {
  const c = await cookies();
  const t = c.get("cust_refresh")?.value;
  if (!t) return Response.json({ error: "Missing refresh" }, { status: 401 });
  try {
    const payload = await verifyRefresh(t);
    const access = await signAccess(payload);
    await setAuthCookies({ access });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Invalid refresh" }, { status: 401 });
  }
}

