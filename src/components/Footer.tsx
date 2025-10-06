"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export default function Footer() {
  const { dict } = useI18n();
  return (
    <footer id="contact" className="bg-neutral-950 text-gray-300 border-t border-neutral-900">
      <div className="w-full max-w-none px-3 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 py-10">
        <div className="grid md:grid-cols-3 gap-8 text-sm">
          {/* Company Info */}
          <div>
            <div className="font-semibold text-lg mb-3" style={{ color: "var(--gold)" }}>{dict.brand}</div>
            <p className="text-gray-400 leading-relaxed">
              {dict.footer.rights}
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <div className="font-semibold text-base mb-3" style={{ color: "var(--gold)" }}>{dict.footer.contact}</div>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-[--gold]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="text-gray-300">92JV+3J3, Trujillo Bajo</div>
                  <div className="text-gray-400">Carolina, PR 00987</div>
                  <a
                    href="https://maps.app.goo.gl/FEhX9JTrqaZs9n1u5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[--gold] hover:underline text-xs mt-1 inline-block"
                  >
                    {dict.footer.viewMap}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0 text-[--gold]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+17879630569" className="text-gray-300 hover:text-[--gold] transition">
                  +1 (787) 963-0569
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0 text-[--gold]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:hzayas@multielectricpr.com" className="text-gray-300 hover:text-[--gold] transition">
                  hzayas@multielectricpr.com
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <div className="font-semibold text-base mb-3" style={{ color: "var(--gold)" }}>
              {dict.footer.quickLinks}
            </div>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link className="hover:text-[--gold] transition" href="/#home">
                  {dict.nav.home}
                </Link>
              </li>
              <li>
                <Link className="hover:text-[--gold] transition" href="/#services">
                  {dict.nav.services}
                </Link>
              </li>
              <li>
                <Link className="hover:text-[--gold] transition" href="/#about">
                  {dict.nav.about}
                </Link>
              </li>
              <li>
                <Link className="hover:text-[--gold] transition" href="/products">
                  {dict.nav.products}
                </Link>
              </li>
              <li>
                <Link className="hover:text-[--gold] transition" href="/cuenta">
                  {dict.footer.myAccount}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-neutral-800 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Multi Electric Supply. {dict.footer.allRights}
        </div>
      </div>
    </footer>
  );
}

