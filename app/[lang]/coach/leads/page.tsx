import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  const tab = String(sp?.tab ?? "leads");

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

  // Fetch consultations for the consultations tab
  let consultations: any[] = [];
  try {
    consultations = await prisma.consultationBooking.findMany({
      orderBy: { startTime: "desc" },
      take: 200,
    });
  } catch (error) {
    // Consultations table may not exist yet
    console.error("Error fetching consultations:", error);
  }

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

  async function convertInquiryToAthlete(formData: FormData) {
    "use server";
    const s = await auth();
    if (!isJorge(s)) return;

    const inquiryId = String(formData.get("inquiryId") ?? "");
    if (!inquiryId) return;

    // Get the inquiry data
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!inquiry) return;

    // Get Jorge's coach profile
    const jorgeCoachId = await findJorgeCoachProfileId();
    if (!jorgeCoachId) return;

    // Generate unique athleteKey from contact name or email
    let athleteKey: string;
    if (inquiry.contactName) {
      athleteKey = inquiry.contactName.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 50);
    } else if (inquiry.anonymousEmail) {
      athleteKey = inquiry.anonymousEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 50);
    } else {
      athleteKey = `lead_${Date.now()}`;
    }

    // Ensure unique athleteKey with counter
    let finalAthleteKey = athleteKey;
    let counter = 1;
    let exists = await prisma.athlete.findUnique({ where: { athleteKey: finalAthleteKey } });
    while (exists) {
      finalAthleteKey = `${athleteKey}_${counter}`;
      counter++;
      exists = await prisma.athlete.findUnique({ where: { athleteKey: finalAthleteKey } });
    }

    // Create athlete and update inquiry status in transaction
    await prisma.$transaction(async (tx) => {
      // Create athlete from inquiry
      await tx.athlete.create({
        data: {
          athleteKey: finalAthleteKey,
          coachProfileId: jorgeCoachId,
          fullName: inquiry.contactName || "New Athlete",
          email: inquiry.anonymousEmail || undefined,
          phone: inquiry.anonymousPhone || undefined,
          notes: inquiry.notes ? `Lead intake: ${inquiry.notes}` : "Lead from intake form",
          goals: inquiry.goal || undefined,
        },
      });

      // Update inquiry status to CONVERTED
      await tx.inquiry.update({
        where: { id: inquiryId },
        data: { status: "CONVERTED" },
      });
    });

    // Revalidate both leads and athletes pages
    revalidatePath(`/${lang}/coach/leads`, "layout");
    revalidatePath(`/${lang}/coach/athletes`, "layout");

    // Redirect to athletes page
    redirect(`/${lang}/coach/athletes`);
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
          <h1 className="text-3xl font-bold">
            {tab === "consultations" ? "Consultations" : dict.coach.leads ?? "Leads"}
          </h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {tab === "consultations"
              ? "View and manage scheduled consultations"
              : dict.coach.leadsHint ?? "Inquiries that came in through your private intake form."}
          </p>
        </div>
        {tab === "leads" && (
          <a href={csvHref} download className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]">
            {dict.coach.exportCsv ?? "Export CSV"}
          </a>
        )}
      </header>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <Link
          href={`?tab=leads`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "leads"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Leads
        </Link>
        <Link
          href={`?tab=consultations`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "consultations"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Consultations ({consultations.length})
        </Link>
      </div>

      {tab === "leads" && (
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
      )}

      {tab === "leads" && (
        <>
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

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <form action={updateStatus} className="flex items-center gap-2 text-xs">
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

                {q.status === "CONVERTED" && (
                  <form action={convertInquiryToAthlete}>
                    <input type="hidden" name="inquiryId" value={q.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--success)] text-white px-4 py-1.5 text-sm font-semibold hover:bg-[var(--success)]/90"
                    >
                      → Move to Athletes
                    </button>
                  </form>
                )}
              </div>
            </Card>
          ))}
            </ul>
          )}
        </>
      )}

      {tab === "consultations" && (
        <>
          {consultations.length === 0 ? (
            <Card><p className="text-sm text-[var(--ink-muted)]">No scheduled consultations yet.</p></Card>
          ) : (
            <ul className="space-y-3">
              {consultations.map((c) => (
                <Card key={c.id} padded={false} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-base">{c.clientName}</div>
                      <div className="text-xs text-[var(--ink-muted)] mt-0.5">
                        {c.clientEmail}
                      </div>
                    </div>
                    <Pill color={new Date(c.startTime) > new Date() ? "primary" : "soft"}>
                      {new Date(c.startTime) > new Date() ? "Upcoming" : "Completed"}
                    </Pill>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <Field label="Date" value={new Date(c.startTime).toLocaleDateString()} />
                    <Field label="Time" value={`${new Date(c.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(c.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} />
                    {c.clientPhone && <Field label="Phone" value={c.clientPhone} tel />}
                    {c.googleMeetUrl && <Field label="Meet Link" value={c.googleMeetUrl} />}
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </>
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
