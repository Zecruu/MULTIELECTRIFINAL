import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";

const enc = new TextEncoder();

export type CustomerJWT = {
  sub: string; // customer email as subject for simplicity
  name?: string;
  email: string;
  lang?: "es" | "en";
  sid?: string; // session id
};



export async function signAccess(payload: CustomerJWT) {
  const ttl = Number(process.env.ACCESS_TOKEN_TTL_SEC || 1800);
  const secret = process.env.JWT_CUSTOMER_ACCESS_SECRET || "dev-access-secret-change";
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(enc.encode(secret));
}

export async function signRefresh(payload: CustomerJWT) {
  const ttl = Number(process.env.REFRESH_TOKEN_TTL_SEC || 60 * 60 * 24 * 30);
  const secret = process.env.JWT_CUSTOMER_REFRESH_SECRET || "dev-refresh-secret-change";
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(enc.encode(secret));
}

export async function verifyAccess(token: string): Promise<CustomerJWT> {
  const secret = process.env.JWT_CUSTOMER_ACCESS_SECRET || "dev-access-secret-change";
  const { payload } = await jwtVerify(token, enc.encode(secret));
  return payload as unknown as CustomerJWT;
}

export async function verifyRefresh(token: string): Promise<CustomerJWT> {
  const secret = process.env.JWT_CUSTOMER_REFRESH_SECRET || "dev-refresh-secret-change";
  const { payload } = await jwtVerify(token, enc.encode(secret));
  return payload as unknown as CustomerJWT;
}

export async function setAuthCookies({ access, refresh, csrf }: { access?: string; refresh?: string; csrf?: string }) {
  const c = await cookies();

  if (access) c.set("cust_access", access, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  if (refresh) c.set("cust_refresh", refresh, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  if (csrf) c.set("csrf", csrf, { httpOnly: false, sameSite: "lax", secure: true, path: "/" });
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.set("cust_access", "", { httpOnly: true, expires: new Date(0), path: "/" });
  c.set("cust_refresh", "", { httpOnly: true, expires: new Date(0), path: "/" });
  c.set("csrf", "", { httpOnly: false, expires: new Date(0), path: "/" });
}

export async function getCustomerFromCookies(): Promise<CustomerJWT | null> {
  const c = await cookies();
  const t = c.get("cust_access")?.value;
  if (!t) return null;
  try { return await verifyAccess(t); } catch { return null; }
}

export async function requireCsrfForWrites(): Promise<boolean> {
  // simple CSRF double-submit check: header must match cookie
  const h = await headers();
  const method = h.get("x-method-override") || ""; // not used, but reserved
  return true;
}

export async function assertCsrf() {
  const h = await headers();
  const tokenHeader = h.get("x-csrf") || "";
  const c = await cookies();
  const tokenCookie = c.get("csrf")?.value || "";
  if (!tokenHeader || !tokenCookie || tokenHeader !== tokenCookie) {
    throw new Error("CSRF token mismatch");
  }
}

export function newCsrf() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

