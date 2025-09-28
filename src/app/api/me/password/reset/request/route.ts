import { NextRequest } from "next/server";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(()=>({}));
  if (!email) return Response.json({ error: "Missing email" }, { status: 400 });
  const col = await getCollection<CustomerDoc>("customers");
  const u = await col.findOne({ email });
  if (!u) return Response.json({ ok: true }); // do not leak
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  await col.updateOne({ _id: u._id }, { $set: { passwordReset: { token, expiresAt } } });
  const appUrl = process.env.APP_URL || "";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p>`;
  try {
    await sendEmail({ to: email, subject: "Restablecer contraseña", html });
  } catch {
    return Response.json({ error: "Email send failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

