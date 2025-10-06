"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  const { dict } = useI18n();
  return (
    <section id="home" className="bg-neutral-950 text-gray-100">
      <div className="w-full max-w-none px-3 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-16 sm:py-24">
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
                className="inline-flex items-center rounded-md px-5 py-3 text-sm font-semibold bg-[--gold] text-white hover:brightness-95 transition"
              >
                {dict.hero.cta}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center items-center">
            <div className="relative w-full max-w-md aspect-square">
              <Image
                src="/img/MULTI ELECTRCI LOGO_LE_upscale_balanced_x4.jpg"
                alt={dict.brand}
                fill
                className="object-contain rounded-xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

