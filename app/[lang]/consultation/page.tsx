import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import ConsultationBooking from "@/components/ConsultationBooking";

export const metadata = {
  title: "Free Consultation - Agon Performance",
  description: "Book your free 15-20 minute consultation with our fitness coach",
};

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Free Consultation</h1>
          <p className="text-lg text-[var(--ink-muted)]">
            Get personalized advice from our fitness coach
          </p>
        </div>

        <ConsultationBooking />
      </div>
    </div>
  );
}
