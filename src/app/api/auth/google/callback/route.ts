import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { signAccess, signRefresh } from "@/lib/auth-customer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const stateCookie = (await cookies()).get("g_state")?.value || "";
  if (!code || !state || state !== stateCookie) {
    return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const client_id = process.env.GOOGLE_CLIENT_ID || "";
  const client_secret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirect_uri = (process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || ""}/api/auth/google/callback`).trim();
  if (!client_id || !client_secret || !redirect_uri) {
    return Response.json({ error: "OAuth not configured" }, { status: 500 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id,
      client_secret,
      redirect_uri,
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return Response.json({ error: "Token exchange failed", details: txt }, { status: 400 });
  }
  const tokens = await tokenRes.json() as { access_token: string };

  // Get user info
  const uiRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  if (!uiRes.ok) return Response.json({ error: "Failed to fetch userinfo" }, { status: 400 });
  const ui = await uiRes.json() as { email: string; name?: string };
  if (!ui.email) return Response.json({ error: "No email returned" }, { status: 400 });

  // Upsert customer in Mongo
  const col = await getCollection<CustomerDoc>("customers");
  const now = new Date().toISOString();
  const existing = await col.findOne({ email: ui.email });
  if (!existing) {
    await col.insertOne({
      email: ui.email,
      passwordHash: "oauth-google",
      name: ui.name || ui.email.split("@")[0],
      emailVerified: true,
      language: "es",
      sessions: [],
      createdAt: now,
      updatedAt: now,
    } as CustomerDoc);
  } else {
    await col.updateOne({ email: ui.email }, { $set: { name: existing.name || ui.name || existing.email.split("@")[0], updatedAt: now } });
  }

  // Issue our JWT cookies
  const payload = { sub: ui.email, email: ui.email, name: ui.name || "" } as import("@/lib/auth-customer").CustomerJWT;
  const access = await signAccess(payload);
  const refresh = await signRefresh(payload);
  const c = await cookies();
  c.set("cust_access", access, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  c.set("cust_refresh", refresh, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  c.delete("g_state");

  let next = "/cuenta";
  try { next = JSON.parse(Buffer.from(state, "base64url").toString()).next || "/cuenta"; } catch {}
  return Response.redirect(next, 302);
}

