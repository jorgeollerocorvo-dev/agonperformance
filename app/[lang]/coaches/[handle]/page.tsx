import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import PublicHeader from "@/components/ui/PublicHeader";
import { Card, Pill, Button } from "@/components/ui/Card";

export default async function PublicCoachProfile({ params }: PageProps<"/[lang]/coaches/[handle]">) {
  const { lang, handle } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  const coach = await prisma.coachProfile.findFirst({
    where: { OR: [{ handle }, { id: handle }], listingStatus: "APPROVED" },
    include: {
      user: true,
      specialties: { include: { specialty: true } },
      reviews: { where: { isHidden: false }, orderBy: { createdAt: "desc" }, take: 5, include: { clientUser: true } },
    },
  });
  if (!coach) notFound();

  const bio = lang === "es" ? coach.bioEs : coach.bioEn;

  async function startConversation(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect(`/${lang}/login?next=/${lang}/coaches/${handle}`);
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    const clientUserId = session.user.id;
    const coachUserId = coach!.userId;
    if (clientUserId === coachUserId) return;

    const convo = await prisma.conversation.upsert({
      where: { clientUserId_coachUserId: { clientUserId, coachUserId } },
      update: { lastMessageAt: new Date() },
      create: { clientUserId, coachUserId },
    });

    await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderUserId: clientUserId,
        body,
        containsContactInfo: /\b\d{6,}\b|@|whatsapp/i.test(body),
      },
    });

    redirect(`/${lang}/messages/${convo.id}`);
  }

  return (
    <div className="min-h-screen">
      <PublicHeader
        lang={lang}
        brand={dict.brand}
        rightSlot={
          <Link href={`/${lang}/coaches`} className="text-sm text-[var(--ink-muted)] hover:underline px-3 py-1.5">← {dict.directory.browseCoaches}</Link>
        }
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <Card className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-3xl bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center font-bold text-3xl shrink-0">
            {(coach.user.displayName ?? coach.user.fullName ?? "?").charAt(0)}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{coach.user.displayName ?? coach.user.fullName}</h1>
            {coach.headline && <p className="text-[var(--ink-muted)]">{coach.headline}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {coach.specialties.map((s) => (
                <Pill key={s.specialtyId} color="primary">
                  {lang === "es" ? s.specialty.labelEs : lang === "ar" ? (s.specialty.labelAr ?? s.specialty.labelEn) : s.specialty.labelEn}
                </Pill>
              ))}
            </div>
            <div className="text-sm text-[var(--ink-muted)] flex flex-wrap gap-4 mt-2">
              {coach.homeBaseCity && <span>📍 {coach.homeBaseCity}</span>}
              {coach.yearsExperience && <span>{coach.yearsExperience} {dict.directory.yearsExp}</span>}
              {coach.languagesSpoken.length > 0 && <span>{coach.languagesSpoken.join(" · ")}</span>}
            </div>
            {(coach.pricePerSessionMin || coach.pricePerSessionMax) && (
              <div className="text-xl font-bold mt-2">
                {dict.directory.from} {coach.pricePerSessionMin?.toString()} {coach.currency}
                {coach.pricePerSessionMax && <span className="text-[var(--ink-muted)] font-normal text-base"> – {coach.pricePerSessionMax.toString()} {coach.currency}</span>}
              </div>
            )}
          </div>
        </Card>

        {bio && (
          <Card>
            <h2 className="text-lg font-semibold mb-2">{dict.directory.about}</h2>
            <p className="whitespace-pre-wrap">{bio}</p>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-semibold mb-3">{dict.directory.contact}</h2>
          <form action={startConversation} className="space-y-3">
            <textarea name="body" rows={4} required placeholder={dict.directory.contactPlaceholder} className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]" />
            <Button type="submit">{dict.directory.sendMessage}</Button>
          </form>
        </Card>

        {coach.reviews.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold mb-3">{dict.directory.reviews}</h2>
            <ul className="space-y-4">
              {coach.reviews.map((r) => {
                const body = lang === "es" ? r.bodyEs : lang === "ar" ? (r.bodyAr ?? r.bodyEn) : r.bodyEn;
                return (
                  <li key={r.id}>
                    <div className="font-medium text-sm">
                      <span className="text-[var(--primary)]">{"★".repeat(r.rating)}</span>
                      <span className="text-[var(--ink-subtle)]">{"☆".repeat(5 - r.rating)}</span>
                      <span className="text-[var(--ink-muted)]"> · {r.clientUser.displayName ?? r.clientUser.fullName}</span>
                    </div>
                    {body && <p className="text-[var(--ink-muted)] mt-1 text-sm">{body}</p>}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
