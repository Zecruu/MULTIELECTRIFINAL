"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "es";

const GOLD = "#D4AF37"; // gold accent

type Dictionary = {
  brand: string;
  nav: { home: string; services: string; about: string; contact: string };
  hero: { title: string; subtitle: string; cta: string };
  featured: { title: string; viewAll: string };
  services: { title: string; bullets: string[] };
  footer: { contact: string; address: string; phone: string; email: string; rights: string };
  langBadge: { en: string; es: string };
  gold: string;
};

const dictionaries: Record<Lang, Dictionary> = {
  en: {
    brand: "Multi Electric Supply",
    nav: { home: "Home", services: "Services", about: "About", contact: "Contact" },
    hero: {
      title: "Powering Your Projects With Premium Electrical Supplies",
      subtitle: "Wholesale pricing, fast delivery, and expert support.",
      cta: "Shop Featured Products",
    },
    featured: { title: "Featured Categories", viewAll: "View All" },
    services: {
      title: "Why Multi Electric?",
      bullets: [
        "Bulk pricing for contractors",
        "Same‑day pickup and fast delivery",
        "Dedicated account support",
      ],
    },
    footer: {
      contact: "Contact",
      address: "Address",
      phone: "Phone",
      email: "Email",
      rights: "All rights reserved.",
    },
    langBadge: { en: "EN", es: "ES" },
    gold: GOLD,
  },
  es: {
    brand: "Multi Electric Supply",
    nav: { home: "Inicio", services: "Servicios", about: "Nosotros", contact: "Contacto" },
    hero: {
      title: "Impulsamos tus proyectos con insumos eléctricos premium",
      subtitle: "Precios al por mayor, entrega rápida y soporte experto.",
      cta: "Ver productos destacados",
    },
    featured: { title: "Categorías destacadas", viewAll: "Ver todas" },
    services: {
      title: "¿Por qué Multi Electric?",
      bullets: [
        "Precios por volumen para contratistas",
        "Retiro el mismo día y entrega rápida",
        "Atención dedicada a tu cuenta",
      ],
    },
    footer: {
      contact: "Contacto",
      address: "Dirección",
      phone: "Teléfono",
      email: "Correo",
      rights: "Todos los derechos reservados.",
    },
    langBadge: { en: "EN", es: "ES" },
    gold: GOLD,
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const fromCookie = document.cookie
    .split("; ")
    .find((r) => r.startsWith("lang="))?.split("=")[1] as Lang | undefined;
  const fromLocal = (localStorage.getItem("lang") as Lang | null) || undefined;
  return fromCookie || fromLocal || (navigator.language.startsWith("es") ? "es" : "en");
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang());

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
      document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
      }
    } catch {}
  }, [lang]);

  const dict = useMemo(() => dictionaries[lang], [lang]);

  const value = useMemo(() => ({ lang, setLang, dict }), [lang, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

