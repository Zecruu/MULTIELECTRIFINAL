"use client";

import ProductForm from "@/components/admin/ProductForm";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: "var(--gold)" }}>
          Admin & Employee Portal
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          Manage products, categories and uploads. This is a first pass scaffold; we’ll wire
          backend endpoints and S3 presigned uploads next.
        </p>

        <section className="mt-8">
          <ProductForm />
        </section>
      </div>
    </main>
  );
}

