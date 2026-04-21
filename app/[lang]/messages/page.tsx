import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../dictionaries";
import PublicHeader from "@/components/ui/PublicHeader";
import { Card } from "@/components/ui/Card";

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
      <PublicHeader lang={lang} brand={dict.brand} rightSlot={<span className="text-sm text-[var(--ink-muted)]">{dict.messages.title}</span>} />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        {convos.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--ink-muted)]">{dict.messages.empty}</p>
          </Card>
        ) : (
          <Card padded={false} className="divide-y divide-[var(--border)]">
            {convos.map((c) => {
              const other = c.clientUserId === uid ? c.coachUser : c.clientUser;
              const last = c.messages[0];
              return (
                <Link key={c.id} href={`/${lang}/messages/${c.id}`} className="block px-4 sm:px-5 py-4 hover:bg-[var(--surface-2)]">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold truncate">{other.displayName ?? other.fullName ?? other.email}</div>
                    <div className="text-xs text-[var(--ink-muted)] shrink-0">{c.lastMessageAt.toISOString().slice(0, 10)}</div>
                  </div>
                  {last && <div className="text-sm text-[var(--ink-muted)] truncate mt-1">{last.body}</div>}
                </Link>
              );
            })}
          </Card>
        )}
      </main>
    </div>
  );
}
