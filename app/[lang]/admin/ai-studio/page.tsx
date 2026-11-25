import Link from "next/link";
import InstagramConnection from "./InstagramConnection";
import { notFound } from "next/navigation";
import { hasLocale } from "../../dictionaries";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { catalogForHq, hqDrafts, hqPaused } from "@/lib/agon-hq";
import { generateDraft, pauseAutomation, resumeAutomation, reviewDraft, recoverDraft } from "./actions";
export const dynamic = "force-dynamic";
const panel = "rounded-2xl border border-[var(--border)] p-5 space-y-3";
const button = "rounded-lg bg-[#1F3A5F] text-white px-4 py-2 font-semibold";
export default async function AiStudio({ params }: PageProps<"/[lang]/admin/ai-studio">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  await requireHqOwner();
  const [products, drafts, paused] = await Promise.all([catalogForHq(), hqDrafts(), hqPaused()]);
  const enabled = process.env.AGON_HQ_AUTOMATION_ENABLED === "true";
  const gemini = Boolean(process.env.GEMINI_API_KEY) && process.env.AGON_HQ_GEMINI_ENABLED === "true";
  return <div className="space-y-6">
    <header className="rounded-2xl bg-[#1F3A5F] text-white p-6">
      <p className="text-[#c6dac8] text-sm">PRIVATE OWNER WORKSPACE</p>
      <h1 className="text-3xl font-bold">AGON AI HQ</h1>
      <p>Marketing supervision · Asia/Qatar · Draft mode</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <section className={panel}><h2>Catalog (up to 100 active)</h2><p className="text-3xl font-bold">{products.length}</p></section>
      <section className={panel}><h2>Recent campaign drafts</h2><p className="text-3xl font-bold">{drafts.length}</p></section>
      <section className={panel}><h2>Worker configuration</h2><p>{enabled && !paused ? "Enabled in configuration; scheduler must be verified" : "Paused / disabled"}</p><p>{gemini ? "Gemini configured; billing tier unverified" : "Local templates only"}</p></section>
    </div>
    <section className={panel}><h2 className="text-xl font-bold">Controls</h2>
      <p>Instagram publishing, paid ads and website changes are disabled. Approval records a review only; it does not publish.</p>
      <div className="flex gap-3 flex-wrap">
        <form action={generateDraft}><button className={button}>Generate today's draft</button></form>
        <form action={paused ? resumeAutomation : pauseAutomation}><button className={button}>{paused ? "Allow scheduled drafts" : "Pause scheduled drafts"}</button></form>
      </div>
      <p className="text-sm">Maximum one generation attempt per Qatar calendar day. No automatic paid fallback. Scheduling requires a separately configured Railway job.</p>
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Content queue</h2>
      {drafts.length === 0 && <p>No drafts yet.</p>}
      {drafts.map(d => <article key={d.key} className="rounded-xl border border-[var(--border)] p-4 space-y-2">
        <p className="text-sm">{d.day} · {d.format} · {d.status} · {d.source || "Pending"}</p>
        <h3 className="font-bold">{d.topic}</h3>
        {d.product && <p>Catalog snapshot: {d.product.name} · {d.product.price} {d.product.currency} (recheck before publishing)</p>}
        {d.copy && <><p className="font-semibold">{d.copy.hook}</p><p className="whitespace-pre-wrap">{d.copy.caption}</p><ol className="list-decimal pl-5">{d.copy.scenes.map((s,i)=><li key={i}>{s}</li>)}</ol></>}
        {d.copy && <div className="flex flex-wrap gap-4 text-sm">
          <a className="underline" href={"/api/admin/agon-hq/export?kind=cover&day=" + encodeURIComponent(d.day)}>Download branded cover (PNG)</a>
          <a className="underline" href={"/api/admin/agon-hq/export?kind=json&day=" + encodeURIComponent(d.day)}>Export draft / Reel storyboard (JSON)</a>
        {d.format === "Reel" && process.env.AGON_HQ_RENDER_ENABLED === "true" && <form method="post" action={"/api/admin/agon-hq/reel?day=" + encodeURIComponent(d.day)}><button type="submit" className="underline">Render MP4 storyboard preview</button></form>}
        </div>}
        {d.error && <p>{d.error}</p>}
        {d.status === "failed" && <form action={recoverDraft}><input type="hidden" name="key" value={d.key}/><button className={button}>Recover draft (no AI charge)</button></form>}
        {d.status === "draft" && <form action={reviewDraft} className="flex gap-2"><input type="hidden" name="key" value={d.key}/><button className={button} name="status" value="approved">Approve draft</button><button className="rounded-lg border px-4 py-2" name="status" value="rejected">Reject</button></form>}
      </article>)}
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Catalog campaigns</h2><Link className="underline" href={"/"+lang+"/admin/catalog"}>Manage catalog</Link>
      <div className="grid gap-3 sm:grid-cols-2">{products.map(p=><div key={p.id} className="border border-[var(--border)] rounded-lg p-3"><strong>{p.nameEn}</strong><p>{p.price.toString()} {p.currency} · {p.category}</p><p className="text-sm">{p.variants.reduce((n,v)=>n+v.stock,0)} units across variants · {p.images.length ? "Product image available" : "No product image"}</p></div>)}</div>
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Connections and next stages</h2>
      <p>Instagram @agonperformanceqa: {process.env.AGON_HQ_INSTAGRAM_TOKEN ? "Token configured; verify account access" : "Not authorized"}. No live publishing.</p><InstagramConnection /><p>Automated video rendering, trend research, analytics and sales attribution: not connected.</p>
    </section>
  </div>;
}
