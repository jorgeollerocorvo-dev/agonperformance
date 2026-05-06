import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import BrandedHeader from "@/components/BrandedHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <BrandedHeader lang={lang}>
        <LanguageSwitcher current={lang} compact />
        <Link
          href={`/${lang}/coach`}
          className="text-sm px-3 py-2 text-[#666666] hover:text-[#1A1A1A] transition-colors"
        >
          ← Back
        </Link>
      </BrandedHeader>

      {/* Content */}
      <main className="px-4 sm:px-8 py-12 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Consultation Scheduling</h1>
          <p className="text-lg text-[#666666]">
            Manage your consultation slots and view all client bookings
          </p>
        </div>

        {/* Create New Slot */}
        <Card className="p-6 bg-[#F5F5F5] border-[#E5E5E5]">
          <h2 className="text-xl font-bold mb-4 text-[#1A1A1A]">Create New Consultation Slot</h2>
          <form action={createSlot} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-semibold mb-2 text-[#1A1A1A]">
                Start Time
              </label>
              <input
                type="datetime-local"
                name="startTime"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-[#1A1A1A]">
                End Time
              </label>
              <input
                type="datetime-local"
                name="endTime"
                required
                className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white"
              />
            </div>

            <Button type="submit" className="bg-[#2E75B6] hover:bg-[#1E5A94]">Create Slot</Button>
          </form>
        </Card>

        {/* Bookings */}
        {bookings.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-[#1A1A1A]">📅 Upcoming Bookings ({bookings.length})</h2>
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 border border-[#E5E5E5] rounded-lg bg-white hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-[#1A1A1A]">{booking.clientName}</p>
                      <p className="text-sm text-[#666666]">
                        {booking.clientEmail}
                      </p>
                      {booking.clientPhone && (
                        <p className="text-sm text-[#666666]">
                          {booking.clientPhone}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-3 text-[#1A1A1A]">
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
                          className="text-sm text-[#2E75B6] hover:underline mt-2 inline-block font-medium"
                        >
                          🎥 Join Google Meet
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-[#666666] text-right">
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
            <h2 className="text-xl font-bold mb-4 text-[#1A1A1A]">✅ Available Slots ({slots.filter(s => s.isAvailable && !s.booking).length})</h2>
            <div className="space-y-3">
              {slots
                .filter((s) => s.isAvailable && !s.booking)
                .map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 border border-[#E5E5E5] rounded-lg bg-white hover:bg-[#F5F5F5] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-[#1A1A1A]">
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
                      <p className="text-sm text-[#666666]">
                        Available for booking
                      </p>
                    </div>
                    <form action={deleteSlot}>
                      <input
                        type="hidden"
                        name="slotId"
                        value={slot.id}
                      />
                      <Button type="submit" variant="outline" className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]">
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
      </main>
    </div>
  );
}
