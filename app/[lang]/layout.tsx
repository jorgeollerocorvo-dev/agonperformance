import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { hasLocale, LOCALES } from "./dictionaries";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Agon Performance",
  description: "Coaching platform — editable workouts, YouTube demos, athlete tracking.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Agon", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F5F0",
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} className={`${inter.variable} h-full antialiased`} style={{ colorScheme: "light" }}>
      <body className="min-h-full bg-[var(--bg)] text-[var(--ink)]">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
