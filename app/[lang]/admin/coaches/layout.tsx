import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { getDictionary, hasLocale } from "../../dictionaries";
import CoachSidebarItem from "@/components/CoachSidebarItem";

export default async function CoachesAreaLayout({
  params,
  children,
}: LayoutProps<"/[lang]/admin/coaches">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const session = await auth();

  // Only Jorge can access the Coaches Area
  if (!isJorge(session)) {
    notFound();
  }

  // Fetch all coaches with their data
  const coaches = await prisma.coachProfile.findMany({
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      athletes: {
        select: { id: true, fullName: true, division: true, programs: { select: { id: true } } },
      },
      movements: { select: { id: true, code: true, nameEn: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Coaches Area</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          View and manage all coaches, their athletes, programs, and custom movements.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar: Coach List */}
        <aside className="space-y-2">
          <h2 className="font-semibold text-sm text-[var(--ink-muted)] uppercase tracking-wider mb-3">
            All Coaches ({coaches.length})
          </h2>
          <div className="space-y-2">
            {coaches.length === 0 ? (
              <div className="text-xs text-[var(--ink-muted)]">No coaches yet</div>
            ) : (
              coaches.map((coach) => (
                <CoachSidebarItem key={coach.id} coach={coach} lang={lang} />
              ))
            )}
          </div>
        </aside>

        {/* Main: Coach Details or Placeholder */}
        <main>{children}</main>
      </div>
    </div>
  );
}
