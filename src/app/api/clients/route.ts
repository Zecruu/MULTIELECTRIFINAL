import { NextRequest } from "next/server";
import { verifyToken, type Me } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db";
import { getCollection, type CustomerDoc } from "@/lib/mongo";
import { z } from "zod";

export const runtime = "nodejs";

async function requireAuth(req: NextRequest): Promise<Me | null> {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try { return await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change"); } catch { return null; }
}

const QuerySchema = z.object({
  q: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(req: NextRequest) {
  const me = await requireAuth(req);
  if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "", page: url.searchParams.get("page"), pageSize: url.searchParams.get("pageSize") });
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });
  const { q, page, pageSize } = parsed.data;

  try {
    await ensureSchema();

    // Fetch all registered users from MongoDB
    const mongoCol = await getCollection<CustomerDoc>("customers");
    const mongoFilter = q ? {
      $or: [
        { email: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } }
      ]
    } : {};
    
    const mongoDocs = await mongoCol.find(mongoFilter).toArray();
    
    // Build map of email -> mongo customer
    const mongoMap = new Map(mongoDocs.map(doc => [doc.email.toLowerCase(), doc]));

    // Fetch order data from PostgreSQL for ALL customers (both Mongo and Postgres)
    const allEmails = Array.from(mongoMap.keys());
    const pgOrderData: Map<string, { totalOrders: number; lastOrder: string | null }> = new Map();

    if (allEmails.length > 0) {
      // Get order stats for all customers by email
      const orderQuery = `
        SELECT c.email, 
               COALESCE(COUNT(o.id),0)::int AS total_orders,
               MAX(o.created_at) AS last_order
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.email`;
      const orderRes = await sql.query<{ email: string; total_orders: number; last_order: string | null }>(orderQuery);
      orderRes.rows.forEach(row => {
        pgOrderData.set(row.email.toLowerCase(), {
          totalOrders: row.total_orders,
          lastOrder: row.last_order
        });
      });
    }

    // Combine data: use MongoDB as source of truth for registered users
    const allClients = mongoDocs.map(doc => {
      const orderData = pgOrderData.get(doc.email.toLowerCase()) || { totalOrders: 0, lastOrder: null };
      return {
        id: doc._id?.toString() || doc.email,
        name: doc.name || "",
        email: doc.email,
        phone: doc.phone || "",
        totalOrders: orderData.totalOrders,
        lastOrder: orderData.lastOrder ? new Date(orderData.lastOrder).toISOString().slice(0, 10) : "-",
        status: orderData.totalOrders > 0 ? "Active" : "Inactive",
      };
    });

    // Sort by last order date (desc) then by name
    allClients.sort((a, b) => {
      if (a.lastOrder === "-" && b.lastOrder !== "-") return 1;
      if (a.lastOrder !== "-" && b.lastOrder === "-") return -1;
      if (a.lastOrder !== "-" && b.lastOrder !== "-") {
        const dateCompare = b.lastOrder.localeCompare(a.lastOrder);
        if (dateCompare !== 0) return dateCompare;
      }
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

    // Paginate
    const total = allClients.length;
    const offset = (page - 1) * pageSize;
    const paginatedClients = allClients.slice(offset, offset + pageSize);

    return Response.json({ clients: paginatedClients, page, pageSize, total });
  } catch (err) {
    console.error("clients.GET error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
