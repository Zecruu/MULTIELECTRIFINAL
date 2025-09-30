import { NextRequest } from "next/server";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import type { WithId } from "mongodb";
import bcrypt from "bcryptjs";
import { signAccess, signRefresh, setAuthCookies, newCsrf } from "@/lib/auth-customer";
import { upsertCustomer } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json().catch(() => ({ email: "", password: "" }));
  if (!email || !password) return Response.json({ error: "Missing credentials" }, { status: 400 });

  const col = await getCollection<CustomerDoc>("customers");
  const now = new Date().toISOString();
  const ua = req.headers.get("user-agent") || "";
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "";
  let user: WithId<CustomerDoc> | null = await col.findOne({ email });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    const sessionId = crypto.randomUUID();
    const newDoc: CustomerDoc = {
      email,
      passwordHash,
      name: name || email.split("@")[0],
      emailVerified: false,
      language: "es",
      notifications: { orderPlaced: true, readyForPickup: true, statusChange: true, marketing: false },
      paymentMethods: [],
      sessions: [{ id: sessionId, device: "web", browser: ua, ip, lastSeen: now }],
      addresses: [],
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const insert = await col.insertOne(newDoc);
    user = { ...newDoc, _id: insert.insertedId } as WithId<CustomerDoc>;
  } else {
    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return Response.json({ error: "Invalid email or password" }, { status: 401 });
    const sessionId = crypto.randomUUID();
    await col.updateOne({ email }, { $set: { lastLoginAt: now, updatedAt: now }, $push: { sessions: { id: sessionId, device: "web", browser: ua, ip, lastSeen: now } } });
  }

  // Sync to Postgres customers table so they appear in Employee Clients page
  try {
    await upsertCustomer(email, user.name || null, user.phone || null, null);
  } catch (err) {
    console.error("[Login] Postgres customer sync failed:", err);
    // Non-fatal: continue login flow
  }

  const payload = { sub: email, email, name: user.name || "", lang: (user.language === "en" ? "en" : "es") as "en" | "es", sid: user.sessions?.slice(-1)[0]?.id };
  const [access, refresh] = await Promise.all([signAccess(payload), signRefresh(payload)]);
  const csrf = newCsrf();
  await setAuthCookies({ access, refresh, csrf });

  return Response.json({ ok: true, me: { email, name: user.name || "", language: user.language || "es" } }, { status: 200 });
}

