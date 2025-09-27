"use client";

import { useI18n } from "@/lib/i18n";

export default function Services() {
  const { dict } = useI18n();
  return (
    <section id="services" className="bg-neutral-950 text-gray-100 border-t border-neutral-900">
      <div className="w-full max-w-none px-3 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-14">
        <h2 className="text-2xl sm:text-3xl font-semibold">{dict.services.title}</h2>
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {dict.services.bullets.map((b, i) => (
            <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

