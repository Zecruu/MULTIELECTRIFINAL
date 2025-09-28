import { MongoClient, Db, type ObjectId, type Document } from "mongodb";

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const raw = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? "";
  const uri = raw.trim().replace(/^['"]|['"]$/g, ""); // strip accidental quotes
  if (!uri) throw new Error("Missing MONGODB_URI env var");
  const hasValidScheme = uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://");
  if (!hasValidScheme) {
    throw new Error("Invalid MongoDB URI scheme. Expected to start with mongodb:// or mongodb+srv:// (no surrounding quotes)");
  }
  if (!client) client = new MongoClient(uri);
  // In serverless, connect() is idempotent and uses pooled connections under the hood
  await client.connect();
  const dbName = process.env.MONGODB_DB || process.env.MONGO_DB || undefined;
  cachedDb = dbName ? client.db(dbName) : client.db();
  return cachedDb;
}

export async function getCollection<T extends Document = Document>(name: string) {
  const db = await getDb();
  return db.collection<T>(name);
}

export type CustomerDoc = {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  emailVerified?: boolean;
  emailVerification?: { token: string; expiresAt: string } | null;
  passwordReset?: { token: string; expiresAt: string } | null;
  language?: "es" | "en";
  notifications?: { orderPlaced?: boolean; readyForPickup?: boolean; statusChange?: boolean; marketing?: boolean };
  paymentMethods?: Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault?: boolean }>;
  sessions?: Array<{ id: string; device?: string; browser?: string; ip?: string; lastSeen?: string }>;
  addresses?: Array<{ id: string; line1: string; city: string; region: string; postal: string; country: string; isDefault?: boolean }>;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

