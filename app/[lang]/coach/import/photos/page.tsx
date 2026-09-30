import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { activeProvider } from "@/lib/ai-call";
import { importWorkoutPhotos } from "./actions";

/**
 * Photo-import flow: coach uploads 1..N training-log photos, AI vision
 * extracts date + exercises + weights per photo, we write each as its own
 * ProgramSession on the correct calendar date. Weights land as notes so the
 * athlete's calendar reads like a real training journal.
 */
export default async function ImportPhotosPage({ params, searchParams }: PageProps<"/[lang]/coach/import/photos">) {
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

  const provider = activeProvider();
  const visionReady = provider === "gemini" || provider === "anthropic";

  async function submit(formData: FormData) {
    "use server";
    const result = await importWorkoutPhotos(formData);
    // Persist a short report in the query string so the coach sees per-photo
    // outcomes without needing client-side state.
    const params = new URLSearchParams();
    result.perPhoto.forEach((p, i) => {
      if (p.error) {
        params.set(`err_${i}`, `${p.filename}: ${p.error}`);
      } else {
        params.set(`ok_${i}`, `${p.filename} → ${p.date} (${p.exerciseCount} ejercicios)`);
      }
    });
    // If any photo landed on the same program, offer a jump link.
    const firstOk = result.perPhoto.find((p) => p.targetProgramId);
    if (firstOk?.targetProgramId) params.set("goto", firstOk.targetProgramId);
    redirect(`/${lang}/coach/import/photos?${params.toString()}`);
  }

  const spEntries = Object.entries(sp ?? {});
  const errors = spEntries.filter(([k]) => k.startsWith("err_")).map(([, v]) => String(v));
  const oks = spEntries.filter(([k]) => k.startsWith("ok_")).map(([, v]) => String(v));
  const gotoProgram = typeof sp?.goto === "string" ? sp.goto : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Importar desde fotos</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Sube fotos de la libreta de entrenamiento (una o varias). Por cada foto, la IA lee la fecha, los ejercicios y los pesos usados, y los escribe automáticamente en el calendario del atleta en el día correspondiente. Los pesos quedan como notas de cada movimiento, como si fuese la libreta del entrenador.
        </p>
      </header>

      {!visionReady && (
        <Card className="bg-[var(--primary-soft)] border-[var(--primary)]/30">
          <div className="font-semibold text-[var(--primary)]">⚠️ Configuración pendiente</div>
          <p className="text-sm mt-1">
            La lectura de fotos necesita <code className="bg-white px-1.5 py-0.5 rounded text-xs">GEMINI_API_KEY</code> (gratis en aistudio.google.com) o <code className="bg-white px-1.5 py-0.5 rounded text-xs">ANTHROPIC_API_KEY</code> como fallback. Añádela en Railway y redeploy.
          </p>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="bg-[var(--danger-soft)] border-[var(--danger)]/30">
          <div className="font-semibold text-[var(--danger)]">Algunas fotos no se procesaron:</div>
          <ul className="text-sm mt-1 list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Card>
      )}

      {oks.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-200">
          <div className="font-semibold text-emerald-800">Sesiones creadas:</div>
          <ul className="text-sm mt-1 list-disc list-inside text-emerald-900">
            {oks.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
          {gotoProgram && (
            <Link href={`/${lang}/coach/programs/${gotoProgram}`} className="inline-block mt-3 text-sm font-semibold text-[var(--primary)] hover:underline">
              → Ver el programa
            </Link>
          )}
        </Card>
      )}

      <Card>
        <form action={submit} encType="multipart/form-data" className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">Atleta</span>
            <select name="athleteId" required className={inputCls}>
              <option value="">—</option>
              {coach.athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ink-muted)]">Fotos (1–12, JPG/PNG/WebP, hasta 8MB cada una)</span>
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:text-[var(--bg)] file:px-4 file:py-2 file:font-semibold hover:file:opacity-90 file:cursor-pointer"
            />
            <span className="text-xs text-[var(--ink-subtle)] mt-1 block">
              Cada foto se procesa como una sesión distinta en la fecha que aparece en la propia foto. Si la fecha no es legible, la foto se ignora y te lo aviso.
            </span>
          </label>

          <Button type="submit" size="lg" disabled={!visionReady || coach.athletes.length === 0}>
            Leer y crear sesiones
          </Button>
          <p className="text-xs text-[var(--ink-subtle)]">
            Depende de cuántas fotos subas: ~5-10 segundos por cada una en Gemini free. Se procesan en paralelo.
          </p>
        </form>
      </Card>

      {coach.athletes.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">
            Todavía no tienes atletas. <Link href={`/${lang}/coach/athletes`} className="text-[var(--primary)] underline">Añade uno primero</Link>.
          </p>
        </Card>
      )}

      <div className="text-xs text-[var(--ink-muted)]">
        <Link href={`/${lang}/coach/import`} className="hover:underline">← Importar desde documento</Link>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
