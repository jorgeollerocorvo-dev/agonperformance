import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { coachReply, markHandled } from "./actions";

/**
 * WhatsApp control panel. Shows one row per conversation (grouped by phone)
 * with the last message, who sent it, whether it needs the coach, and an
 * inline reply box. Escalated threads float to the top with a red badge.
 */
export default async function CoachWhatsAppPage({ params, searchParams }: PageProps<"/[lang]/coach/whatsapp">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session!.user.id } });
  if (!coach) notFound();

  const sp = await searchParams;
  const focusPhone = typeof sp?.phone === "string" ? sp.phone : null;

  // Pull last ~200 messages across all phones, group by phone client-side.
  const messages = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { athlete: { select: { id: true, fullName: true } } },
  });

  type Convo = {
    phone: string;
    athleteName: string | null;
    athleteId: string | null;
    lastAt: Date;
    lastBody: string;
    lastDirection: "INBOUND" | "OUTBOUND";
    requiresCoach: boolean;
    totalCount: number;
  };
  const byPhone = new Map<string, Convo>();
  for (const m of messages) {
    const c = byPhone.get(m.phone);
    if (!c) {
      byPhone.set(m.phone, {
        phone: m.phone,
        athleteName: m.athlete?.fullName ?? null,
        athleteId: m.athlete?.id ?? null,
        lastAt: m.createdAt,
        lastBody: m.body,
        lastDirection: m.direction,
        requiresCoach: m.requiresCoach,
        totalCount: 1,
      });
    } else {
      c.totalCount++;
      if (m.requiresCoach) c.requiresCoach = true;
    }
  }
  const convos = Array.from(byPhone.values()).sort((a, b) => {
    if (a.requiresCoach !== b.requiresCoach) return a.requiresCoach ? -1 : 1;
    return b.lastAt.getTime() - a.lastAt.getTime();
  });

  // If a specific phone is focused, pull its full thread.
  const thread = focusPhone
    ? messages.filter((m) => m.phone === focusPhone).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-sm text-[var(--ink-muted)]">Bot + manual override — todas las conversaciones con clientes.</p>
        </div>
        <span className={`text-xs rounded-full px-3 py-1.5 ${isWhatsAppConfigured() ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {isWhatsAppConfigured() ? "● Conectado" : "⚠ No configurado"}
        </span>
      </header>

      {!isWhatsAppConfigured() && (
        <Card className="bg-amber-50 border-amber-200">
          <h2 className="font-semibold mb-2">Falta configurar las variables de Meta</h2>
          <ol className="text-sm space-y-1 list-decimal list-inside text-[var(--ink-muted)]">
            <li>Crea una app en developers.facebook.com → Business → WhatsApp</li>
            <li>Añade un número de teléfono dedicado (NO el personal); verifica por SMS</li>
            <li>Copia el <code className="bg-[var(--surface-2)] px-1 rounded">Phone Number ID</code> y un <code className="bg-[var(--surface-2)] px-1 rounded">access token</code> de larga duración</li>
            <li>Pega 3 variables en Railway:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code>WHATSAPP_PHONE_ID</code></li>
                <li><code>WHATSAPP_ACCESS_TOKEN</code></li>
                <li><code>WHATSAPP_VERIFY_TOKEN</code> (cualquier string random, el mismo abajo)</li>
              </ul>
            </li>
            <li>En Meta, configura el webhook: <code className="bg-[var(--surface-2)] px-1 rounded">https://web-production-83d44.up.railway.app/api/whatsapp/webhook</code> con tu verify token, suscríbete al field <code>messages</code></li>
            <li>Prueba enviando un mensaje al número desde WhatsApp → debería aparecer aquí</li>
          </ol>
        </Card>
      )}

      <div className="grid md:grid-cols-[20rem_1fr] gap-4">
        {/* Conversation list */}
        <div className="space-y-2 md:max-h-[70vh] md:overflow-y-auto">
          {convos.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--ink-muted)]">Aún no hay conversaciones. Pide a un cliente que mande un mensaje de prueba a tu número.</p>
            </Card>
          ) : convos.map((c) => (
            <Link
              key={c.phone}
              href={`/${lang}/coach/whatsapp?phone=${encodeURIComponent(c.phone)}`}
              className={`block rounded-xl border p-3 transition ${focusPhone === c.phone ? "bg-[var(--primary-soft)] border-[var(--primary)]" : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-semibold text-sm truncate">{c.athleteName ?? `+${c.phone}`}</div>
                {c.requiresCoach && <span className="text-[0.65rem] rounded-full bg-red-500 text-white px-2 py-0.5 shrink-0">!</span>}
              </div>
              <div className="text-xs text-[var(--ink-muted)] truncate">
                {c.lastDirection === "INBOUND" ? "← " : "→ "}
                {c.lastBody}
              </div>
              <div className="text-[0.65rem] text-[var(--ink-subtle)] mt-1">
                {c.totalCount} msj · {c.lastAt.toISOString().slice(0, 16).replace("T", " ")}
              </div>
            </Link>
          ))}
        </div>

        {/* Thread view */}
        <div>
          {focusPhone ? (
            <Card>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-semibold">
                  {convos.find((c) => c.phone === focusPhone)?.athleteName ?? `+${focusPhone}`}
                </h2>
                {convos.find((c) => c.phone === focusPhone)?.requiresCoach && (
                  <form action={markHandled}>
                    <input type="hidden" name="phone" value={focusPhone} />
                    <button type="submit" className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 hover:bg-emerald-200">✓ Marcar atendido</button>
                  </form>
                )}
              </div>
              <ul className="space-y-2 max-h-[55vh] overflow-y-auto mb-4">
                {thread.map((m) => {
                  const isIn = m.direction === "INBOUND";
                  return (
                    <li key={m.id} className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isIn ? "bg-[var(--surface-2)]" : m.aiGenerated ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-emerald-100 text-emerald-900"}`}>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className="text-[0.6rem] opacity-70 mt-1">
                          {m.aiGenerated && "🤖 "}{m.createdAt.toISOString().slice(11, 16)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form action={coachReply} className="flex gap-2">
                <input type="hidden" name="phone" value={focusPhone} />
                <input
                  name="body"
                  placeholder="Responde tú mismo..."
                  required
                  className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none"
                />
                <Button type="submit" size="sm">Enviar</Button>
              </form>
              <p className="text-[0.65rem] text-[var(--ink-subtle)] mt-2">
                Meta solo permite responder gratis dentro de 24h del último mensaje del cliente. Después, requiere un template de pago.
              </p>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-[var(--ink-muted)]">Selecciona una conversación de la lista para verla.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
