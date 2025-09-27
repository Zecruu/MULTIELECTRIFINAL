import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CuentaClient from "./ui/CuentaClient";

export const runtime = "nodejs";

export default async function CuentaPage() {
  const c = await cookies();
  const token = c.get("cust_access")?.value;
  if (!token) redirect(`/login?next=/cuenta`);
  return <CuentaClient />;
}

