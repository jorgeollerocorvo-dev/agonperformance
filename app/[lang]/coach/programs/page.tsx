import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";

export default async function ProgramsPage({ params }: PageProps<"/[lang]/coach/programs">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const coach = await prisma.coach.findUnique({
    where: { userId: session!.user.id },
    include: { programs: true },
  });

  async function createProgram(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const specialty = String(formData.get("specialty") ?? "OTHER") as
      | "CROSSFIT" | "WOMEN" | "BODYBUILDING" | "OTHER";
    if (!name) return;
    const s = await auth();
    const c = await prisma.coach.findUnique({ where: { userId: s!.user.id } });
    const p = await prisma.program.create({
      data: { name, specialty, coachId: c!.id },
    });
    redirect(`/${lang}/coach/programs/${p.id}`);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{dict.nav.programs}</h1>

      <form action={createProgram} className="flex gap-2 items-end flex-wrap rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <label className="text-sm flex-1 min-w-40">
          <span className="block mb-1">Name</span>
          <input name="name" required className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800" />
        </label>
        <label className="text-sm">
          <span className="block mb-1">{dict.coach.specialty}</span>
          <select name="specialty" className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <option value="CROSSFIT">{dict.coach.crossfit}</option>
            <option value="WOMEN">{dict.coach.women}</option>
            <option value="BODYBUILDING">{dict.coach.bodybuilding}</option>
            <option value="OTHER">{dict.coach.other}</option>
          </select>
        </label>
        <button className="rounded-md bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900">
          {dict.coach.newProgram}
        </button>
      </form>

      <ul className="grid gap-3 sm:grid-cols-2">
        {coach?.programs.map((p) => (
          <li key={p.id}>
            <Link
              href={`/${lang}/coach/programs/${p.id}`}
              className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-400"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500">{p.specialty}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
