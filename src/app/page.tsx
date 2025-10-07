import { Metadata } from "next";
import Hero from "@/components/Hero";
import Featured from "@/components/Featured";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import { generateSEO } from "@/lib/seo";

export const metadata: Metadata = generateSEO({
  title: "Home",
  description: "Multi Electric Supply - Your trusted source for professional electrical supplies and services. Quality products, expert solutions for residential and commercial projects.",
  path: "/",
});

export default function Home() {
  return (
    <main>
      <Hero />
      <Featured />
      <Services />
      <Footer />
    </main>
  );
}
