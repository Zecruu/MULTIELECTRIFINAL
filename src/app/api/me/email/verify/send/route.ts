import { cookies } from "next/headers";
import { verifyAccess } from "@/lib/auth-customer";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST() {
  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let me; try { me = await verifyAccess(t); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }

  const col = await getCollection<CustomerDoc>("customers");
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  await col.updateOne({ email: me.email }, { $set: { emailVerification: { token, expiresAt } } });

  const appUrl = process.env.APP_URL || "";
  const verifyUrl = `${appUrl}/api/me/email/verify/confirm?token=${token}`;
  const html = `<p>Confirma tu email para Multi Electric.</p><p><a href="${verifyUrl}">Verificar</a></p>`;
  try {
    await sendEmail({ to: me.email, subject: "Verifica tu email", html });
  } catch (e) {
    return Response.json({ error: "Email send failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

