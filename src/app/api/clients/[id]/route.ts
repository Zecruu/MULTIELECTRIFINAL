import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await context.params).id;
  try {
    await ensureSchema();
    
    // Try to fetch customer from MongoDB by _id or email
    const mongoCol = await getCollection<CustomerDoc>("customers");
    let mongoCustomer: CustomerDoc | null = null;
    
    // Try ObjectId first, then fallback to email search
    if (ObjectId.isValid(id)) {
      mongoCustomer = await mongoCol.findOne({ _id: new ObjectId(id) });
    }
    
    // If not found by ID, try treating it as email
    if (!mongoCustomer) {
      mongoCustomer = await mongoCol.findOne({ email: id });
    }
    
    // If still not found in Mongo, try PostgreSQL
    if (!mongoCustomer) {
      const cRes = await sql<{ id: string; email: string; name: string | null; phone: string | null }>`
        SELECT id, email, name, phone FROM customers WHERE id=${id} LIMIT 1`;
      if (cRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
      
      const pgCustomer = cRes.rows[0];
      const oRes = await sql<{ id: string; order_number: string; created_at: string; status: string; total_cents: number; currency: string }>`
        SELECT id, order_number, created_at, status, total_cents, currency
        FROM orders WHERE customer_id=${id}
        ORDER BY created_at DESC LIMIT 200`;
      
      const orders = oRes.rows.map(r => ({ id: r.id, order_number: r.order_number, date: r.created_at, status: r.status, total_cents: r.total_cents, currency: r.currency }));
      return Response.json({ customer: pgCustomer, orders });
    }

    // Customer found in MongoDB - get their orders from PostgreSQL by email
    const customer = {
      id: mongoCustomer._id?.toString() || mongoCustomer.email,
      email: mongoCustomer.email,
      name: mongoCustomer.name || null,
      phone: mongoCustomer.phone || null
    };

    // Get orders for this customer by matching email in PostgreSQL
    const oRes = await sql<{ id: string; order_number: string; created_at: string; status: string; total_cents: number; currency: string }>`
      SELECT o.id, o.order_number, o.created_at, o.status, o.total_cents, o.currency
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.email = ${mongoCustomer.email}
      ORDER BY o.created_at DESC LIMIT 200`;

    const orders = oRes.rows.map(r => ({ id: r.id, order_number: r.order_number, date: r.created_at, status: r.status, total_cents: r.total_cents, currency: r.currency }));

    return Response.json({ customer, orders });
  } catch (err) {
    console.error("clients/[id].GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

