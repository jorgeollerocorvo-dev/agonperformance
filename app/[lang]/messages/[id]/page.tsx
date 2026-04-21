import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

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
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}/messages`} className="text-sm text-zinc-500 hover:underline">←</Link>
          <span className="font-medium">{other.displayName ?? other.fullName ?? other.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl w-full flex-1 px-4 sm:px-6 py-6 flex flex-col gap-3">
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {convo.messages.map((m) => {
            const mine = m.senderUserId === uid;
            return (
              <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}>
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
        <form action={sendMessage} className="flex gap-2 sticky bottom-0 bg-zinc-50 dark:bg-zinc-950 pt-3">
          <input name="body" required className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder={dict.messages.placeholder} />
          <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">{dict.messages.send}</button>
        </form>
      </main>
    </div>
  );
}
