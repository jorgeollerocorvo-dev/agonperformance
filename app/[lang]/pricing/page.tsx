import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../dictionaries";
import { Card } from "@/components/ui/Card";
import CheckoutButton from "@/components/CheckoutButton";
import BrandedHeader from "@/components/BrandedHeader";
import { isStripeConfigured } from "@/lib/stripe";

/**
 * Public pricing page — reads SubscriptionPlan rows and renders them with
 * a Stripe Checkout button. If Stripe isn't wired up yet (no key or no
 * providerPriceId), shows a "Contact coach" fallback link so the page
 * still works.
 */
export default async function PricingPage({ params }: PageProps<"/[lang]/pricing">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
  const stripeReady = isStripeConfigured();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <BrandedHeader lang={lang}>
        <Link href={`/${lang}`} className="text-sm text-[var(--ink-muted)] hover:underline">← Home</Link>
      </BrandedHeader>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">
            {lang === "ar" ? "اختر خطتك" : lang === "es" ? "Elige tu plan" : "Choose your plan"}
          </h1>
          <p className="text-sm text-[var(--ink-muted)] mt-2 max-w-xl mx-auto">
            {lang === "ar" ? "كل الخطط تشمل برنامج تدريبي مخصص، فيديوهات لكل حركة، ومتابعة مباشرة مع الكوتش." : lang === "es" ? "Todos los planes incluyen programa de entreno personalizado, videos de cada ejercicio y seguimiento directo con el coach." : "Every plan includes a personalized training program, video demos for every exercise, and direct coach follow-up."}
          </p>
        </header>

        {plans.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-[var(--ink-muted)]">
              {lang === "es" ? "Los planes se estarán activando próximamente. Mientras, " : "Plans will be live shortly. In the meantime, "}
              <Link href={`/${lang}/consultation`} className="text-[var(--primary)] font-semibold hover:underline">
                {lang === "es" ? "reserva una consulta gratuita" : "book a free consultation"}
              </Link>.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p, idx) => {
              const name = lang === "ar" ? (p.nameAr ?? p.nameEn) : lang === "es" ? p.nameEs : p.nameEn;
              const features = Array.isArray(p.features) ? p.features as string[] : [];
              const isMiddle = plans.length === 3 && idx === 1;
              return (
                <Card key={p.id} className={isMiddle ? "border-[var(--primary)] border-2 shadow-lg scale-[1.02]" : ""}>
                  {isMiddle && (
                    <div className="text-xs uppercase tracking-wider text-[var(--primary)] font-bold mb-2 text-center">
                      {lang === "es" ? "Más popular" : lang === "ar" ? "الأكثر شعبية" : "Most popular"}
                    </div>
                  )}
                  <h2 className="text-xl font-bold">{name}</h2>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{Number(p.price).toFixed(0)}</span>
                    <span className="text-sm text-[var(--ink-muted)]">{p.currency}/{p.interval.toLowerCase()}</span>
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {features.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-500">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {stripeReady && (p as unknown as { providerPriceId?: string | null }).providerPriceId ? (
                      <CheckoutButton planId={p.id} lang={lang} label={lang === "es" ? "Empezar ahora" : lang === "ar" ? "ابدأ الآن" : "Start now"} />
                    ) : (
                      <Link href={`/${lang}/consultation`} className="block w-full text-center rounded-full bg-[var(--surface-2)] text-[var(--ink)] px-4 py-3 font-semibold hover:opacity-90">
                        {lang === "es" ? "Hablar con el coach" : lang === "ar" ? "تحدث مع الكوتش" : "Talk to the coach"}
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center text-xs text-[var(--ink-muted)]">
          {lang === "es" ? "Pagos seguros con Stripe. Cancela cuando quieras." : lang === "ar" ? "مدفوعات آمنة عبر Stripe. ألغِ متى شئت." : "Secure payments via Stripe. Cancel anytime."}
        </div>
      </main>
    </div>
  );
}
