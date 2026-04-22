import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { hasAIKey } from "@/lib/ai-parse-program";
import { ACCEPTED_MIME_TYPES } from "@/lib/parse-document";
import { importAndCreateProgram } from "./actions";

export default async function ImportProgramPage({ params, searchParams }: PageProps<"/[lang]/coach/import">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const session = await auth();
  const sp = await searchParams;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: session!.user.id },
    include: { athletes: { orderBy: { fullName: "asc" } } },
  });
  if (!coach) notFound();

  const aiReady = hasAIKey();

  async function submit(formData: FormData) {
    "use server";
    const result = await importAndCreateProgram(formData);
    if (result.error) {
      redirect(`/${lang}/coach/import?error=${encodeURIComponent(result.error)}`);
    }
    if (result.previewId) {
      redirect(`/${lang}/coach/programs/${result.previewId}?imported=1`);
    }
  }

  const errorMsg = typeof sp?.error === "string" ? decodeURIComponent(sp.error) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{dict.coach.importProgram ?? "Import program"}</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          {dict.coach.importIntro ?? "Upload a Word, Excel, or PDF document — we'll turn it into a structured program and attach YouTube demo searches to every movement. You can edit it after."}
        </p>
      </header>

      {!aiReady && (
        <Card className="bg-[var(--primary-soft)] border-[var(--primary)]/30">
          <div className="font-semibold text-[var(--primary)]">⚠️ {dict.coach.aiKeyNeeded ?? "AI import needs setup"}</div>
          <p className="text-sm mt-1">
            Add <code className="bg-white px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code> to your Railway environment variables, then redeploy. The form still works but imports will fail with a key error.
          </p>
        </Card>
      )}

      {errorMsg && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30">
          <div className="font-semibold text-[var(--danger)]">✕ {errorMsg}</div>
        </Card>
      )}

      <Card>
        <form action={submit} encType="multipart/form-data" className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.assignToAthlete ?? "Assign to athlete"}</span>
            <select name="athleteId" required className={inputCls}>
              <option value="">—</option>
              {coach.athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.startDate ?? "Start date"}</span>
            <input
              type="date"
              name="startDate"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className={inputCls}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">{dict.coach.uploadFile ?? "Upload file"}</span>
            <input
              type="file"
              name="file"
              accept={ACCEPTED_MIME_TYPES}
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:text-[var(--bg)] file:px-4 file:py-2 file:font-semibold hover:file:opacity-90 file:cursor-pointer"
            />
            <span className="text-xs text-[var(--ink-subtle)] mt-1 block">
              PDF, Word (.docx), Excel (.xlsx), CSV, or plain text. Up to ~10 MB.
            </span>
          </label>

          <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)]">
            <span className="flex-1 border-t border-[var(--border)]"></span>
            <span>{dict.coach.orPasteText ?? "or paste text"}</span>
            <span className="flex-1 border-t border-[var(--border)]"></span>
          </div>

          <label className="block text-sm">
            <textarea
              name="pastedText"
              rows={8}
              placeholder={dict.coach.pastePlaceholder ?? "Paste the program here — from Notes, WhatsApp, email, anywhere. Claude will structure it."}
              className={inputCls}
            />
          </label>

          <Button type="submit" size="lg">
            {dict.coach.importAndCreate ?? "Upload & create program"}
          </Button>
          <p className="text-xs text-[var(--ink-subtle)]">
            This takes 5–15 seconds depending on the document length.
          </p>
        </form>
      </Card>

      {coach.athletes.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">
            You don't have any athletes yet. <Link href={`/${lang}/coach/athletes`} className="text-[var(--primary)] underline">Add one first</Link>.
          </p>
        </Card>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
