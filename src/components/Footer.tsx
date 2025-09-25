"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { dict } = useI18n();
  return (
    <footer id="contact" className="bg-neutral-950 text-gray-300 border-t border-neutral-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-semibold" style={{ color: "var(--gold)" }}>{dict.brand}</div>
            <p className="mt-2 text-gray-400">{dict.footer.rights}</p>
          </div>
          <div>
            <div className="font-semibold mb-2">{dict.footer.contact}</div>
            <ul className="space-y-1 text-gray-400">
              <li><span className="text-gray-500">{dict.footer.address}:</span> 123 Main St, City</li>
              <li><span className="text-gray-500">{dict.footer.phone}:</span> (555) 123-4567</li>
              <li><span className="text-gray-500">{dict.footer.email}:</span> support@multielectric.com</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Links</div>
            <ul className="space-y-1 text-gray-400">
              <li><a className="hover:text-white" href="#home">Home</a></li>
              <li><a className="hover:text-white" href="#services">Services</a></li>
              <li><a className="hover:text-white" href="#featured">Featured</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-xs text-gray-500">© {new Date().getFullYear()} Multi Electric Supply</div>
      </div>
    </footer>
  );
}

