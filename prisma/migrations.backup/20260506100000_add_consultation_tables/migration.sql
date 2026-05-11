-- CreateTable ConsultationSlot
CREATE TABLE "ConsultationSlot" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "googleMeetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsultationBooking
CREATE TABLE "ConsultationBooking" (
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

-- CreateIndex
CREATE INDEX "ConsultationSlot_startTime_idx" ON "ConsultationSlot"("startTime");

-- CreateIndex
CREATE INDEX "ConsultationSlot_isAvailable_idx" ON "ConsultationSlot"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationBooking_slotId_key" ON "ConsultationBooking"("slotId");

-- CreateIndex
CREATE INDEX "ConsultationBooking_slotId_idx" ON "ConsultationBooking"("slotId");

-- CreateIndex
CREATE INDEX "ConsultationBooking_clientEmail_idx" ON "ConsultationBooking"("clientEmail");

-- CreateIndex
CREATE INDEX "ConsultationBooking_createdAt_idx" ON "ConsultationBooking"("createdAt");

-- AddForeignKey
ALTER TABLE "ConsultationBooking" ADD CONSTRAINT "ConsultationBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ConsultationSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
