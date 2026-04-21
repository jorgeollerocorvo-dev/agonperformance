import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";

export default async function MessagesList({ params }: PageProps<"/[lang]/messages">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);

  const uid = session.user.id;
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ clientUserId: uid }, { coachUserId: uid }] },
    include: {
      clientUser: true,
      coachUser: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href={`/${lang}`} className="font-semibold">{dict.brand}</Link>
          <span className="ml-auto text-sm">{dict.messages.title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        {convos.length === 0 ? (
          <p className="text-sm text-zinc-500">{dict.messages.empty}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {convos.map((c) => {
              const other = c.clientUserId === uid ? c.coachUser : c.clientUser;
              const last = c.messages[0];
              return (
                <li key={c.id}>
                  <Link href={`/${lang}/messages/${c.id}`} className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <div className="flex items-baseline justify-between">
                      <div className="font-medium">{other.displayName ?? other.fullName ?? other.email}</div>
                      <div className="text-xs text-zinc-500">{c.lastMessageAt.toISOString().slice(0, 10)}</div>
                    </div>
                    {last && <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{last.body}</div>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
