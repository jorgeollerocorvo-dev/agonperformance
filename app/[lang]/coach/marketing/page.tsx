import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasLocale } from "../../dictionaries";
import { Card } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";

/**
 * Marketing control centre — Jorge-only.
 *
 * Centralises the timeline, assets and running plays from the previous
 * marketing conversations (coach-finder launch, Sports Corner partnership
 * deck, landing-page testimonials, pricing roll-out) so Jorge has one
 * surface to track and edit them instead of digging through chat logs.
 *
 * Content is static for now — when any single section grows (campaign
 * tracking, lead attribution, etc.) we can flip it to a DB-backed model.
 */
export default async function MarketingPage({ params }: PageProps<"/[lang]/coach/marketing">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) notFound();
  if (!isJorge(session)) notFound();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <header>
        <h1 className="text-2xl font-bold">📣 Marketing</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Timeline, decks y campañas activas — editable desde aquí sin salir de la app.
        </p>
      </header>

      {/* Launch timeline — 4-week roll-out that came out of the app audit. */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">🗓️ Timeline de lanzamiento</h2>
        <ol className="space-y-3">
          <TimelineStep week="Semana 1" status="done" title="Finder de coaches en Qatar (Doctoralia-style)"
            desc="Hero + mapa sticky + filtros avanzados (área, precio, experiencia, idiomas). Live en /coaches. SEO-friendly URL-first." />
          <TimelineStep week="Semana 1" status="done" title="Pricing page + Stripe scaffold"
            desc="3 tiers (Starter 990 / Pro 1490 / Elite 2490 QAR/mo). Checkout listo cuando se añadan las Stripe keys." />
          <TimelineStep week="Semana 2" status="done" title="Testimonials bilingüe (ar/en) en landing"
            desc="3 reviews seed de Tarek, Alshaima, Daniel. '20+ reviews' como social proof hasta llegar al número real." />
          <TimelineStep week="Semana 2" status="done" title="WhatsApp bot gratis (Meta Cloud API)"
            desc="FAQ auto para clientes + escalado a coach en temas sensibles. 1000 conversaciones/mes free." />
          <TimelineStep week="Semana 3" status="active" title="Sports Corner partnership"
            desc="Flyer A4 con QR a /consultation en el gym. 20% revenue share al coach por referido convertido." />
          <TimelineStep week="Semana 3" status="active" title="PWA + web push notifications"
            desc="Install prompt en athletes. Push en WhatsApp escalation + mensajes nuevos. Falta activar VAPID keys." />
          <TimelineStep week="Semana 4" status="pending" title="Instagram auto-poster"
            desc="Higgsfield + Telegram bridge. En instagram_bot/ — pendiente de tu API key Higgsfield." />
          <TimelineStep week="Mes 2" status="pending" title="Coach directory onboarding"
            desc="Flujo de alta para que otros coaches de Qatar publiquen su perfil y paguen la subscription tier." />
        </ol>
      </Card>

      {/* Decks + assets */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">📊 Decks y assets</h2>
        <ul className="space-y-2 text-sm">
          <AssetLink icon="📊" title="Sports Corner partnership deck (PPTX)"
            path="/private/tmp/claude-501/.../scratchpad/build-deck.js"
            desc="11 slides · modelo verbal de referido (sin QR shopping), cash-first, 20% comisión. Portrait Jorge + screenshots Tarek." />
          <AssetLink icon="📄" title="App audit report (Oct 2026)"
            path="reports/Agon Performance app audit 2026.md"
            desc="Feature gaps vs competidores + 5 moves de diseño gratis esta semana." />
          <AssetLink icon="📸" title="Flyer A4 Sports Corner"
            path="(pendiente de generar)"
            desc="Quarter size. QR → /consultation. Mensaje: 'Entrena con el Coach Jorge — primera consulta gratis'." />
        </ul>
      </Card>

      {/* Campañas activas */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">🎯 Campañas activas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampaignTile label="Referido Sports Corner"
            kpi="Clientes nuevos / mes"
            target="3+"
            channel="Flyer en gym" />
          <CampaignTile label="Landing orgánico"
            kpi="Visitas /coaches"
            target="100 / sem"
            channel="SEO + Instagram reels" />
          <CampaignTile label="WhatsApp consulta gratis"
            kpi="Consultas agendadas"
            target="5 / sem"
            channel="Bot + wa.me CTA" />
          <CampaignTile label="Testimonios clientes"
            kpi="Nuevas reseñas"
            target="2 / mes"
            channel="Email automático post-30d" />
        </div>
      </Card>

      {/* Mensajes clave */}
      <Card>
        <h2 className="font-semibold text-lg mb-3">💬 Mensajes clave (brand voice)</h2>
        <div className="space-y-3 text-sm">
          <QuoteLine>
            &quot;No un gym más. Programa personalizado con video de cada movimiento y seguimiento semanal.&quot;
          </QuoteLine>
          <QuoteLine>
            &quot;Entrena donde quieras — en casa, en el gym o viajando. Tu coach te acompaña por WhatsApp.&quot;
          </QuoteLine>
          <QuoteLine>
            &quot;Programas en inglés, árabe y español. Hecho en Qatar, para Qatar.&quot;
          </QuoteLine>
        </div>
      </Card>

      <div className="text-xs text-center">
        <Link href={`/${lang}/coach`} className="text-[var(--ink-muted)] hover:underline">← Volver al dashboard</Link>
      </div>
    </div>
  );
}

function TimelineStep({ week, status, title, desc }: { week: string; status: "done" | "active" | "pending"; title: string; desc: string }) {
  const tint = {
    done: "bg-emerald-100 text-emerald-800 border-emerald-200",
    active: "bg-amber-100 text-amber-800 border-amber-200",
    pending: "bg-slate-100 text-slate-700 border-slate-200",
  }[status];
  const icon = { done: "✓", active: "●", pending: "○" }[status];
  return (
    <li className="flex gap-3 items-start">
      <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold tracking-wider uppercase ${tint}`}>
        {icon} {week}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5">{desc}</div>
      </div>
    </li>
  );
}

function AssetLink({ icon, title, path, desc }: { icon: string; title: string; path: string; desc: string }) {
  return (
    <li className="rounded-xl bg-[var(--surface-2)]/60 p-3 flex gap-3">
      <div className="text-xl shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5">{desc}</div>
        <div className="text-[0.65rem] text-[var(--ink-subtle)] font-mono mt-1 truncate">{path}</div>
      </div>
    </li>
  );
}

function CampaignTile({ label, kpi, target, channel }: { label: string; kpi: string; target: string; channel: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs text-[var(--ink-muted)] mt-1">{kpi}</div>
      <div className="text-xl font-bold text-[var(--primary)] mt-1">{target}</div>
      <div className="text-[0.65rem] text-[var(--ink-subtle)] mt-1">📍 {channel}</div>
    </div>
  );
}

function QuoteLine({ children }: { children: React.ReactNode }) {
  return <blockquote className="border-l-2 border-[var(--primary)] pl-3 italic text-[var(--ink)]">{children}</blockquote>;
}
