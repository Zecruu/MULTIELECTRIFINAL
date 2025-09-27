export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--gold)" }}>Payment successful</h1>
        <p className="text-sm opacity-90 mb-6">Thank you! Your order has been received. You will receive an email confirmation shortly.</p>
        <a href="/shop" className="inline-block rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm px-4 py-2">Back to Shop</a>
      </div>
    </main>
  );
}

