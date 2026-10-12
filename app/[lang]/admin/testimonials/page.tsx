import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import { createTestimonial, updateTestimonial, deleteTestimonial } from "./actions";

export default async function TestimonialsAdminPage({ params }: PageProps<"/[lang]/admin/testimonials">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound();

  const testimonials = await prisma.appTestimonial.findMany({
    orderBy: [{ isPublished: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <header>
        <h1 className="text-2xl font-bold">Testimonials (landing)</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Reviews mostrados en la landing. Rellena árabe y/o inglés; si solo pones uno, se usa en los dos idiomas con la bandera.
        </p>
      </header>

      {/* Create new */}
      <Card>
        <h2 className="font-semibold mb-3">+ Añadir testimonial</h2>
        <form action={createTestimonial} className="space-y-3">
          <TestimonialFields />
          <Button type="submit" size="sm">Añadir</Button>
        </form>
      </Card>

      {/* Existing */}
      {testimonials.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--ink-muted)]">Aún no hay testimonials.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {testimonials.map((t) => (
            <Card key={t.id} className={t.isPublished ? "" : "opacity-60"}>
              <form action={updateTestimonial} className="space-y-3">
                <input type="hidden" name="id" value={t.id} />
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-amber-500">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</span>
                    {t.clientName && <span className="font-semibold">{t.clientName}</span>}
                    {t.clientCity && <span className="text-[var(--ink-muted)]">· {t.clientCity}</span>}
                    {!t.isPublished && <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Oculto</span>}
                  </div>
                </div>
                <TestimonialFields t={t} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isPublished" defaultChecked={t.isPublished} />
                  Publicado
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Guardar cambios</Button>
                </div>
              </form>
              <form action={deleteTestimonial} className="mt-2">
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="text-xs text-[var(--danger)] hover:underline">borrar</button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type Testimonial = {
  quoteAr: string | null;
  quoteEn: string | null;
  quoteEs: string | null;
  rating: number;
  clientName: string | null;
  clientCity: string | null;
  clientRole: string | null;
};

function TestimonialFields({ t }: { t?: Testimonial }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm col-span-1">
          <span className="text-xs text-[var(--ink-muted)]">Estrellas</span>
          <select name="rating" defaultValue={t?.rating ?? 5} className={inputCls}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </select>
        </label>
        <label className="text-sm col-span-1">
          <span className="text-xs text-[var(--ink-muted)]">Nombre</span>
          <input name="clientName" defaultValue={t?.clientName ?? ""} className={inputCls} />
        </label>
        <label className="text-sm col-span-1">
          <span className="text-xs text-[var(--ink-muted)]">Ciudad</span>
          <input name="clientCity" defaultValue={t?.clientCity ?? ""} placeholder="Doha" className={inputCls} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-xs text-[var(--ink-muted)]">Rol / contexto (opcional)</span>
        <input name="clientRole" defaultValue={t?.clientRole ?? ""} placeholder="CrossFit athlete · 2 años con el coach" className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-[var(--ink-muted)]">Review en árabe (الاقتباس بالعربية)</span>
        <textarea name="quoteAr" defaultValue={t?.quoteAr ?? ""} rows={3} dir="rtl" className={inputCls + " text-right"} />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-[var(--ink-muted)]">Review en inglés (translation)</span>
        <textarea name="quoteEn" defaultValue={t?.quoteEn ?? ""} rows={3} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="text-xs text-[var(--ink-muted)]">Review en español (opcional)</span>
        <textarea name="quoteEs" defaultValue={t?.quoteEs ?? ""} rows={2} className={inputCls} />
      </label>
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]";
