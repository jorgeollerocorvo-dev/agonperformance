import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { createTemplate, deleteTemplate } from "./actions";

export default async function TemplatesPage({ params }: PageProps<"/[lang]/coach/templates">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });
  if (!coach) notFound();

  const templates = await prisma.messageTemplate.findMany({
    where: { coachUserId: coach.userId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      <header>
        <h1 className="text-2xl font-bold">Plantillas de mensajes</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Guarda respuestas rápidas y envíalas con un click desde cualquier conversación. Ahorra teclear "buen trabajo hoy" 20 veces al día.
        </p>
      </header>

      <Card>
        <form action={createTemplate} className="space-y-2">
          <input
            name="label"
            placeholder="Título corto (ej. Bienvenida)"
            required
            className={inputCls}
          />
          <textarea
            name="body"
            placeholder="Texto que se enviará..."
            rows={3}
            required
            className={inputCls}
          />
          <Button type="submit" size="sm">Añadir</Button>
        </form>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">Aún no has creado plantillas.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-sm text-[var(--ink-muted)] mt-1 whitespace-pre-wrap">{t.body}</div>
                </div>
                <form action={deleteTemplate}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-xs text-[var(--danger)] hover:underline shrink-0">borrar</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)]";
