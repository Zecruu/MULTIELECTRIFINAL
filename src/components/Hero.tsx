"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export default function Hero() {
  const { dict } = useI18n();
  return (
    <section id="home" className="bg-neutral-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              <span style={{ color: "var(--gold)" }}>{dict.brand}</span>
              <br />
              {dict.hero.title}
            </h1>
            <p className="mt-4 text-gray-300 text-base sm:text-lg">
              {dict.hero.subtitle}
            </p>
            <div className="mt-8">
              <Link
                href="#featured"
                className="inline-flex items-center rounded-md px-5 py-3 text-sm font-semibold bg-[--gold] text-black hover:brightness-95 transition"
              >
                {dict.hero.cta}
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-video w-full rounded-xl border border-neutral-800 bg-gradient-to-br from-yellow-900/20 to-yellow-600/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

