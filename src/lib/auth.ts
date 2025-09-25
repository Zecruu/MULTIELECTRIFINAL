import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type Role = "admin" | "employee";
export type Permissions = {
  isAdmin: boolean;
  canViewRevenue: boolean;
  canManageUsers: boolean;
  canManageInventory: boolean;
  canViewInventory: boolean;
  canUpdateOrders: boolean;
  canViewClients: boolean;
  canDeleteClients: boolean;
  canAccessReports: boolean;
  canAccessSettings: boolean;
};

export type Me = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permissions;
};

export function permsForRole(role: Role): Permissions {
  if (role === "admin") {
    return {
      isAdmin: true,
      canViewRevenue: true,
      canManageUsers: true,
      canManageInventory: true,
      canViewInventory: true,
      canUpdateOrders: true,
      canViewClients: true,
      canDeleteClients: true,
      canAccessReports: true,
      canAccessSettings: true,
    };
  }
  return {
    isAdmin: false,
    canViewRevenue: false,
    canManageUsers: false,
    canManageInventory: false,
    canViewInventory: true,
    canUpdateOrders: true,
    canViewClients: true,
    canDeleteClients: false,
    canAccessReports: false,
    canAccessSettings: false,
  };
}

const encoder = new TextEncoder();

export async function signToken(payload: Me, secret: string, expiresInSec = 60 * 60 * 8) {
  const token = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSec)
    .sign(encoder.encode(secret));
  return token;
}

export async function verifyToken(token: string, secret: string): Promise<Me> {
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return payload as unknown as Me;
}

