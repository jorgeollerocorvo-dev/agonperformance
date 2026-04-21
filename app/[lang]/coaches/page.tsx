import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import CoachDirectory, { type CoachDirItem } from "@/components/CoachDirectory";
import PublicHeader from "@/components/ui/PublicHeader";

export default async function CoachesDirectoryPage({ params, searchParams }: PageProps<"/[lang]/coaches">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;

  const specialtyFilter = typeof sp?.specialty === "string" ? sp.specialty : "";
  const cityFilter = typeof sp?.city === "string" ? sp.city.trim() : "";
  const genderFilter = typeof sp?.gender === "string" ? sp.gender : "";

  const specialties = await prisma.specialty.findMany({ where: { isActive: true }, orderBy: { labelEn: "asc" } });

  const coaches = await prisma.coachProfile.findMany({
    where: {
      listingStatus: "APPROVED",
      ...(specialtyFilter ? { specialties: { some: { specialty: { code: specialtyFilter } } } } : {}),
      ...(cityFilter ? { homeBaseCity: { contains: cityFilter, mode: "insensitive" } } : {}),
      ...(genderFilter ? { user: { gender: genderFilter.toUpperCase() as "MALE" | "FEMALE" } } : {}),
    },
    include: {
      user: true,
      specialties: { include: { specialty: true } },
    },
    orderBy: [
      { subscriptionTier: "desc" },
      { ratingAvg: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
  });

  const dirItems: CoachDirItem[] = coaches.map((c) => ({
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
    photoInitial: (c.user.displayName ?? c.user.fullName ?? "?").charAt(0).toUpperCase(),
    rating: c.ratingAvg ? Number(c.ratingAvg) : null,
    ratingCount: c.ratingCount,
  }));

  return (
    <div className="min-h-screen">
      <PublicHeader
        lang={lang}
        brand={dict.brand}
        rightSlot={
          <>
            <Link href={`/${lang}/find-my-coach`} className="text-sm text-[var(--ink)] hover:underline px-3 py-1.5">{dict.directory.findMyCoach}</Link>
            <Link href={`/${lang}/login`} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">{dict.auth.signIn}</Link>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{dict.directory.browseCoaches}</h1>
          <p className="text-[var(--ink-muted)] mt-1">{dict.directory.tagline}</p>
        </div>

        <form method="GET" className="grid gap-2 sm:grid-cols-4 items-end bg-white rounded-3xl border border-[var(--border)] p-4">
          <label className="text-sm">
            <span className="block mb-1 text-[var(--ink-muted)]">{dict.coach.specialty}</span>
            <select name="specialty" defaultValue={specialtyFilter} className={inputCls}>
              <option value="">—</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.code}>
                  {lang === "es" ? s.labelEs : lang === "ar" ? (s.labelAr ?? s.labelEn) : s.labelEn}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-[var(--ink-muted)]">{dict.directory.city}</span>
            <input name="city" defaultValue={cityFilter} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-[var(--ink-muted)]">{dict.directory.gender}</span>
            <select name="gender" defaultValue={genderFilter} className={inputCls}>
              <option value="">—</option>
              <option value="female">{dict.directory.female}</option>
              <option value="male">{dict.directory.male}</option>
            </select>
          </label>
          <button className="rounded-full bg-[var(--primary)] text-white px-4 py-2 hover:bg-[var(--primary-hover)]">{dict.directory.filter}</button>
        </form>

        {dirItems.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">{dict.directory.noCoaches}</p>
        ) : (
          <CoachDirectory
            coaches={dirItems}
            lang={lang}
            labels={{
              noMapLoc: dict.directory.noMapLocations,
              from: dict.directory.from,
              perSession: dict.directory.perSession ?? "session",
            }}
          />
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
