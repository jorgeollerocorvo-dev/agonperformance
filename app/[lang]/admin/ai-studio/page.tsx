import Link from "next/link";
import MediaLibrary from "./MediaLibrary";
import { mediaList } from "@/lib/agon-media";
import PremiumPilot from "./PremiumPilot";
import { brand, managers, localCreativeBrief, briefChecks } from "@/lib/agon-creative-team";
import InstagramConnection from "./InstagramConnection";
import InstagramPostTest from "./InstagramPostTest";
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
  const [products, drafts, paused, assets] = await Promise.all([catalogForHq(), hqDrafts(), hqPaused(), mediaList()]);
  const enabled = process.env.AGON_HQ_AUTOMATION_ENABLED === "true";
  const gemini = Boolean(process.env.GEMINI_API_KEY) && process.env.AGON_HQ_GEMINI_ENABLED === "true";
  return <div className="space-y-6">
    <header className="rounded-2xl bg-[#1F3A5F] text-white p-6">
      <p className="text-[#c6dac8] text-sm">PRIVATE OWNER WORKSPACE</p>
      <h1 className="text-3xl font-bold">AGON AI HQ</h1>
      <p>Marketing supervision · Asia/Qatar · Editorial preview v2</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <section className={panel}><h2>Catalog (up to 100 active)</h2><p className="text-3xl font-bold">{products.length}</p></section>
      <section className={panel}><h2>Recent campaign drafts</h2><p className="text-3xl font-bold">{drafts.length}</p></section>
      <section className={panel}><h2>Worker configuration</h2><p>{enabled && !paused ? "Enabled in configuration; scheduler must be verified" : "Paused / disabled"}</p><p>{gemini ? "Gemini configured; billing tier unverified" : "Local templates only"}</p></section>
    </div>
    <section className={panel}><h2 className="text-xl font-bold">AGON Creative Team</h2>
      <p>{brand.identity} All roles share one brand guide. The daily job coordinates the creative roles in one model call; these are not eight independently running agents.</p>
      <div className="flex flex-wrap gap-2">{Object.entries(brand.palette).map(([name,color])=><div key={name} className="text-xs"><div className="w-16 h-10 rounded-md border" style={{backgroundColor:color}}/><p>{name}</p><p>{color}</p></div>)}</div>
      <p className="text-sm">{brand.typography}</p>
      <div className="grid gap-3 sm:grid-cols-2">{managers.map(m=><article key={m.name} className="rounded-xl border border-[var(--border)] p-3"><h3 className="font-bold">{m.name}</h3><p className="text-sm">{m.role}</p><p className="mt-2 text-xs text-[var(--ink-muted)]">{m.status}</p></article>)}</div>
      <p className="text-sm">Visual quality, media rights and final rendering require inspection. No draft is automatically certified or published.</p>
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Controls</h2>
      <p>Automatic Instagram publishing, paid ads and website changes are disabled. Approval does not publish. Approved non-product image posts have a manual publishing test.</p>
      <div className="flex gap-3 flex-wrap">
        <form action={generateDraft}><button className={button}>Generate today's draft</button></form>
        <form action={paused ? resumeAutomation : pauseAutomation}><button className={button}>{paused ? "Allow scheduled drafts" : "Pause scheduled drafts"}</button></form>
      </div>
      <p className="text-sm">Maximum one generation attempt per Qatar calendar day. No automatic paid fallback. Scheduling requires a separately configured Railway job.</p>
    </section>
    <MediaLibrary initial={assets} days={drafts.filter(d=>d.copy&&!d.product&&!d.mediaId&&["draft","approved"].includes(d.status)).map(d=>({day:d.day,topic:d.topic}))}/>
    <PremiumPilot />
    <section className={panel}><h2 className="text-xl font-bold">Content queue</h2>
      {drafts.length === 0 && <p>No drafts yet.</p>}
      {drafts.map(d => <article key={d.key} className="rounded-xl border border-[var(--border)] p-4 space-y-2">
        <p className="text-sm">{d.day} · {d.format} · {d.status} · {d.source || "Pending"}</p>
        <h3 className="font-bold">{d.topic}</h3>
        {d.mediaId&&<div className="max-w-xs"><img src={"/api/admin/agon-hq/media?id="+d.mediaId} alt="Selected approved media" className="rounded-lg w-full h-auto" loading="lazy"/><p className="text-xs">Automatically matched approved image · final visual review required</p></div>}
        {d.product && <p>Catalog snapshot: {d.product.name} · {d.product.price} {d.product.currency} (recheck before publishing)</p>}
        {d.copy && <><p className="font-semibold">{d.copy.hook}</p><p className="whitespace-pre-wrap">{d.copy.caption}</p><ol className="list-decimal pl-5">{d.copy.scenes.map((s,i)=><li key={i}>{s}</li>)}</ol></>}
        {d.copy && (() => {const brief=d.creative ?? localCreativeBrief(d.format,d.topic,d.copy.scenes); const checks=briefChecks(brief);return <details className="rounded-lg border border-[var(--border)] p-3 space-y-2"><summary className="font-semibold cursor-pointer">Creative direction · {d.creative ? "Stored brief" : "Local reference brief"}</summary><p>Objective: {brief.objective}</p><p>Audience: {brief.audience}</p><p>{brief.visualDirection}</p><h4 className="font-semibold">Required assets</h4><ul className="list-disc pl-5">{brief.assetRequirements.map((a,i)=><li key={i}>{a}</li>)}</ul><h4 className="font-semibold">Execution plan</h4><ol className="list-decimal pl-5">{brief.execution.map((a,i)=><li key={i}>{a}</li>)}</ol>{brief.audioDirection&&<p>Audio: {brief.audioDirection}</p>}<h4 className="font-semibold">Quality review</h4><p>Brief structure: {checks.complete ? "Complete" : "Incomplete"} · Final visual: {checks.visualStatus}</p><ul className="list-disc pl-5">{brief.reviewNotes.map((a,i)=><li key={i}>{a}</li>)}</ul></details>})()}
        {d.copy && <div className="flex flex-wrap gap-4 text-sm">
          {!(d.status === "approved" && d.format === "Post" && !d.product) && <a className="underline" href={"/api/admin/agon-hq/export?kind=cover&day=" + encodeURIComponent(d.day)}>Download basic storyboard cover (PNG; not final media)</a>}
          <a className="underline" href={"/api/admin/agon-hq/export?kind=json&day=" + encodeURIComponent(d.day)}>Export draft / Reel storyboard (JSON)</a>
        {d.format === "Reel" && process.env.AGON_HQ_RENDER_ENABLED === "true" && <form method="post" action={"/api/admin/agon-hq/reel?day=" + encodeURIComponent(d.day)}><button type="submit" className="underline">Render MP4 storyboard preview</button></form>}
        </div>}
        {d.error && <p>{d.error}</p>}
        {d.status === "failed" && <form action={recoverDraft}><input type="hidden" name="key" value={d.key}/><button className={button}>Recover draft (no AI charge)</button></form>}
        {d.status === "approved" && d.format === "Post" && d.copy && !d.product && <InstagramPostTest day={d.day} />}
        {d.status === "draft" && <form action={reviewDraft} className="flex gap-2"><input type="hidden" name="key" value={d.key}/><button className={button} name="status" value="approved">Approve draft</button><button className="rounded-lg border px-4 py-2" name="status" value="rejected">Reject</button></form>}
      </article>)}
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Catalog campaigns</h2><Link className="underline" href={"/"+lang+"/admin/catalog"}>Manage catalog</Link>
      <div className="grid gap-3 sm:grid-cols-2">{products.map(p=><div key={p.id} className="border border-[var(--border)] rounded-lg p-3"><strong>{p.nameEn}</strong><p>{p.price.toString()} {p.currency} · {p.category}</p><p className="text-sm">{p.variants.reduce((n,v)=>n+v.stock,0)} units across variants · {p.images.length ? "Product image available" : "No product image"}</p></div>)}</div>
    </section>
    <section className={panel}><h2 className="text-xl font-bold">Connections and next stages</h2>
      <p>Instagram @agonperformanceqa: {process.env.AGON_HQ_INSTAGRAM_TOKEN ? "Token configured; verify account access" : "Not authorized"}. Automatic publishing disabled.</p><InstagramConnection /><p>Automated video rendering, trend research, analytics and sales attribution: not connected.</p>
    </section>
  </div>;
}
