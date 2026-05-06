import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Create the ConsultationSlot table
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

    // Create the ConsultationBooking table
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

    // Create indexes if they don't exist
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationSlot_startTime_idx" ON "ConsultationSlot"("startTime");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationSlot_isAvailable_idx" ON "ConsultationSlot"("isAvailable");`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationBooking_slotId_key" ON "ConsultationBooking"("slotId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_slotId_idx" ON "ConsultationBooking"("slotId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_clientEmail_idx" ON "ConsultationBooking"("clientEmail");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultationBooking_createdAt_idx" ON "ConsultationBooking"("createdAt");`);

    // Add foreign key if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ConsultationBooking"
      ADD CONSTRAINT "ConsultationBooking_slotId_fkey"
      FOREIGN KEY ("slotId") REFERENCES "ConsultationSlot"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `).catch(() => {
      // Constraint may already exist
    });

    return NextResponse.json({ success: true, message: "Tables created successfully" });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
