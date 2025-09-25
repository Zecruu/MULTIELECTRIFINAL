"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function Navbar() {
  const { lang, setLang, dict } = useI18n();
  const [open, setOpen] = useState(false);

  const linkCls =
    "px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors";

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/75 border-b border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/MULTI ELECTRCI LOGO_LE_upscale_balanced_x4.jpg"
              alt={dict.brand}
              width={28}
              height={28}
              className="rounded-md object-cover"
              priority
            />
            <span className="text-[15px] sm:text-base font-semibold tracking-wide" style={{ color: dict.gold }}>
              {dict.brand}
            </span>
          </Link>

          {/* Right: Nav + Lang + Mobile toggle */}
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center">
              <Link href="#home" className={linkCls}>{dict.nav.home}</Link>
              <Link href="#services" className={linkCls}>{dict.nav.services}</Link>
              <Link href="#about" className={linkCls}>{dict.nav.about}</Link>
              <Link href="#contact" className={linkCls}>{dict.nav.contact}</Link>
            </nav>

            {/* Language pill */}
            <div className="relative grid grid-cols-2 items-center rounded-full bg-neutral-800 p-1 border border-neutral-700">
              {/* gold overlay */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[--gold] transition-transform duration-200 ease-out ${
                  lang === "en" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                aria-label="Español"
                onClick={() => setLang("es")}
                className={`relative z-10 px-3 py-1 text-xs rounded-full ${
                  lang === "es" ? "text-black" : "text-gray-300 hover:text-white"
                }`}
              >
                {dict.langBadge.es}
              </button>
              <button
                aria-label="English"
                onClick={() => setLang("en")}
                className={`relative z-10 px-3 py-1 text-xs rounded-full ${
                  lang === "en" ? "text-black" : "text-gray-300 hover:text-white"
                }`}
              >
                {dict.langBadge.en}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 text-gray-200"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-neutral-800 py-2">
            <nav className="flex flex-col">
              <Link href="#home" className={linkCls} onClick={() => setOpen(false)}>{dict.nav.home}</Link>
              <Link href="#services" className={linkCls} onClick={() => setOpen(false)}>{dict.nav.services}</Link>
              <Link href="#about" className={linkCls} onClick={() => setOpen(false)}>{dict.nav.about}</Link>
              <Link href="#contact" className={linkCls} onClick={() => setOpen(false)}>{dict.nav.contact}</Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

