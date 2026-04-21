import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { createProgram } from "../[id]/actions";

export default async function NewProgramPage({ params, searchParams }: PageProps<"/[lang]/coach/programs/new">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: { athletes: { orderBy: { fullName: "asc" } } },
  });
  if (!coach) notFound();

  const sp = await searchParams;
  const preselected = typeof sp?.athleteId === "string" ? sp.athleteId : "";

  return (
    <div className="space-y-6">
      <Link href={`/${lang}/coach/programs`} className="text-sm text-[var(--ink-muted)] hover:underline">← {dict.nav.programs}</Link>

      <h1 className="text-3xl font-bold">{dict.coach.newProgram}</h1>

      <Card>
        <form action={createProgram} className="space-y-4">
          <input type="hidden" name="lang" value={lang} />
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">Athlete</span>
            <select name="athleteId" required defaultValue={preselected} className={inputCls}>
              <option value="">—</option>
              {coach.athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">Title</span>
            <input name="title" required className={inputCls} placeholder="e.g. 4-Week Strength Block" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">Goal (optional)</span>
            <textarea name="goal" rows={2} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">Start date</span>
              <input name="startDate" type="date" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--ink-muted)]">Duration (weeks)</span>
              <input name="durationWeeks" type="number" min={1} max={52} defaultValue={4} required className={inputCls} />
            </label>
          </div>
          <Button type="submit" size="lg">Create program</Button>
        </form>
      </Card>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
