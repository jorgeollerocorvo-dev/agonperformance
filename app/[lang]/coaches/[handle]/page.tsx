import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

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
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}`} className="font-semibold">{dict.brand}</Link>
          <Link href={`/${lang}/coaches`} className="text-sm text-zinc-500 hover:underline">← {dict.directory.browseCoaches}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-8">
        <section className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-semibold text-3xl text-zinc-700 dark:text-zinc-200">
            {(coach.user.displayName ?? coach.user.fullName ?? "?").charAt(0)}
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold">{coach.user.displayName ?? coach.user.fullName}</h1>
            {coach.headline && <p className="text-zinc-600 dark:text-zinc-400">{coach.headline}</p>}
            <div className="flex flex-wrap gap-1">
              {coach.specialties.map((s) => (
                <span key={s.specialtyId} className="text-xs rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5">
                  {lang === "es" ? s.specialty.labelEs : s.specialty.labelEn}
                </span>
              ))}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 flex flex-wrap gap-4">
              {coach.homeBaseCity && <span>📍 {coach.homeBaseCity}</span>}
              {coach.yearsExperience && <span>{coach.yearsExperience} {dict.directory.yearsExp}</span>}
              {coach.languagesSpoken.length > 0 && <span>{coach.languagesSpoken.join(" · ")}</span>}
            </div>
            {(coach.pricePerSessionMin || coach.pricePerSessionMax) && (
              <div className="text-lg font-medium">
                {dict.directory.from} {coach.pricePerSessionMin?.toString()} {coach.currency}
                {coach.pricePerSessionMax && ` – ${coach.pricePerSessionMax.toString()} ${coach.currency}`}
              </div>
            )}
          </div>
        </section>

        {bio && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-lg font-medium mb-2">{dict.directory.about}</h2>
            <p className="whitespace-pre-wrap text-sm">{bio}</p>
          </section>
        )}

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="text-lg font-medium mb-3">{dict.directory.contact}</h2>
          <form action={startConversation} className="space-y-3">
            <textarea name="body" rows={4} required placeholder={dict.directory.contactPlaceholder} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.directory.sendMessage}</button>
          </form>
        </section>

        {coach.reviews.length > 0 && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h2 className="text-lg font-medium mb-3">{dict.directory.reviews}</h2>
            <ul className="space-y-3">
              {coach.reviews.map((r) => {
                const body = lang === "es" ? r.bodyEs : r.bodyEn;
                return (
                  <li key={r.id} className="text-sm">
                    <div className="font-medium">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.clientUser.displayName ?? r.clientUser.fullName}</div>
                    {body && <p className="text-zinc-600 dark:text-zinc-400 mt-1">{body}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
