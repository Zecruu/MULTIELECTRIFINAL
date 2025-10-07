import { Metadata } from "next";

const SITE_NAME = "Multi Electric";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://multielectric.com";
const SITE_DESCRIPTION = "Professional electrical supplies and services. Quality products, expert solutions.";
const BUSINESS_PHONE = "(555) 123-4567"; // Update with actual phone
const BUSINESS_ADDRESS = {
  street: "123 Main Street", // Update with actual address
  city: "Your City",
  state: "State",
  zip: "12345",
  country: "US"
};

type SEOParams = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
};

export function generateSEO({
  title,
  description = SITE_DESCRIPTION,
  path = "",
  image = `${SITE_URL}/og-image.jpg`,
  type = "website",
  noIndex = false,
}: SEOParams = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    applicationName: SITE_NAME,
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}

// Local Business Schema Markup (JSON-LD)
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ElectricalSupplyStore",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: BUSINESS_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.street,
      addressLocality: BUSINESS_ADDRESS.city,
      addressRegion: BUSINESS_ADDRESS.state,
      postalCode: BUSINESS_ADDRESS.zip,
      addressCountry: BUSINESS_ADDRESS.country,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "14:00",
      },
    ],
    priceRange: "$$",
  };
}

// Product Schema Markup
export function generateProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  sku?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: product.currency || "USD",
      availability: `https://schema.org/${product.availability || "InStock"}`,
      url: SITE_URL,
    },
  };
}

// Breadcrumb Schema Markup
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

