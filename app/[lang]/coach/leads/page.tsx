import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Pill, Button } from "@/components/ui/Card";
import { isJorge, JORGE_INQUIRY_SOURCE, findJorgeCoachProfileId } from "@/lib/jorge";

export default async function LeadsInbox({ params, searchParams }: PageProps<"/[lang]/coach/leads">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound(); // hide from anyone else

  const dict = await getDictionary(lang);
  const sp = await searchParams;

  // Jorge sees every inquiry that recommends him as a coach,
  // regardless of which short-URL source tag (j, jorge, train, anything custom).
  const jorgeCoachId = await findJorgeCoachProfileId();
  const inquiries = await prisma.inquiry.findMany({
    where: jorgeCoachId
      ? { recommendedCoachIds: { has: jorgeCoachId } }
      : { source: { startsWith: JORGE_INQUIRY_SOURCE } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  async function updateStatus(formData: FormData) {
    "use server";
    const s = await auth();
    if (!isJorge(s)) return;
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "NEW") as "NEW" | "MATCHED" | "CONTACTED" | "CONVERTED" | "CLOSED";
    if (!id) return;
    await prisma.inquiry.update({ where: { id }, data: { status } });
    redirect(`/${lang}/coach/leads`);
  }

  const intakeUrl = `${process.env.PUBLIC_URL ?? "https://web-production-83d44.up.railway.app"}/${lang}/find/jorge`;

  const csvHref = `/api/leads/export.csv`;

  const counts = {
    new: inquiries.filter((i) => i.status === "NEW").length,
    contacted: inquiries.filter((i) => i.status === "CONTACTED").length,
    converted: inquiries.filter((i) => i.status === "CONVERTED").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{dict.coach.leads ?? "Leads"}</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">{dict.coach.leadsHint ?? "Inquiries that came in through your private intake form."}</p>
        </div>
        <a href={csvHref} download className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]">
          {dict.coach.exportCsv ?? "Export CSV"}
        </a>
      </header>

      <Card className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{dict.coach.shareThisLink ?? "Share this link on social media"}</div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 break-all rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">{intakeUrl}</code>
          <Link href={`/${lang}/find/jorge`} target="_blank" className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:opacity-90">
            {dict.coach.openForm ?? "Open form ↗"}
          </Link>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          {dict.coach.shareHint ?? "Add ?source=instagram or ?source=whatsapp to track where each lead came from."}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">New</div><div className="text-3xl font-bold mt-0.5">{counts.new}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Contacted</div><div className="text-3xl font-bold mt-0.5">{counts.contacted}</div></Card>
        <Card><div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Converted</div><div className="text-3xl font-bold mt-0.5">{counts.converted}</div></Card>
      </div>

      {inquiries.length === 0 ? (
        <Card><p className="text-sm text-[var(--ink-muted)]">{dict.coach.noLeadsYet ?? "No inquiries yet. Share your link to start collecting leads."}</p></Card>
      ) : (
        <ul className="space-y-3">
          {inquiries.map((q) => (
            <Card key={q.id} padded={false} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-base">{q.contactName ?? "Anonymous"}</span>
                  <Pill color={q.status === "NEW" ? "primary" : q.status === "CONVERTED" ? "success" : "soft"}>
                    {q.status}
                  </Pill>
                  {q.source && q.source !== JORGE_INQUIRY_SOURCE && (
                    <Pill color="soft">via {q.source}</Pill>
                  )}
                </div>
                <span className="text-xs text-[var(--ink-muted)]">{q.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <Field label="Email" value={q.anonymousEmail} mailto />
                <Field label="Phone" value={q.anonymousPhone} tel />
                <Field label="Instagram" value={q.contactInstagram ? `@${q.contactInstagram}` : null} ig={q.contactInstagram} />
                <Field label="Goal" value={q.goal} />
                <Field label="Train now" value={q.frequencyCurrent} />
                <Field label="Wants" value={q.frequencyDesired} />
                <Field label="Age" value={q.ageRange} />
                <Field label="Location" value={q.preferredLocation} />
                <Field label="Days/times" value={q.preferredDaysAndTimes} />
                <Field label="Urgency" value={q.urgency} />
                <Field label="Injury / concern" value={q.injuryOrConcern} full />
                <Field label="Notes" value={q.notes} full />
              </div>

              <form action={updateStatus} className="mt-3 flex items-center gap-2 text-xs">
                <input type="hidden" name="id" value={q.id} />
                <span className="text-[var(--ink-muted)]">Status:</span>
                {(["NEW","CONTACTED","CONVERTED","CLOSED"] as const).map((s) => (
                  <button
                    key={s}
                    type="submit"
                    name="status"
                    value={s}
                    className={`rounded-full border px-2.5 py-1 ${
                      q.status === s
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </form>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, full, mailto, tel, ig }: { label: string; value: string | null | undefined; full?: boolean; mailto?: boolean; tel?: boolean; ig?: string | null }) {
  if (!value) return null;
  let body: React.ReactNode = value;
  if (mailto) body = <a className="text-[var(--primary)] hover:underline" href={`mailto:${value}`}>{value}</a>;
  else if (tel) body = <a className="text-[var(--primary)] hover:underline" href={`tel:${value}`}>{value}</a>;
  else if (ig) body = <a className="text-[var(--primary)] hover:underline" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">{value}</a>;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{label}</div>
      <div className="text-sm">{body}</div>
    </div>
  );
}
