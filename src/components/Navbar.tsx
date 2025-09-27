"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function Navbar() {
  const { lang, setLang, dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState<string>("");
  const pathname = usePathname();
  const hide = pathname.startsWith("/employee");

  useEffect(() => {
    try {
      const has = document.cookie.split("; ").some((x) => x.startsWith("cust_access="));
      setLoggedIn(has);
      if (has) {
        const stored = localStorage.getItem("customer_name") || "Customer";
        setName(stored);
      }
    } catch {}
  }, []);

  const initials = useMemo(() => (name ? initialsFrom(name) : ""), [name]);

  const linkCls =
    "px-3 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors";

  if (hide) return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/75 border-b border-neutral-800">
      <div className="w-full max-w-none px-3 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
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
              <Link href="/shop" className={linkCls}>Shop</Link>
            </nav>

            {/* Language pill */}
            <div className="relative grid grid-cols-2 items-center rounded-full bg-neutral-800 p-1 border border-neutral-700 overflow-hidden">
              {/* gold overlay */}
              <span
                aria-hidden
                style={{ backgroundColor: dict.gold }}
                className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full transition-transform duration-200 ease-out z-0 ${
                  lang === "en" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                aria-label="Español"
                onClick={() => setLang("es")}
                className={`relative z-10 px-3 py-1 text-xs rounded-full ${
                  lang === "es" ? "text-white" : "text-white/80 hover:text-white"
                }`}
              >
                {dict.langBadge.es}
              </button>
              <button
                aria-label="English"
                onClick={() => setLang("en")}
                className={`relative z-10 px-3 py-1 text-xs rounded-full ${
                  lang === "en" ? "text-white" : "text-white/80 hover:text-white"
                }`}
              >
                {dict.langBadge.en}
              </button>
            </div>

            {/* Profile / Account */}
            {loggedIn ? (
              <Link href="/cuenta" className="hidden md:flex items-center">
                <div className="h-8 w-8 rounded-full bg-neutral-800 border border-[--gold] grid place-items-center text-xs font-semibold text-white">
                  {initials}
                </div>
              </Link>
            ) : (
              <Link href="/cuenta" className="hidden md:inline-block text-sm font-medium text-white/90 hover:text-white px-2 py-1">Mi Cuenta</Link>
            )}

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
              <Link href="/shop" className={linkCls} onClick={() => setOpen(false)}>Shop</Link>
              <Link href="/cuenta" className={linkCls} onClick={() => setOpen(false)}>Mi Cuenta</Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

