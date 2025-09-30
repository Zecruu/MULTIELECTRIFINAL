import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("employee_token")?.value;
  if (!token) return null;
  try {
    const me = await verifyToken(token, process.env.JWT_SECRET || "dev-secret-change");
    if (me.role !== "admin") return null;
    return me;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const me = await requireAdmin(req);
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Sales data
    const salesRes = await sql.query<{ total_revenue: string; total_orders: string }>(
      `SELECT 
        COALESCE(SUM(total_cents), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders
      WHERE created_at >= $1`,
      [startDate.toISOString()]
    );

    const totalRevenue = parseInt(salesRes.rows[0]?.total_revenue || "0");
    const totalOrders = parseInt(salesRes.rows[0]?.total_orders || "0");
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Revenue by month (simplified - last 6 months)
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRes = await sql.query<{ revenue: string }>(
        `SELECT COALESCE(SUM(total_cents), 0) as revenue
        FROM orders
        WHERE created_at >= $1 AND created_at < $2`,
        [monthStart.toISOString(), monthEnd.toISOString()]
      );

      revenueByMonth.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: parseInt(monthRes.rows[0]?.revenue || "0"),
      });
    }

    // Inventory data
    const lowStockRes = await sql.query<{ id: string; name_en: string; stock: number; min_stock: number }>(
      `SELECT id, name_en, stock, min_stock
      FROM products
      WHERE stock > 0 AND stock <= min_stock
      ORDER BY stock ASC
      LIMIT 10`
    );

    const outOfStockRes = await sql.query<{ id: string; name_en: string }>(
      `SELECT id, name_en
      FROM products
      WHERE stock = 0
      LIMIT 10`
    );

    const totalProductsRes = await sql.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM products`
    );

    // Customer data from MongoDB
    let totalCustomers = 0;
    let newCustomersThisMonth = 0;
    try {
      console.log("Attempting to connect to MongoDB for customer data...");
      const db = await getDb();
      console.log("MongoDB connected successfully");

      const customersCollection = db.collection("customers");
      totalCustomers = await customersCollection.countDocuments();
      console.log("Total customers:", totalCustomers);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      newCustomersThisMonth = await customersCollection.countDocuments({
        createdAt: { $gte: monthStart.toISOString() }
      });
      console.log("New customers this month:", newCustomersThisMonth);
    } catch (mongoErr) {
      console.error("MongoDB customer query failed (non-critical):", mongoErr);
      console.error("MongoDB error details:", mongoErr instanceof Error ? mongoErr.message : String(mongoErr));
      // Continue with 0 customers - this is non-critical
    }

    const repeatCustomersRes = await sql.query<{ count: string }>(
      `SELECT COUNT(DISTINCT customer_id) as count
      FROM orders
      WHERE customer_id IN (
        SELECT customer_id
        FROM orders
        GROUP BY customer_id
        HAVING COUNT(*) > 1
      )`
    );

    const repeatCustomers = parseInt(repeatCustomersRes.rows[0]?.count || "0");
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    return Response.json({
      sales: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        revenueByMonth,
      },
      inventory: {
        lowStockProducts: lowStockRes.rows.map((p) => ({
          id: p.id,
          name: p.name_en,
          stock: p.stock,
          min_stock: p.min_stock,
        })),
        outOfStockProducts: outOfStockRes.rows.map((p) => ({
          id: p.id,
          name: p.name_en,
        })),
        totalProducts: parseInt(totalProductsRes.rows[0]?.count || "0"),
      },
      customers: {
        totalCustomers,
        newCustomersThisMonth,
        repeatCustomers,
        repeatCustomerRate,
      },
    });
  } catch (err) {
    console.error("Reports API error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("Error details:", { message: errorMessage, stack: errorStack });
    return Response.json({
      error: "Server error",
      message: errorMessage,
      hint: "Check server logs for details"
    }, { status: 500 });
  }
}

