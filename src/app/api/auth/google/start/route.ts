import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/cuenta";
  const state = Buffer.from(JSON.stringify({ next })).toString("base64url");
  const c = await cookies();
  c.set("g_state", state, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 600 });

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const origin = (process.env.APP_URL || `${url.protocol}//${url.host}`).replace(/\/$/, "");
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`).trim();
  if (!clientId) return new Response("Google OAuth not configured: missing GOOGLE_CLIENT_ID", { status: 500 });
  if (!redirectUri) return new Response("Google OAuth not configured: missing APP_URL or GOOGLE_REDIRECT_URI", { status: 500 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(authUrl, 302);
}

