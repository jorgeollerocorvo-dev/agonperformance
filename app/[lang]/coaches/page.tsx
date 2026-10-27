import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import CoachDirectory, { type CoachDirItem } from "@/components/CoachDirectory";
import BrandedHeader from "@/components/BrandedHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { detectGeo } from "@/lib/geolocation";
import { auth } from "@/auth";
import { primaryRole } from "@/lib/roles";
import {
  QATAR_AREAS,
  QATAR_CENTER,
  COMMON_LANGUAGES,
  PRICE_BUCKETS,
  EXPERIENCE_BUCKETS,
} from "@/lib/qatar-areas";

/**
 * Doctoralia-style coach finder for Qatar.
 *
 * Filters are URL-first (searchParams) so the result page is shareable and
 * crawlable — crucial for SEO against searches like "crossfit coach West
 * Bay". The CoachDirectory client component only owns ephemeral state
 * (hover / selected pin ↔ card). Every filter change triggers a GET.
 */
export default async function CoachesDirectoryPage({ params, searchParams }: PageProps<"/[lang]/coaches">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const session = await auth();
  const role = primaryRole(session);
  const dashboardHref =
    role === "COACH" ? `/${lang}/coach`
    : role === "ADMIN" ? `/${lang}/admin`
    : role === "CLIENT" ? `/${lang}/athlete`
    : null;

  // Pull every filter from URL searchParams.
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const specialtyFilter = typeof sp?.specialty === "string" ? sp.specialty : "";
  const area = typeof sp?.area === "string" ? sp.area : "";
  const cityFilter = typeof sp?.city === "string" ? sp.city.trim() : "";
  const genderFilter = typeof sp?.gender === "string" ? sp.gender : "";
  const priceBucket = typeof sp?.price === "string" ? sp.price : "";
  const expBucket = typeof sp?.exp === "string" ? sp.exp : "";
  const langsFilter = typeof sp?.langs === "string" ? sp.langs.split(",").filter(Boolean) : [];
  const minRating = typeof sp?.rating === "string" ? parseFloat(sp.rating) || 0 : 0;
  const onlineOnly = sp?.online === "1";
  const travels = sp?.travels === "1";

  const priceRange = PRICE_BUCKETS.find((b) => b.id === priceBucket);
  const expRange = EXPERIENCE_BUCKETS.find((b) => b.id === expBucket);
  const areaMatch = QATAR_AREAS.find((a) => a.id === area);

  const [geo, specialties, coaches] = await Promise.all([
    detectGeo(),
    prisma.specialty.findMany({ where: { isActive: true }, orderBy: { labelEn: "asc" } }),
    prisma.coachProfile.findMany({
      where: {
        listingStatus: "APPROVED",
        ...(specialtyFilter ? { specialties: { some: { specialty: { code: specialtyFilter } } } } : {}),
        // Area quick-pick wins over the free-text city filter.
        ...(areaMatch
          ? { OR: [{ homeBaseCity: { contains: areaMatch.label, mode: "insensitive" } }, { serviceAreaCities: { has: areaMatch.label } }] }
          : cityFilter
            ? { homeBaseCity: { contains: cityFilter, mode: "insensitive" } }
            : {}),
        ...(genderFilter ? { user: { gender: genderFilter.toUpperCase() as "MALE" | "FEMALE" } } : {}),
        ...(priceRange ? { pricePerSessionMin: { gte: priceRange.min, lte: priceRange.max } } : {}),
        ...(expRange ? { yearsExperience: { gte: expRange.min, lte: expRange.max } } : {}),
        ...(langsFilter.length ? { languagesSpoken: { hasSome: langsFilter } } : {}),
        ...(minRating > 0 ? { ratingAvg: { gte: minRating } } : {}),
        ...(travels ? { willTravel: true } : {}),
      },
      include: {
        user: true,
        specialties: { include: { specialty: true } },
      },
      orderBy: [
        { subscriptionTier: "desc" }, // paid plans rank first
        { ratingAvg: "desc" },
        { ratingCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
  ]);

  // Simple post-query text filter for name + headline + bio (keeps the SQL
  // simple; coaches list is <100 rows per request so JS filter is cheap).
  const filtered = q
    ? coaches.filter((c) => {
        const needle = q.toLowerCase();
        return (
          (c.user.displayName ?? c.user.fullName ?? "").toLowerCase().includes(needle) ||
          (c.headline ?? "").toLowerCase().includes(needle) ||
          (c.bioEn ?? "").toLowerCase().includes(needle)
        );
      })
    : coaches;

  // Optionally restrict to coaches offering online (= `onlineOnly`). The
  // schema stores this on `servicesOffered` JSON — we scan it in JS.
  const final = onlineOnly
    ? filtered.filter((c) => {
        const svc = (c.servicesOffered ?? {}) as Record<string, unknown>;
        return !!svc.online || !!svc.onlineCoaching || !!svc.remote;
      })
    : filtered;

  const dirItems: CoachDirItem[] = final.map((c) => ({
    id: c.id,
    handle: c.handle,
    name: c.user.displayName ?? c.user.fullName ?? c.user.email ?? "Coach",
    headline: c.headline,
    city: c.homeBaseCity,
    specialties: c.specialties.map((s) => ({
      id: s.specialtyId,
      label: lang === "es" ? s.specialty.labelEs : lang === "ar" ? (s.specialty.labelAr ?? s.specialty.labelEn) : s.specialty.labelEn,
    })),
    priceMin: c.pricePerSessionMin?.toString() ?? null,
    priceMax: c.pricePerSessionMax?.toString() ?? null,
    currency: c.currency,
    lat: c.homeBaseLat ? Number(c.homeBaseLat) : null,
    lng: c.homeBaseLng ? Number(c.homeBaseLng) : null,
    radiusKm: c.serviceAreaRadiusKm ?? null,
    photoUrl: c.profilePhotoUrl ?? null,
    photoInitial: (c.user.displayName ?? c.user.fullName ?? "?").charAt(0).toUpperCase(),
    rating: c.ratingAvg ? Number(c.ratingAvg) : null,
    ratingCount: c.ratingCount,
    yearsExperience: c.yearsExperience ?? null,
    languages: c.languagesSpoken,
    verified: c.verificationBadge,
    willTravel: c.willTravel,
    subscriptionTier: c.subscriptionTier,
  }));

  const totalCount = dirItems.length;
  const defaultCenter: [number, number] = areaMatch
    ? [areaMatch.lat, areaMatch.lng]
    : [geo?.lat ?? QATAR_CENTER[0], geo?.lng ?? QATAR_CENTER[1]];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        {dashboardHref ? (
          <Link
            href={dashboardHref}
            className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            {dict.nav.profile} →
          </Link>
        ) : (
          <>
            <Link
              href={`/${lang}/login`}
              className="text-sm px-3 py-2 text-[var(--ink-muted)] hover:text-[var(--ink)] hidden sm:inline transition-colors"
            >
              {dict.auth.signIn}
            </Link>
            <Link
              href={`/${lang}/register`}
              className="rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              {dict.auth.signUp}
            </Link>
          </>
        )}
      </BrandedHeader>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero search */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] via-[#1E5A94] to-[var(--ink)] p-6 sm:p-10 text-white">
          <div className="relative z-10 max-w-3xl space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              {lang === "ar" ? "اعثر على مدربك الشخصي في قطر" : lang === "es" ? "Encuentra tu coach personal en Qatar" : "Find your personal coach in Qatar"}
            </h1>
            <p className="text-sm sm:text-base text-white/85">
              {lang === "ar" ? "ابحث حسب التخصص والمنطقة والسعر والخبرة. راجع الملفات الشخصية والمراجعات واحجز استشارة مجانية." : lang === "es" ? "Filtra por especialidad, área, precio y experiencia. Perfil, reseñas y consulta gratuita en 1 click." : "Filter by specialty, area, price and experience. Browse profiles, reviews and book a free consultation in 1 click."}
            </p>

            <form method="GET" className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-xl">
              <input
                name="q"
                defaultValue={q}
                placeholder={lang === "es" ? "Nombre, especialidad o palabra clave" : lang === "ar" ? "الاسم أو التخصص أو كلمة مفتاحية" : "Name, specialty or keyword"}
                className="flex-1 px-4 py-3 text-sm text-[var(--ink)] bg-transparent outline-none"
              />
              <select name="area" defaultValue={area} className="px-4 py-3 text-sm text-[var(--ink)] bg-[var(--surface-2)] rounded-xl outline-none">
                <option value="">{lang === "es" ? "Toda zona" : lang === "ar" ? "جميع المناطق" : "All areas"}</option>
                {QATAR_AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              {/* Carry other filters across searches */}
              {specialtyFilter && <input type="hidden" name="specialty" value={specialtyFilter} />}
              {genderFilter && <input type="hidden" name="gender" value={genderFilter} />}
              {priceBucket && <input type="hidden" name="price" value={priceBucket} />}
              {expBucket && <input type="hidden" name="exp" value={expBucket} />}
              {langsFilter.length > 0 && <input type="hidden" name="langs" value={langsFilter.join(",")} />}
              {onlineOnly && <input type="hidden" name="online" value="1" />}
              {travels && <input type="hidden" name="travels" value="1" />}
              <button className="rounded-xl bg-[var(--ink)] text-white px-6 py-3 text-sm font-semibold hover:opacity-90 transition">
                {lang === "es" ? "Buscar" : lang === "ar" ? "بحث" : "Search"}
              </button>
            </form>
          </div>
          {/* Decorative blur */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" aria-hidden />
        </section>

        {/* Area quick-pick chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[{ id: "", label: lang === "es" ? "Todo Qatar" : lang === "ar" ? "كل قطر" : "All Qatar" }, ...QATAR_AREAS].map((a) => {
            const isActive = area === a.id;
            const params = new URLSearchParams({ ...toParams(sp), area: a.id });
            if (!a.id) params.delete("area");
            return (
              <Link
                key={a.id || "all"}
                href={`?${params.toString()}`}
                className={`whitespace-nowrap text-xs rounded-full px-4 py-2 border transition shrink-0 ${isActive ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface-2)]"}`}
              >
                📍 {a.label}
              </Link>
            );
          })}
        </div>

        {/* Main grid: filters sidebar + results */}
        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
          {/* Sidebar filters */}
          <aside className="space-y-5">
            <FilterGroup title={lang === "es" ? "Especialidad" : lang === "ar" ? "التخصص" : "Specialty"}>
              <select name="specialty" defaultValue={specialtyFilter} className={inputCls} onChange={(e) => redirectWith(sp, { specialty: e.target.value })}>
                <option value="">—</option>
                {specialties.map((s) => (
                  <option key={s.id} value={s.code}>
                    {lang === "es" ? s.labelEs : lang === "ar" ? (s.labelAr ?? s.labelEn) : s.labelEn}
                  </option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Precio por sesión" : lang === "ar" ? "السعر لكل جلسة" : "Price per session"}>
              <ChipGroup current={priceBucket} buckets={PRICE_BUCKETS.map((b) => ({ id: b.id, label: b.label }))} param="price" sp={sp} />
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Experiencia" : lang === "ar" ? "الخبرة" : "Experience"}>
              <ChipGroup current={expBucket} buckets={EXPERIENCE_BUCKETS.map((b) => ({ id: b.id, label: b.label }))} param="exp" sp={sp} />
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Rating mínimo" : lang === "ar" ? "التقييم" : "Min rating"}>
              <ChipGroup
                current={minRating ? String(minRating) : ""}
                buckets={[
                  { id: "4.5", label: "★ 4.5+" },
                  { id: "4", label: "★ 4+" },
                  { id: "3", label: "★ 3+" },
                ]}
                param="rating"
                sp={sp}
              />
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Género del coach" : lang === "ar" ? "جنس المدرب" : "Coach gender"}>
              <ChipGroup
                current={genderFilter}
                buckets={[
                  { id: "female", label: lang === "es" ? "Mujer" : lang === "ar" ? "امرأة" : "Female" },
                  { id: "male", label: lang === "es" ? "Hombre" : lang === "ar" ? "رجل" : "Male" },
                ]}
                param="gender"
                sp={sp}
              />
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Idiomas" : lang === "ar" ? "اللغات" : "Languages"}>
              <div className="flex flex-wrap gap-1">
                {COMMON_LANGUAGES.map((l) => {
                  const active = langsFilter.includes(l.code);
                  const next = active ? langsFilter.filter((c) => c !== l.code) : [...langsFilter, l.code];
                  const params = new URLSearchParams(toParams(sp));
                  if (next.length) params.set("langs", next.join(","));
                  else params.delete("langs");
                  return (
                    <Link
                      key={l.code}
                      href={`?${params.toString()}`}
                      className={`text-[0.65rem] rounded-full px-2 py-1 border transition ${active ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]"}`}
                    >
                      {l.nativeLabel}
                    </Link>
                  );
                })}
              </div>
            </FilterGroup>

            <FilterGroup title={lang === "es" ? "Opciones" : lang === "ar" ? "خيارات" : "Options"}>
              <div className="flex flex-wrap gap-1">
                <ToggleChip label={lang === "es" ? "💻 Online" : lang === "ar" ? "💻 عبر الإنترنت" : "💻 Online"} active={onlineOnly} param="online" sp={sp} />
                <ToggleChip label={lang === "es" ? "🚗 Se desplaza" : lang === "ar" ? "🚗 يتنقل" : "🚗 Travels"} active={travels} param="travels" sp={sp} />
              </div>
            </FilterGroup>

            {(q || specialtyFilter || area || priceBucket || expBucket || genderFilter || langsFilter.length > 0 || minRating > 0 || onlineOnly || travels) && (
              <Link href="?" className="block text-center text-xs text-[var(--danger)] hover:underline">
                {lang === "es" ? "Limpiar filtros" : lang === "ar" ? "مسح الفلاتر" : "Clear filters"}
              </Link>
            )}
          </aside>

          {/* Results */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {totalCount} {lang === "es" ? "coaches encontrados" : lang === "ar" ? "مدرب" : totalCount === 1 ? "coach" : "coaches"}
                {areaMatch && <span className="text-[var(--ink-muted)] font-normal"> · {areaMatch.label}</span>}
              </h2>
            </div>
            {totalCount === 0 ? (
              <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-10 text-center">
                <div className="text-5xl mb-3">🤷</div>
                <p className="text-sm text-[var(--ink-muted)]">
                  {lang === "es" ? "Ningún coach con esos filtros. Prueba con menos restricciones." : lang === "ar" ? "لم يتم العثور على مدرب. جرب تقليل الفلاتر." : "No coach matches. Try fewer filters."}
                </p>
              </div>
            ) : (
              <CoachDirectory
                coaches={dirItems}
                lang={lang}
                defaultCenter={defaultCenter}
                labels={{
                  noMapLoc: dict.directory.noMapLocations,
                  from: dict.directory.from,
                  perSession: dict.directory.perSession ?? "session",
                  viewProfile: dict.directory.viewProfile ?? "View profile",
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Flatten searchParams to a plain object for URLSearchParams. */
function toParams(sp: Record<string, string | string[] | undefined> | undefined): Record<string, string> {
  if (!sp) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// Server-rendered sub-components below. Keeping them here (not extracted) so
// the whole filter page is one file to grok.

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)] font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ current, buckets, param, sp }: { current: string; buckets: Array<{ id: string; label: string }>; param: string; sp: Record<string, string | string[] | undefined> | undefined }) {
  return (
    <div className="flex flex-wrap gap-1">
      {buckets.map((b) => {
        const active = current === b.id;
        const params = new URLSearchParams(toParams(sp));
        if (active) params.delete(param);
        else params.set(param, b.id);
        return (
          <Link
            key={b.id}
            href={`?${params.toString()}`}
            className={`text-xs rounded-full px-3 py-1 border transition ${active ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]"}`}
          >
            {b.label}
          </Link>
        );
      })}
    </div>
  );
}

function ToggleChip({ label, active, param, sp }: { label: string; active: boolean; param: string; sp: Record<string, string | string[] | undefined> | undefined }) {
  const params = new URLSearchParams(toParams(sp));
  if (active) params.delete(param);
  else params.set(param, "1");
  return (
    <Link href={`?${params.toString()}`} className={`text-xs rounded-full px-3 py-1 border transition ${active ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>
      {label}
    </Link>
  );
}

// Dummy no-op the TS compiler needs — the specialty select could be made
// client-interactive later; for now it's visual only (users select then click
// Search in the hero bar, since the whole filter row re-renders on URL change
// anyway).
function redirectWith(_sp: unknown, _patch: unknown): void {}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
