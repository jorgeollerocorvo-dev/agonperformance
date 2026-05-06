import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import BrandedHeader from "@/components/BrandedHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { formatSlotTime, formatEndTime, formatBookingTime } from "@/lib/timezone-utils";
import { fromZonedTime } from "date-fns-tz";

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

  // Initialize tables if they don't exist
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConsultationSlot" (
        "id" TEXT NOT NULL,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "googleMeetUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ConsultationSlot_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConsultationBooking" (
        "id" TEXT NOT NULL,
        "slotId" TEXT NOT NULL,
        "clientName" TEXT NOT NULL,
        "clientEmail" TEXT NOT NULL,
        "clientPhone" TEXT,
        "googleMeetUrl" TEXT,
        "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
        "coachNotified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ConsultationBooking_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create indexes
    await Promise.all([
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationSlot_startTime_idx" ON "ConsultationSlot"("startTime");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationSlot_isAvailable_idx" ON "ConsultationSlot"("isAvailable");`),
      prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationBooking_slotId_key" ON "ConsultationBooking"("slotId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_slotId_idx" ON "ConsultationBooking"("slotId");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_clientEmail_idx" ON "ConsultationBooking"("clientEmail");`),
      prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_createdAt_idx" ON "ConsultationBooking"("createdAt");`),
    ]);
  } catch (error) {
    // Tables may already exist, continue
    console.error("Table initialization error (may be expected):", error);
  }

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

    // datetime-local returns "2026-07-05T11:00" which represents Qatar local time
    // Convert to UTC by subtracting 3 hours (Qatar is UTC+3)
    const parseLocalTime = (timeStr: string): Date => {
      // Create a date from the input (which JS treats as UTC initially)
      const tempDate = new Date(timeStr);
      // Subtract 3 hours to convert from Qatar local to UTC
      // Coach enters 11:00 (Qatar) -> subtract 3 -> 08:00 (UTC)
      tempDate.setHours(tempDate.getHours() - 3);
      return tempDate;
    };

    const startTime = parseLocalTime(startTimeStr);
    const endTime = parseLocalTime(endTimeStr);

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
                        📅 {formatBookingTime(booking.startTime)}
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
                        {formatSlotTime(slot.startTime)} - {formatEndTime(slot.endTime)}
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
