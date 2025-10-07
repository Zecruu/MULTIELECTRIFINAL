export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = (process.env.APP_URL || `${url.protocol}//${url.host}`).replace(/\/$/, "");
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`).trim();
  
  return Response.json({
    APP_URL: process.env.APP_URL || "NOT SET",
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "NOT SET",
    computed_origin: origin,
    computed_redirect_uri: redirectUri,
    current_host: url.host,
    current_protocol: url.protocol,
    GOOGLE_CLIENT_ID_set: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET_set: !!process.env.GOOGLE_CLIENT_SECRET,
  });
}

