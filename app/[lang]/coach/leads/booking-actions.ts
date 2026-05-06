"use server";

import { prisma } from "@/lib/prisma";
import {
  sendConsultationConfirmation,
  sendConsultationNotificationToCoach,
} from "@/lib/email";

export async function getAvailableSlots() {
  try {
    // Get all available slots for the next 30 days
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const slots = await prisma.consultationSlot.findMany({
      where: {
        startTime: { gte: now, lte: thirtyDaysLater },
        isAvailable: true,
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    return { success: true, slots };
  } catch (error) {
    console.error("Failed to fetch slots:", error);
    return { success: false, error: "Failed to fetch available slots" };
  }
}

export async function bookConsultation(
  slotId: string,
  clientName: string,
  clientEmail: string,
  clientPhone?: string
) {
  try {
    // Verify slot exists and is available
    const slot = await prisma.consultationSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return { success: false, error: "Slot not found" };
    }

    if (!slot.isAvailable) {
      return { success: false, error: "This slot is no longer available" };
    }

    // Create booking
    const booking = await prisma.consultationBooking.create({
      data: {
        slotId,
        clientName,
        clientEmail,
        clientPhone,
        startTime: slot.startTime,
        endTime: slot.endTime,
        googleMeetUrl: slot.googleMeetUrl || undefined,
      },
    });

    // Mark slot as unavailable
    await prisma.consultationSlot.update({
      where: { id: slotId },
      data: { isAvailable: false },
    });

    // Send confirmation emails
    try {
      await sendConsultationConfirmation(
        clientEmail,
        clientName,
        slot.startTime,
        slot.googleMeetUrl || undefined
      );
      await sendConsultationNotificationToCoach(
        clientName,
        clientEmail,
        clientPhone,
        slot.startTime,
        slot.googleMeetUrl || undefined
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the booking if emails fail
    }

    return {
      success: true,
      booking: {
        id: booking.id,
        startTime: booking.startTime,
        clientName: booking.clientName,
      },
    };
  } catch (error) {
    console.error("Failed to book consultation:", error);
    return { success: false, error: "Failed to book consultation" };
  }
}
