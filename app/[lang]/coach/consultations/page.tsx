import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";

export default async function ConsultationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound();

  const dict = await getDictionary(lang);

  // Get upcoming consultation slots and bookings
  const now = new Date();
  const slots = await prisma.consultationSlot.findMany({
    where: {
      startTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    include: {
      booking: true,
    },
  });

  const bookings = await prisma.consultationBooking.findMany({
    where: {
      startTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    include: {
      slot: true,
    },
  });

  async function createSlot(formData: FormData) {
    "use server";
    const s = await auth();
    if (!isJorge(s)) return;

    const startTimeStr = String(formData.get("startTime") ?? "");
    const endTimeStr = String(formData.get("endTime") ?? "");

    if (!startTimeStr || !endTimeStr) return;

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    // Generate Google Meet link
    const googleMeetUrl = `https://meet.google.com/new`;

    await prisma.consultationSlot.create({
      data: {
        startTime,
        endTime,
        googleMeetUrl,
        isAvailable: true,
      },
    });

    redirect(`/${lang}/coach/consultations`);
  }

  async function deleteSlot(formData: FormData) {
    "use server";
    const s = await auth();
    if (!isJorge(s)) return;

    const slotId = String(formData.get("slotId") ?? "");
    if (!slotId) return;

    await prisma.consultationSlot.delete({
      where: { id: slotId },
    });

    redirect(`/${lang}/coach/consultations`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Consultations</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Manage your consultation slots and bookings
        </p>
      </div>

      {/* Create New Slot */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Create New Consultation Slot</h2>
        <form action={createSlot} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="startTime"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              required
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)]"
            />
          </div>

          <Button type="submit">Create Slot</Button>
        </form>
      </Card>

      {/* Bookings */}
      {bookings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Upcoming Bookings</h2>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 border border-[var(--border)] rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{booking.clientName}</p>
                    <p className="text-sm text-[var(--ink-muted)]">
                      {booking.clientEmail}
                    </p>
                    {booking.clientPhone && (
                      <p className="text-sm text-[var(--ink-muted)]">
                        {booking.clientPhone}
                      </p>
                    )}
                    <p className="text-sm font-medium mt-2">
                      📅{" "}
                      {booking.startTime.toLocaleString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {booking.googleMeetUrl && (
                      <a
                        href={booking.googleMeetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--primary)] hover:underline mt-2 inline-block"
                      >
                        🎥 Join Google Meet
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-[var(--ink-muted)]">
                    Booked{" "}
                    {booking.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Slots */}
      {slots.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Available Slots</h2>
          <div className="space-y-3">
            {slots
              .filter((s) => s.isAvailable && !s.booking)
              .map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 border border-[var(--border)] rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {slot.startTime.toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {slot.endTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-[var(--ink-muted)]">
                      Available for booking
                    </p>
                  </div>
                  <form action={deleteSlot}>
                    <input
                      type="hidden"
                      name="slotId"
                      value={slot.id}
                    />
                    <Button type="submit" variant="outline">
                      Delete
                    </Button>
                  </form>
                </div>
              ))}
          </div>
        </Card>
      )}

      {slots.length === 0 && bookings.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-[var(--ink-muted)]">
            No consultation slots scheduled. Create your first slot above.
          </p>
        </Card>
      )}
    </div>
  );
}
