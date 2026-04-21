import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function CoachesDirectory({ params, searchParams }: PageProps<"/[lang]/coaches">) {
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
    take: 60,
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}`} className="font-semibold">{dict.brand}</Link>
          <Link href={`/${lang}/find-my-coach`} className="ml-auto text-sm text-zinc-700 dark:text-zinc-300 hover:underline">{dict.directory.findMyCoach}</Link>
          <Link href={`/${lang}/login`} className="text-sm rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">{dict.auth.signIn}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{dict.directory.browseCoaches}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{dict.directory.tagline}</p>
        </div>

        <form method="GET" className="grid gap-2 sm:grid-cols-4 items-end">
          <label className="text-sm">
            <span className="block mb-1">{dict.coach.specialty}</span>
            <select name="specialty" defaultValue={specialtyFilter} className={inputCls}>
              <option value="">—</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.code}>{lang === "es" ? s.labelEs : s.labelEn}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1">{dict.directory.city}</span>
            <input name="city" defaultValue={cityFilter} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="block mb-1">{dict.directory.gender}</span>
            <select name="gender" defaultValue={genderFilter} className={inputCls}>
              <option value="">—</option>
              <option value="female">{dict.directory.female}</option>
              <option value="male">{dict.directory.male}</option>
            </select>
          </label>
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.directory.filter}</button>
        </form>

        {coaches.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.directory.noCoaches}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${lang}/coaches/${c.handle ?? c.id}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-semibold text-zinc-700 dark:text-zinc-200">
                      {(c.user.displayName ?? c.user.fullName ?? "?").charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{c.user.displayName ?? c.user.fullName}</div>
                      {c.headline && <div className="text-xs text-zinc-500">{c.headline}</div>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.specialties.slice(0, 3).map((s) => (
                      <span key={s.specialtyId} className="text-xs rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5">
                        {lang === "es" ? s.specialty.labelEs : s.specialty.labelEn}
                      </span>
                    ))}
                  </div>
                  {(c.pricePerSessionMin || c.pricePerSessionMax) && (
                    <div className="mt-2 text-sm">
                      {dict.directory.from} {c.pricePerSessionMin?.toString()} {c.currency}
                      {c.pricePerSessionMax && ` – ${c.pricePerSessionMax.toString()}`}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800";
