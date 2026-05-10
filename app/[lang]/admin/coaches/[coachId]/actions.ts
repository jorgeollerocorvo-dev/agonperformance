"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { hash } from "bcryptjs";

export async function updateAthleteProfile(
  formData: FormData,
  athleteId: string,
  lang: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return { error: "Unauthorized" };
  }

  // Verify the athlete exists
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    include: { coachProfile: true },
  });

  if (!athlete) {
    return { error: "Athlete not found" };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const sex = String(formData.get("sex") ?? "").trim() || null;
  const age = formData.get("age") ? parseInt(String(formData.get("age")), 10) : null;
  const heightCm = formData.get("heightCm") ? parseInt(String(formData.get("heightCm")), 10) : null;
  const weightKg = formData.get("weightKg") ? parseFloat(String(formData.get("weightKg"))) : null;
  const division = String(formData.get("division") ?? "").trim() || null;
  const competitiveGoal = String(formData.get("competitiveGoal") ?? "").trim() || null;
  const goals = String(formData.get("goals") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fullName) {
    return { error: "Full name is required" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Update athlete details
      await tx.athlete.update({
        where: { id: athleteId },
        data: {
          fullName,
          displayName,
          email,
          phone,
          sex: sex || null,
          age: age || null,
          heightCm: heightCm || null,
          weightKg: weightKg || null,
          division,
          competitiveGoal,
          goals,
          notes,
        },
      });

      // Update user details if athlete has a user account
      if (athlete.userId) {
        const updateData: any = {};
        if (displayName) updateData.displayName = displayName;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: athlete.userId },
            data: updateData,
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function updateAthletePassword(
  athleteId: string,
  newPassword: string,
  lang: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return { error: "Unauthorized" };
  }

  // Verify the athlete exists and has a user account
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });

  if (!athlete || !athlete.userId) {
    return { error: "Athlete not found or has no user account" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: athlete.userId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
