import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import LocationPicker from "@/components/LocationPicker";
import { detectGeo } from "@/lib/geolocation";

export default async function CoachProfileEditor({ params, searchParams }: PageProps<"/[lang]/coach/profile">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const sp = await searchParams;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: { specialties: { include: { specialty: true } }, user: true },
  });
  if (!coach) notFound();

  const allSpecialties = await prisma.specialty.findMany({ where: { isActive: true }, orderBy: { labelEn: "asc" } });
  const selectedIds = new Set(coach.specialties.map((s) => s.specialtyId));
  const geo = await detectGeo();

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;
    const cp = await prisma.coachProfile.findUnique({ where: { userId: s.user.id } });
    if (!cp) return;

    const handleRaw = String(formData.get("handle") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const handle = handleRaw || null;
    const headline = String(formData.get("headline") ?? "").trim() || null;
    const bioEs = String(formData.get("bioEs") ?? "").trim() || null;
    const bioEn = String(formData.get("bioEn") ?? "").trim() || null;
    const yearsRaw = String(formData.get("yearsExperience") ?? "").trim();
    const homeBaseCity = String(formData.get("homeBaseCity") ?? "").trim() || null;
    const currency = String(formData.get("currency") ?? "EUR").trim() || "EUR";
    const priceMin = String(formData.get("pricePerSessionMin") ?? "").trim();
    const priceMax = String(formData.get("pricePerSessionMax") ?? "").trim();
    const listingStatus = String(formData.get("listingStatus") ?? "DRAFT") as "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
    const languages = String(formData.get("languagesSpoken") ?? "")
      .split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);
    const specialtyIds = formData.getAll("specialty").map(String);
    const latRaw = String(formData.get("homeBaseLat") ?? "").trim();
    const lngRaw = String(formData.get("homeBaseLng") ?? "").trim();
    const radiusRaw = String(formData.get("serviceAreaRadiusKm") ?? "").trim();

    // Handle uniqueness check
    if (handle) {
      const taken = await prisma.coachProfile.findFirst({ where: { handle, NOT: { id: cp.id } } });
      if (taken) redirect(`/${lang}/coach/profile?error=handle`);
    }

    await prisma.coachProfile.update({
      where: { id: cp.id },
      data: {
        handle,
        headline,
        bioEs,
        bioEn,
        yearsExperience: yearsRaw ? parseInt(yearsRaw, 10) || null : null,
        homeBaseCity,
        currency,
        pricePerSessionMin: priceMin ? parseFloat(priceMin) : null,
        pricePerSessionMax: priceMax ? parseFloat(priceMax) : null,
        listingStatus,
        languagesSpoken: languages,
        homeBaseLat: latRaw ? parseFloat(latRaw) : null,
        homeBaseLng: lngRaw ? parseFloat(lngRaw) : null,
        serviceAreaRadiusKm: radiusRaw ? parseInt(radiusRaw, 10) || null : null,
      },
    });

    // Replace specialties
    await prisma.coachProfileSpecialty.deleteMany({ where: { coachProfileId: cp.id } });
    for (const specialtyId of specialtyIds) {
      await prisma.coachProfileSpecialty.create({ data: { coachProfileId: cp.id, specialtyId } });
    }

    redirect(`/${lang}/coach/profile?saved=1`);
  }

  const publicUrl = `/${lang}/coaches/${coach.handle ?? coach.id}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{dict.coach.editListing}</h1>
          <p className="text-sm text-[var(--ink-muted)]">{dict.coach.editListingHint}</p>
        </div>
        {coach.listingStatus === "APPROVED" && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]">
            {dict.coach.myListing} ↗
          </a>
        )}
      </header>

      {sp?.saved && (
        <div className="rounded-xl bg-[var(--success-soft)] border border-[var(--success)]/30 text-[var(--success)] px-4 py-2 text-sm">
          ✓ {dict.coach.saved}
        </div>
      )}
      {sp?.error === "handle" && (
        <div className="rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--danger)] px-4 py-2 text-sm">
          That handle is already taken. Pick another.
        </div>
      )}

      <form action={save} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Field label={dict.coach.handle} full>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">/{lang}/coaches/</span>
            <input name="handle" defaultValue={coach.handle ?? ""} className={inputCls} placeholder="your-name" />
          </div>
        </Field>
        <Field label={dict.coach.headline} full>
          <input name="headline" defaultValue={coach.headline ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.bioEs} full>
          <textarea name="bioEs" rows={4} defaultValue={coach.bioEs ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.bioEn} full>
          <textarea name="bioEn" rows={4} defaultValue={coach.bioEn ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.yearsExp}>
          <input name="yearsExperience" type="number" min={0} max={80} defaultValue={coach.yearsExperience ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.city}>
          <input name="homeBaseCity" defaultValue={coach.homeBaseCity ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.currency}>
          <select name="currency" defaultValue={coach.currency} className={inputCls}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="QAR">QAR</option>
            <option value="AED">AED</option>
            <option value="SAR">SAR</option>
            <option value="GBP">GBP</option>
          </select>
        </Field>
        <Field label={dict.coach.languages}>
          <input name="languagesSpoken" defaultValue={coach.languagesSpoken.join(", ")} placeholder="es, en" className={inputCls} />
        </Field>
        <Field label={dict.coach.priceMin}>
          <input name="pricePerSessionMin" type="number" step="0.01" defaultValue={coach.pricePerSessionMin?.toString() ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.priceMax}>
          <input name="pricePerSessionMax" type="number" step="0.01" defaultValue={coach.pricePerSessionMax?.toString() ?? ""} className={inputCls} />
        </Field>
        <Field label={dict.coach.listingStatus}>
          <select name="listingStatus" defaultValue={coach.listingStatus} className={inputCls}>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="APPROVED">APPROVED (public)</option>
            <option value="REJECTED">REJECTED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </Field>
        <Field label={dict.coach.specialties} full>
          <div className="flex flex-wrap gap-2">
            {allSpecialties.map((s) => (
              <label key={s.id} className="text-sm flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5">
                <input type="checkbox" name="specialty" value={s.id} defaultChecked={selectedIds.has(s.id)} />
                {lang === "es" ? s.labelEs : lang === "ar" ? (s.labelAr ?? s.labelEn) : s.labelEn}
              </label>
            ))}
          </div>
        </Field>
        <Field label={dict.coach.serviceArea} full>
          <LocationPicker
            initialLat={coach.homeBaseLat ? Number(coach.homeBaseLat) : null}
            initialLng={coach.homeBaseLng ? Number(coach.homeBaseLng) : null}
            initialRadiusKm={coach.serviceAreaRadiusKm ?? 10}
            defaultCenter={[geo.lat, geo.lng]}
            labels={{
              lat: dict.coach.lat,
              lng: dict.coach.lng,
              radius: dict.coach.radius,
              instruction: dict.coach.locationInstruction,
            }}
          />
        </Field>
        <div className="sm:col-span-2">
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.coach.save}</button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
