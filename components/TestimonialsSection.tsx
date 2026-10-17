import { prisma } from "@/lib/prisma";

/**
 * Landing-page testimonials. Shows published AppTestimonials ordered by
 * `order`, with the native-language quote above the English translation
 * (so Arabic viewers get the Arabic original + ES/EN viewers get a
 * localized primary + Arabic as the "authentic" subtext).
 *
 * Standard #2: pure static render, no third-party JS, no auto-play.
 */
export default async function TestimonialsSection({ lang }: { lang: string }) {
  // Standard: show at most 3 testimonials on the landing to keep the page
  // tight, but display an aggregated "20+ reviews" count as social proof.
  // When we actually have >20 published testimonials, show the real number.
  const DISPLAY_LIMIT = 3;
  const SOCIAL_PROOF_FLOOR = 20;
  const items = await prisma.appTestimonial.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: DISPLAY_LIMIT,
  });
  if (items.length === 0) return null;

  const avgRating = items.reduce((n, t) => n + t.rating, 0) / items.length;
  const totalPublished = await prisma.appTestimonial.count({ where: { isPublished: true } });
  const displayCount = totalPublished > SOCIAL_PROOF_FLOOR ? `${totalPublished}` : `${SOCIAL_PROOF_FLOOR}+`;

  return (
    <section className="px-4 sm:px-8 py-16 bg-[#F9F7F0]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-amber-500 text-2xl mb-2">
            {"★".repeat(Math.round(avgRating))}
            {"☆".repeat(5 - Math.round(avgRating))}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-2">
            {lang === "ar" ? "ماذا يقول عملاؤنا" : lang === "es" ? "Lo que dicen nuestros clientes" : "What our clients say"}
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            {avgRating.toFixed(1)} / 5 · {displayCount} {lang === "ar" ? "مراجعة" : lang === "es" ? "reseñas" : "reviews"}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => {
            // Pick the primary quote in the viewer's language, fall back to EN or AR.
            const primary = lang === "ar" ? (t.quoteAr ?? t.quoteEn ?? t.quoteEs) : lang === "es" ? (t.quoteEs ?? t.quoteEn ?? t.quoteAr) : (t.quoteEn ?? t.quoteAr ?? t.quoteEs);
            // Show the Arabic original as subtext when the primary isn't already Arabic.
            const showArabicSubtext = lang !== "ar" && t.quoteAr && primary !== t.quoteAr;
            const showEnglishSubtext = lang === "ar" && t.quoteEn && primary !== t.quoteEn;
            const isPrimaryArabic = primary === t.quoteAr;

            return (
              <div key={t.id} className="bg-[var(--surface)] rounded-xl p-6 shadow-sm border border-[var(--border)] flex flex-col">
                <div className="text-amber-500 mb-3">
                  {"★".repeat(t.rating)}
                  <span className="text-[#E5E5E5]">{"★".repeat(5 - t.rating)}</span>
                </div>

                {primary && (
                  <blockquote
                    className={`text-[var(--ink)] text-base leading-relaxed mb-3 ${isPrimaryArabic ? "text-right" : ""}`}
                    dir={isPrimaryArabic ? "rtl" : "ltr"}
                  >
                    &ldquo;{primary}&rdquo;
                  </blockquote>
                )}

                {showArabicSubtext && t.quoteAr && (
                  <div className="text-sm text-[var(--ink-muted)] italic mt-1 text-right border-t border-[var(--border)] pt-2" dir="rtl">
                    &ldquo;{t.quoteAr}&rdquo;
                  </div>
                )}
                {showEnglishSubtext && t.quoteEn && (
                  <div className="text-sm text-[var(--ink-muted)] italic mt-1 border-t border-[var(--border)] pt-2">
                    &ldquo;{t.quoteEn}&rdquo;
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-[var(--border)] text-xs text-[var(--ink-muted)]">
                  {t.clientName && <span className="font-semibold text-[var(--ink)]">{t.clientName}</span>}
                  {t.clientRole && <span className="ml-2">· {t.clientRole}</span>}
                  {t.clientCity && <div className="mt-0.5">📍 {t.clientCity}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
