import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import HomeLink from "@/components/HomeLink";

export default async function ConversationPage({ params }: PageProps<"/[lang]/messages/[id]">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);

  const uid = session.user.id;
  const convo = await prisma.conversation.findFirst({
    where: { id, OR: [{ clientUserId: uid }, { coachUserId: uid }] },
    include: {
      clientUser: true,
      coachUser: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) notFound();

  const other = convo.clientUserId === uid ? convo.coachUser : convo.clientUser;

  // Mark read
  await prisma.conversation.update({
    where: { id },
    data: convo.clientUserId === uid ? { clientReadAt: new Date() } : { coachReadAt: new Date() },
  });

  async function sendMessage(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    await prisma.message.create({
      data: {
        conversationId: id,
        senderUserId: s.user.id,
        body,
        containsContactInfo: /\b\d{6,}\b|@|whatsapp/i.test(body),
      },
    });
    await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
    redirect(`/${lang}/messages/${id}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] backdrop-blur border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-3 flex items-center gap-3">
          <HomeLink href={`/${lang}`} label="Home" />
          <Link href={`/${lang}/messages`} className="text-sm text-[var(--ink-muted)] hover:underline">←</Link>
          <span className="font-semibold">{other.displayName ?? other.fullName ?? other.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl w-full flex-1 px-4 sm:px-6 py-6 flex flex-col gap-3">
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {convo.messages.map((m) => {
            const mine = m.senderUserId === uid;
            return (
              <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-[var(--primary)] text-white" : "bg-white border border-[var(--border)]"}`}>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-zinc-500"}`}>
                    {m.createdAt.toISOString().slice(11, 16)}
                    {m.containsContactInfo && <span className="ml-1">⚠️</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <form action={sendMessage} className="flex gap-2 sticky bottom-0 bg-[var(--bg)] pt-3">
          <input name="body" required className="flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]" placeholder={dict.messages.placeholder} />
          <button className="rounded-full bg-[var(--primary)] text-white px-5 py-2 font-medium hover:bg-[var(--primary-hover)]">{dict.messages.send}</button>
        </form>
      </main>
    </div>
  );
}
